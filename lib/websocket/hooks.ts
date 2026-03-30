'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { queryKeys } from '@/lib/query-client';
import { HackathonWSClient, getWSBaseUrl } from './client';
import type {
  ConnectionState,
  LeaderboardEntry,
  LeaderboardUpdatePayload,
  FlashChallengePayload,
  HackathonStatusPayload,
  SubmissionResultPayload,
  MonitorStatsPayload,
  MonitorAlertPayload,
  ChatMessagePayload,
  TypingPayload,
  NotificationPayload,
} from './types';
import type { FlashChallengeData } from '@/components/flash-challenge-alert';
import type { ScorePopupData } from '@/components/gamification/score-popup';
import type { BadgeEarnedData } from '@/components/gamification/badge-earned';

// ─── Shared connection registry (prevents duplicate connections per path) ───────

const clientRegistry = new Map<string, { client: HackathonWSClient; refCount: number }>();

function getOrCreateClient(path: string, token: string): HackathonWSClient {
  const wsBase = getWSBaseUrl();
  if (!wsBase) throw new Error('WebSocket base URL not configured');

  const fullUrl = `${wsBase}${path}`;
  const existing = clientRegistry.get(fullUrl);

  if (existing) {
    existing.refCount++;
    existing.client.updateToken(token);
    return existing.client;
  }

  const client = new HackathonWSClient(fullUrl, token);
  clientRegistry.set(fullUrl, { client, refCount: 1 });
  return client;
}

function releaseClient(path: string): void {
  const wsBase = getWSBaseUrl();
  if (!wsBase) return;
  const fullUrl = `${wsBase}${path}`;
  const entry = clientRegistry.get(fullUrl);
  if (!entry) return;

  entry.refCount--;
  if (entry.refCount <= 0) {
    entry.client.disconnect();
    clientRegistry.delete(fullUrl);
  }
}

// ─── Core hook: manages a single WS connection ─────────────────────────────

function useWSConnection(path: string | null) {
  const token = useAuthStore((s) => s.accessToken);
  const clientRef = useRef<HackathonWSClient | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('DISCONNECTED');

  useEffect(() => {
    if (!path || !token) return;

    let client: HackathonWSClient;
    try {
      client = getOrCreateClient(path, token);
    } catch {
      return;
    }
    clientRef.current = client;

    const onConnected = () => setConnectionState('CONNECTED');
    const onDisconnected = () => setConnectionState('DISCONNECTED');
    const onReconnecting = () => setConnectionState('CONNECTING');

    client.on('connected', onConnected);
    client.on('disconnected', onDisconnected);
    client.on('reconnecting', onReconnecting);

    // Set initial state
    setConnectionState(client.state);
    if (client.state === 'DISCONNECTED') {
      client.connect();
    }

    return () => {
      client.off('connected', onConnected);
      client.off('disconnected', onDisconnected);
      client.off('reconnecting', onReconnecting);
      clientRef.current = null;
      releaseClient(path);
    };
  }, [path, token]);

  return { client: clientRef, connectionState };
}

// ─── useHackathonLive ───────────────────────────────────────────────────────

