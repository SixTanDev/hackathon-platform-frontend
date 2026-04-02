import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from './test-utils';
import { NotificationPanel } from '@/components/notifications/notification-panel';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Notification } from '@/types/api';

const pushMock = vi.fn();
const useNotificationsMock = vi.fn();
const useUnreadCountMock = vi.fn();
const useMarkReadMock = vi.fn();
const markReadMutateMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '',
  useParams: () => ({}),
}));

vi.mock('@/hooks/use-notifications', () => ({
  useNotifications: (params: unknown) => useNotificationsMock(params),
  useUnreadCount: () => useUnreadCountMock(),
  useMarkRead: () => useMarkReadMock(),
}));

describe('NotificationPanel integration behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-04-01T20:00:00-05:00').getTime());
    global.ResizeObserver = class ResizeObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    } as unknown as typeof ResizeObserver;

    const notifications: Notification[] = [
      {
        id: 'n1',
        user_global_id: 'u1',
        sede_id: 's1',
        type: 'flash_challenge',
        title: 'Flash challenge available',
        message: 'A new timed challenge is ready.',
        action_url: '/dashboard/hackathons/h1/challenges/c1',
        is_read: false,
        created_at: '2026-04-01T19:45:00-05:00',
      },
      {
        id: 'n2',
        user_global_id: 'u1',
        sede_id: 's1',
        type: 'submission_graded',
        title: 'Submission graded',
        message: 'Your latest attempt has feedback.',
        action_url: null,
        is_read: true,
        created_at: '2026-04-01T18:00:00-05:00',
      },
      {
        id: 'n3',
        user_global_id: 'u1',
        sede_id: 's1',
        type: 'hackathon_end',
        title: 'Hackathon ending soon',
        message: 'The event closes in one hour.',
        action_url: '/dashboard/hackathons/h1',
        is_read: false,
        created_at: '2026-04-01T19:00:00-05:00',
      },
    ];

    useUnreadCountMock.mockReturnValue({ data: { unread_count: 2 } });
    useNotificationsMock.mockReturnValue({ data: notifications });
    useMarkReadMock.mockReturnValue({ mutate: markReadMutateMock });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows live notification data and supports reading, bulk actions, and navigation', async () => {
    const user = userEvent.setup();

    render(<NotificationPanel />);

    expect(useNotificationsMock).toHaveBeenCalledWith({ limit: 20 });
    expect(screen.getByText('2')).toBeInTheDocument();

    const toggleButton = screen.getByRole('button');
    await user.click(toggleButton);

    expect(screen.getByText('Notificaciones')).toBeInTheDocument();
    expect(screen.getByText('Flash challenge available')).toBeInTheDocument();
    expect(screen.getByText('Submission graded')).toBeInTheDocument();
    expect(screen.getByText('Hackathon ending soon')).toBeInTheDocument();
    expect(screen.getByText('hace 15m')).toBeInTheDocument();
    expect(screen.getByText('hace 2h')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Marcar todo como le.do/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Flash challenge available/i }));

    expect(markReadMutateMock).toHaveBeenCalledWith(['n1']);
    expect(pushMock).toHaveBeenCalledWith('/dashboard/hackathons/h1/challenges/c1');
    await waitFor(() => {
      expect(screen.queryByText('Notificaciones')).not.toBeInTheDocument();
    });

    markReadMutateMock.mockClear();
    pushMock.mockClear();

    await user.click(toggleButton);
    await user.click(screen.getByRole('button', { name: /Marcar todo como le.do/i }));

    expect(markReadMutateMock).toHaveBeenCalledWith(['n1', 'n3']);

    await user.click(screen.getByRole('button', { name: /Ver todas las notificaciones/i }));

    expect(pushMock).toHaveBeenCalledWith('/dashboard/notifications');
    await waitFor(() => {
      expect(screen.queryByText('Notificaciones')).not.toBeInTheDocument();
    });
  });
});
