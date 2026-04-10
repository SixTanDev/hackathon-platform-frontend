import { render, screen, waitFor } from './test-utils';
import SedeLeaderboardPage from '@/app/(dashboard)/dashboard/leaderboard/page';
import { getSedeLeaderboard, getZoneLeaderboard } from '@/lib/api/hackathon-services';
import { useAuthStore } from '@/stores/auth-store';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';

// Mock dependencias de API
vi.mock('@/lib/api/hackathon-services', () => ({
  getSedeLeaderboard: vi.fn(),
  getZoneLeaderboard: vi.fn(),
}));

// Mock del Auth Store para forzar un ID de usuario y una Sede
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: vi.fn(),
}));

describe('Leaderboard Page Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default auth mock: The user is 'user-123' and belongs to 'sede-col'
    (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: any) => {
      const state = {
        currentSede: { id: 'sede-col', name: 'Sede Colombia' },
        user: { id: 'user-123' }
      };
      return selector(state);
    });
  });

  it('renders loading states initially', async () => {
    // Promises que no se resuelven de inmediato
    (getSedeLeaderboard as any).mockImplementation(() => new Promise(() => {}));
    (getZoneLeaderboard as any).mockImplementation(() => new Promise(() => {}));

    render(<SedeLeaderboardPage />);
    
    expect(screen.getByText('Tabla de Posiciones')).toBeInTheDocument();
  });

  it('renders exact error states when the backend fails', async () => {
    // Forzamos un rechazo explícito (Error 500 simulado)
    (getSedeLeaderboard as any).mockRejectedValue(new Error('Internal Server Error'));
    (getZoneLeaderboard as any).mockRejectedValue(new Error('Internal Server Error'));

    render(<SedeLeaderboardPage />);

    // Por defecto inicia en la tab 'sede'
    await waitFor(() => {
      expect(screen.getByText('Error al cargar la tabla de la sede')).toBeInTheDocument();
    });

    // Navegamos a la tab 'zone' usando role="tab" y texto simulado
    const zoneTab = screen.getByRole('tab', { name: /Mi Zona/i });
    await userEvent.click(zoneTab);

    // Debe mostrar que falló también
    await waitFor(() => {
      expect(screen.getByText('Error al cargar la tabla de la zona')).toBeInTheDocument();
    });
  });

  it('renders the empty state if there is no data', async () => {
    (getSedeLeaderboard as any).mockResolvedValue({ entries: [] });
    (getZoneLeaderboard as any).mockResolvedValue({ entries: [] });

    render(<SedeLeaderboardPage />);

    await waitFor(() => {
      expect(screen.getByText('No hay datos disponibles aún')).toBeInTheDocument();
    });
  });

  it('renders leaderboard table with data and highlights the current user', async () => {
    // Sede con 2 usuarios, destacando a 'user-123' en rank 2
    (getSedeLeaderboard as any).mockResolvedValue({
      entries: [
        { rank: 1, member_id: 'pro-user', score: 5000, badge_count: 5, streak: 10 },
        { rank: 2, member_id: 'user-123', score: 3500, badge_count: 2, streak: 4 },
      ]
    });
    
    // Zona con 1 usuario
    (getZoneLeaderboard as any).mockResolvedValue({
      entries: [
        { rank: 1, member_id: 'global-hero', score: 9999, badge_count: 20, streak: 30 },
      ]
    });

    render(<SedeLeaderboardPage />);

    // Aseguramos que cargó la tabla de la Sede
    await waitFor(() => {
      expect(screen.getByText('pro-user')).toBeInTheDocument();
      expect(screen.getByText('user-123')).toBeInTheDocument();
      // Y que a 'user-123' se le concatena visualmente el chip de "Tú"
      expect(screen.getByText('Tú')).toBeInTheDocument();
      expect(screen.getByText(/5[.,]000/)).toBeInTheDocument(); // puntaje renderizado
    });

    // Cambiamos a la tabla de la zona
    const zoneTab = screen.getByRole('tab', { name: /Mi Zona/i });
    await userEvent.click(zoneTab);

    await waitFor(() => {
      expect(screen.getByText('Clasificación Zonal')).toBeInTheDocument();
      expect(screen.getByText('global-hero')).toBeInTheDocument();
      expect(screen.getByText(/9[.,]999/)).toBeInTheDocument();
    });
  });
});