export function useHackathonLive(hackathonId: string | null) {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const wsPath = hackathonId ? `/hackathons/${hackathonId}/live` : null;
  const { client, connectionState } = useWSConnection(wsPath);

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [flashChallenge, setFlashChallenge] = useState<FlashChallengePayload | null>(null);
  const [eventStatus, setEventStatus] = useState<string | null>(null);
  const [myRank, setMyRank] = useState<number | null>(null);
  const prevRankRef = useRef<number | null>(null);

  useEffect(() => {
    const c = client.current;
    if (!c) return;

    // Leaderboard update
    const onLeaderboard = (data: LeaderboardUpdatePayload) => {
      setLeaderboard(data.entries);

      // Track rank changes
      const newRank = data.my_rank ?? null;
      setMyRank(newRank);

      if (prevRankRef.current !== null && newRank !== null && newRank !== prevRankRef.current) {
        const improved = newRank < prevRankRef.current;
        if (improved) {
          window.dispatchEvent(
            new CustomEvent('score-earned', {
              detail: { points: 0, label: `\u00a1Subiste al puesto #${newRank}!` } satisfies ScorePopupData,
            })
          );
        }
        // #1 rank notification
        if (newRank === 1) {
          window.dispatchEvent(
            new CustomEvent('badge-earned', {
              detail: { name: '\u00a1#1 del Hackathon!', description: 'Has alcanzado la cima de la tabla de posiciones' } satisfies BadgeEarnedData,
            })
          );
        }
      }
      prevRankRef.current = newRank;

      // Update TanStack Query cache
      if (hackathonId) {
        queryClient.setQueryData(queryKeys.leaderboards.hackathon(hackathonId), data.entries);
      }
    };

    // Flash challenge
    const onFlashStart = (data: FlashChallengePayload) => {
      setFlashChallenge(data);
      window.dispatchEvent(
        new CustomEvent('flash-challenge', {
          detail: {
            hackathonId: data.hackathon_id,
            challengeId: data.challenge_id,
            title: data.title,
            duration: `${data.duration_minutes}min`,
            multiplier: data.multiplier,
          } satisfies FlashChallengeData,
        })
      );
    };

    const onFlashEnd = () => {
      setFlashChallenge(null);
    };

    // Hackathon status
    const onStatusChange = (data: HackathonStatusPayload) => {
      setEventStatus(data.status);
      if (hackathonId) {
        queryClient.setQueryData(
          queryKeys.hackathons.detail(hackathonId),
          (old: Record<string, unknown> | undefined) =>
            old ? { ...old, status: data.status } : old
        );
      }
    };

    // Submission result
    const onSubmissionResult = (data: SubmissionResultPayload) => {
      // Update submission in cache
      queryClient.setQueryData(
        queryKeys.submissions.detail(data.submission_id),
        (old: Record<string, unknown> | undefined) =>
          old ? { ...old, status: data.status, score: data.score } : old
      );

      // Score popup
      if (data.points_earned && data.points_earned > 0) {
        window.dispatchEvent(
          new CustomEvent('score-earned', {
            detail: { points: data.points_earned, label: 'Reto completado' } satisfies ScorePopupData,
          })
        );
      }

      // New badges
      if (data.new_badges?.length) {
        data.new_badges.forEach((b, i) => {
          setTimeout(() => {
            window.dispatchEvent(
              new CustomEvent('badge-earned', {
                detail: { name: b.name, description: b.description, icon: b.icon } satisfies BadgeEarnedData,
              })
            );
          }, i * 5500); // Stagger badge popups
        });
      }

      // Invalidate submissions list
      queryClient.invalidateQueries({ queryKey: queryKeys.submissions.all });
    };

    c.on('leaderboard_update', onLeaderboard as (d: unknown) => void);
    c.on('flash_challenge_start', onFlashStart as (d: unknown) => void);
    c.on('flash_challenge_end', onFlashEnd as (d: unknown) => void);
    c.on('hackathon_status_change', onStatusChange as (d: unknown) => void);
    c.on('hackathon_paused', onStatusChange as (d: unknown) => void);
    c.on('hackathon_resumed', onStatusChange as (d: unknown) => void);
    c.on('submission_result', onSubmissionResult as (d: unknown) => void);

    return () => {
      c.off('leaderboard_update', onLeaderboard as (d: unknown) => void);
      c.off('flash_challenge_start', onFlashStart as (d: unknown) => void);
      c.off('flash_challenge_end', onFlashEnd as (d: unknown) => void);
      c.off('hackathon_status_change', onStatusChange as (d: unknown) => void);
      c.off('hackathon_paused', onStatusChange as (d: unknown) => void);
      c.off('hackathon_resumed', onStatusChange as (d: unknown) => void);
      c.off('submission_result', onSubmissionResult as (d: unknown) => void);
    };
  }, [client, hackathonId, queryClient, userId]);

  return {
    leaderboard,
    flashChallenge,
    eventStatus,
    myRank,
    isConnected: connectionState === 'CONNECTED',
    connectionState,
  };
}

// ─── useHackathonMonitor (Admin/Mentor) ─────────────────────────────────────

export function useHackathonMonitor(hackathonId: string | null) {
  const wsPath = hackathonId ? `/hackathons/${hackathonId}/monitor` : null;
  const { client, connectionState } = useWSConnection(wsPath);

  const [stats, setStats] = useState<MonitorStatsPayload | null>(null);
  const [alerts, setAlerts] = useState<MonitorAlertPayload[]>([]);

  useEffect(() => {
    const c = client.current;
    if (!c) return;

    const onStats = (data: MonitorStatsPayload) => setStats(data);
    const onAlert = (data: MonitorAlertPayload) =>
      setAlerts((prev) => [data, ...prev].slice(0, 50));

    c.on('monitor_stats', onStats as (d: unknown) => void);
    c.on('monitor_alert', onAlert as (d: unknown) => void);

    return () => {
      c.off('monitor_stats', onStats as (d: unknown) => void);
      c.off('monitor_alert', onAlert as (d: unknown) => void);
    };
  }, [client]);

  return { stats, alerts, isConnected: connectionState === 'CONNECTED', connectionState };
}

// ─── useTeamChat ─────────────────────────────────────────────────────────────

