import { render, screen, act } from './test-utils';
import { expect, test, describe, vi, beforeEach, afterEach } from 'vitest';
import { FlashChallengeAlert } from '../components/flash-challenge-alert';

// Mock dependencias externas inestables (Next.js router)
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('FlashChallengeAlert Integration', () => {
  beforeEach(() => {
    // Usar fake timers porque el componente usa setTimeout
    vi.useFakeTimers();
    mockPush.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('is hidden by default and becomes visible on flash-challenge event', () => {
    render(<FlashChallengeAlert />);
    
    // Inicialmente no debe estar en el DOM
    expect(screen.queryByText(/RETO RELÁMPAGO/i)).not.toBeInTheDocument();

    // Simular el evento custom que la plataforma usa para despachar retos relámpago
    act(() => {
      const event = new CustomEvent('flash-challenge', {
        detail: {
          hackathonId: 'h1',
          challengeId: 'c1',
          title: 'Algoritmo de Ordenamiento',
          multiplier: 3,
        }
      });
      window.dispatchEvent(event);
    });

    // Ahora debe ser visible y mostrar la información del evento
    expect(screen.getByText('⚡ RETO RELÁMPAGO ⚡')).toBeInTheDocument();
    expect(screen.getByText('Algoritmo de Ordenamiento')).toBeInTheDocument();
    expect(screen.getByText('×3 puntos')).toBeInTheDocument();
  });

  test('handles user interaction: redirects to challenge when resolve is clicked', async () => {
    render(<FlashChallengeAlert />);

    act(() => {
      window.dispatchEvent(new CustomEvent('flash-challenge', {
        detail: { hackathonId: 'hack123', challengeId: 'chal456', title: 'Test Challenge', multiplier: 2 }
      }));
    });

    const resolveBtn = screen.getByRole('button', { name: /¡resolver ahora!/i });
    
    act(() => {
      resolveBtn.click();
    });

    // Verificar navegación e interfaz oculta post-clic
    expect(mockPush).toHaveBeenCalledWith('/dashboard/hackathons/hack123/challenges/chal456');
    expect(screen.queryByText(/RETO RELÁMPAGO/i)).not.toBeInTheDocument();
  });

  test('auto-dismisses after 5 seconds', () => {
    render(<FlashChallengeAlert />);

    act(() => {
      window.dispatchEvent(new CustomEvent('flash-challenge', {
        detail: { hackathonId: 'h1', challengeId: 'c1', title: 'Auto Dismiss Test', multiplier: 1 }
      }));
    });

    expect(screen.getByText('Auto Dismiss Test')).toBeInTheDocument();

    // Avanzar el tiempo 4.9 segundos (no debe desaparecer todavía)
    act(() => {
      vi.advanceTimersByTime(4900);
    });
    expect(screen.getByText('Auto Dismiss Test')).toBeInTheDocument();

    // Avanzar o pasar la marca de los 5 segundos exactos
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // El timeout debería haberse ejecutado y setVisible(false)
    expect(screen.queryByText('Auto Dismiss Test')).not.toBeInTheDocument();
  });
});
