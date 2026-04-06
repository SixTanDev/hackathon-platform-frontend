import {
  type ConnectionState,
  type WSClientOptions,
  type WSMessage,
  type WSEventMap,
  DEFAULT_WS_OPTIONS,
} from './types';

type EventCallback<T = unknown> = (data: T) => void;

/**
 * Reusable WebSocket client with auto-reconnect, heartbeat, and message queuing.
 *
 * Usage:
 *   const ws = new HackathonWSClient('wss://api.example.com/ws/live', token);
 *   ws.on('leaderboard_update', (data) => { ... });
 *   ws.connect();
 *   // later:
 *   ws.disconnect();
 */
export class HackathonWSClient {
  private ws: WebSocket | null = null;
  private url: string;
  private authToken: string;
  private options: Required<WSClientOptions>;

  // State
  private _state: ConnectionState = 'DISCONNECTED';
  private retryCount = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;

  // Event emitter
  private listeners = new Map<string, Set<EventCallback>>();

  // Message queue (sent on reconnect)
  private messageQueue: string[] = [];

  // Last event ID for resuming missed events
  private lastEventId: string | null = null;

  constructor(url: string, authToken: string, options?: WSClientOptions) {
    this.url = url;
    this.authToken = authToken;
    this.options = { ...DEFAULT_WS_OPTIONS, ...options };
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  get state(): ConnectionState {
    return this._state;
  }

  get isConnected(): boolean {
    return this._state === 'CONNECTED';
  }

  connect(): void {
    if (this._state === 'CONNECTED' || this._state === 'CONNECTING') return;
    this.intentionalClose = false;
    this.retryCount = 0;
    this._connect();
  }

  disconnect(): void {
    this.intentionalClose = true;
    this._setState('DISCONNECTING');
    this.clearTimers();
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this._setState('DISCONNECTED');
  }

  send<T = unknown>(type: string, payload?: T): void {
    const msg = JSON.stringify({ type, payload });
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(msg);
    } else {
      this.messageQueue.push(msg);
    }
  }

  on<K extends keyof WSEventMap>(event: K, callback: EventCallback<WSEventMap[K]>): void;
  on(event: string, callback: EventCallback): void;
  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off<K extends keyof WSEventMap>(event: K, callback: EventCallback<WSEventMap[K]>): void;
  off(event: string, callback: EventCallback): void;
  off(event: string, callback: EventCallback): void {
    this.listeners.get(event)?.delete(callback);
  }

  updateToken(token: string): void {
    this.authToken = token;
  }

  // ─── Private Connection Logic ───────────────────────────────────────────────

  private _connect(): void {
    this._setState('CONNECTING');

    // Build URL with auth token and optional last_event_id
    const urlObj = new URL(this.url);
    urlObj.searchParams.set('token', this.authToken);
    if (this.lastEventId) {
      urlObj.searchParams.set('last_event_id', this.lastEventId);
    }

    try {
      this.ws = new WebSocket(urlObj.toString());
    } catch {
      this._setState('DISCONNECTED');
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this._setState('CONNECTED');
      this.retryCount = 0;
      this.emit('connected', undefined);
      this.startHeartbeat();
      this.flushQueue();
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event.data);
    };

    this.ws.onclose = (event) => {
      this.clearTimers();
      this.ws = null;

      if (this.intentionalClose) {
        this._setState('DISCONNECTED');
        this.emit('disconnected', { reason: 'Client requested disconnect' });
        return;
      }

      this._setState('DISCONNECTED');
      this.emit('disconnected', { reason: event.reason || `Code ${event.code}` });
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.emit('error', { message: 'WebSocket error' });
    };
  }

  private handleMessage(raw: string): void {
    let msg: WSMessage;
    try {
      msg = JSON.parse(raw);
    } catch {
      return; // Ignore non-JSON frames
    }

    // Track event ID for resume
    if (msg.event_id) {
      this.lastEventId = msg.event_id;
    }

    // Handle pong (heartbeat response)
    if (msg.type === 'pong') {
      this.clearHeartbeatTimeout();
      return;
    }

    // Dispatch to listeners
    this.emit(msg.type, msg.payload);
  }

  // ─── Heartbeat ─────────────────────────────────────────────────────────────

  private startHeartbeat(): void {
    this.clearTimers();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
        this.heartbeatTimeoutTimer = setTimeout(() => {
          // No pong received — consider connection dead
          if (this.ws) {
            this.ws.close(4000, 'Heartbeat timeout');
          }
        }, this.options.heartbeatTimeout);
      }
    }, this.options.heartbeatInterval);
  }

  private clearHeartbeatTimeout(): void {
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
  }

  // ─── Reconnect with Exponential Backoff ──────────────────────────────────────

  private scheduleReconnect(): void {
    if (!this.options.reconnect || this.intentionalClose) return;
    if (this.retryCount >= this.options.maxRetries) {
      this.emit('error', { message: `Max retries (${this.options.maxRetries}) exhausted` });
      return;
    }

    const delay = Math.min(
      this.options.initialBackoff * Math.pow(2, this.retryCount),
      this.options.maxBackoff
    );
    this.retryCount++;

    this.emit('reconnecting', { attempt: this.retryCount, delay });

    this.retryTimer = setTimeout(() => {
      this._connect();
    }, delay);
  }

  // ─── Message Queue ──────────────────────────────────────────────────────────

  private flushQueue(): void {
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const msg = this.messageQueue.shift()!;
      this.ws.send(msg);
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private _setState(state: ConnectionState): void {
    this._state = state;
  }

  private emit(event: string, data: unknown): void {
    this.listeners.get(event)?.forEach((cb) => {
      try {
        cb(data);
      } catch (err) {
        console.error(`[WS] Error in listener for "${event}":`, err);
      }
    });
  }

  private clearTimers(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.clearHeartbeatTimeout();
  }
}

// ─── URL Builder ─────────────────────────────────────────────────────────────

/**
 * Derives the WebSocket base URL from the API backend URL.
 * https://api.example.com -> wss://api.example.com/ws
 * http://localhost:8000   -> ws://localhost:8000/ws
 */
export function getWSBaseUrl(): string {
  const apiUrl = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL ?? 'https://apisamp.gruslin.tech/api/v1')
    : '';

  if (!apiUrl) return '';

  // Remove /api/v1 suffix if present, then derive ws URL
  const httpBase = apiUrl.replace(/\/api\/v1\/?$/, '');
  const wsBase = httpBase.replace(/^http/, 'ws');
  return `${wsBase}/ws`;
}