export function useTeamChat(teamId: string | null) {
  const userId = useAuthStore((s) => s.user?.id);
  const wsPath = teamId ? `/teams/${teamId}/chat` : null;
  const { client, connectionState } = useWSConnection(wsPath);

  const [messages, setMessages] = useState<ChatMessagePayload[]>([]);
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const c = client.current;
    if (!c) return;

    const onMessage = (data: ChatMessagePayload) => {
      setMessages((prev) => {
        // Avoid duplicates (optimistic update may already have it)
        if (prev.some((m) => m.id === data.id)) return prev;
        return [...prev, data];
      });
    };

    const onTyping = (data: TypingPayload) => {
      if (data.user_id === userId) return; // Ignore self

      if (data.is_typing) {
        setTypingUsers((prev) => new Map(prev).set(data.user_id, data.user_name));
        // Auto-clear typing after 5s
        const existingTimer = typingTimers.current.get(data.user_id);
        if (existingTimer) clearTimeout(existingTimer);
        typingTimers.current.set(
          data.user_id,
          setTimeout(() => {
            setTypingUsers((prev) => {
              const next = new Map(prev);
              next.delete(data.user_id);
              return next;
            });
          }, 5000)
        );
      } else {
        setTypingUsers((prev) => {
          const next = new Map(prev);
          next.delete(data.user_id);
          return next;
        });
      }
    };

    c.on('chat_message', onMessage as (d: unknown) => void);
    c.on('typing', onTyping as (d: unknown) => void);

    return () => {
      c.off('chat_message', onMessage as (d: unknown) => void);
      c.off('typing', onTyping as (d: unknown) => void);
      typingTimers.current.forEach(clearTimeout);
    };
  }, [client, userId]);

  const sendMessage = useCallback(
    (content: string, messageType: 'text' | 'code' = 'text') => {
      const c = client.current;
      if (!c) return;

      const optimisticMsg: ChatMessagePayload = {
        id: `optimistic-${Date.now()}`,
        team_id: teamId ?? '',
        user_id: userId ?? '',
        user_name: '',
        content,
        message_type: messageType,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticMsg]);
      c.send('chat_message', { content, message_type: messageType });
    },
    [client, teamId, userId]
  );

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      client.current?.send('typing', { is_typing: isTyping });
    },
    [client]
  );

  const isTyping = useMemo(() => {
    const names = Array.from(typingUsers.values());
    if (names.length === 0) return null;
    if (names.length === 1) return `${names[0]} está escribiendo...`;
    if (names.length === 2) return `${names[0]} y ${names[1]} están escribiendo...`;
    return `${names.length} personas están escribiendo...`;
  }, [typingUsers]);

  return {
    messages,
    sendMessage,
    sendTyping,
    isTyping,
    isConnected: connectionState === 'CONNECTED',
    connectionState,
  };
}

// ─── useWSNotifications ──────────────────────────────────────────────────────

export function useWSNotifications() {
  const queryClient = useQueryClient();
  const { client, connectionState } = useWSConnection('/notifications');

  const [realtimeNotifications, setRealtimeNotifications] = useState<NotificationPayload[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const c = client.current;
    if (!c) return;

    const onNotification = (data: NotificationPayload) => {
      setRealtimeNotifications((prev) => [data, ...prev].slice(0, 100));
      setUnreadCount((prev) => prev + 1);

      // Show toast for high-priority notifications
      if (data.priority === 'high' || data.priority === 'urgent') {
        // Dispatch a custom event that the NotificationPanel or toast can listen to
        window.dispatchEvent(
          new CustomEvent('ws-notification', { detail: data })
        );
      }

      // Invalidate the notifications query to stay in sync
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    };

    c.on('notification', onNotification as (d: unknown) => void);

    return () => {
      c.off('notification', onNotification as (d: unknown) => void);
    };
  }, [client, queryClient]);

  const markAsRead = useCallback((ids: string[]) => {
    setRealtimeNotifications((prev) =>
      prev.filter((n) => !ids.includes(n.id))
    );
    setUnreadCount((prev) => Math.max(0, prev - ids.length));
  }, []);

  return {
    notifications: realtimeNotifications,
    unreadCount,
    markAsRead,
    isConnected: connectionState === 'CONNECTED',
    connectionState,
  };
}

// ─── useLeaderboard (Throttled) ─────────────────────────────────────────────

export function useWSLeaderboard(hackathonId: string | null) {
  const wsPath = hackathonId ? `/leaderboards/${hackathonId}` : null;
  const { client, connectionState } = useWSConnection(wsPath);

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Throttle: max 1 UI update per second
  const pendingRef = useRef<LeaderboardUpdatePayload | null>(null);
  const throttleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyUpdate = useCallback((data: LeaderboardUpdatePayload) => {
    setEntries(data.entries);
    setMyRank(data.my_rank ?? null);
    setLastUpdate(new Date());
  }, []);

  useEffect(() => {
    const c = client.current;
    if (!c) return;

    const onUpdate = (data: LeaderboardUpdatePayload) => {
      pendingRef.current = data;

      if (!throttleTimer.current) {
        // Apply immediately for the first update
        applyUpdate(data);
        pendingRef.current = null;

        // Then throttle subsequent updates
        throttleTimer.current = setTimeout(() => {
          if (pendingRef.current) {
            applyUpdate(pendingRef.current);
            pendingRef.current = null;
          }
          throttleTimer.current = null;
        }, 1000);
      }
    };

    c.on('leaderboard_update', onUpdate as (d: unknown) => void);

    return () => {
      c.off('leaderboard_update', onUpdate as (d: unknown) => void);
      if (throttleTimer.current) {
        clearTimeout(throttleTimer.current);
        throttleTimer.current = null;
      }
    };
  }, [client, applyUpdate]);

  return {
    entries,
    myRank,
    lastUpdate,
    isConnected: connectionState === 'CONNECTED',
    connectionState,
  };
}

// ─── Re-export types for convenience ─────────────────────────────────────────

export type { ConnectionState } from './types';
