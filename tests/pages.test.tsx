import { render, screen, waitFor } from './test-utils';
import AdminHackathonsPage from '@/app/(admin)/admin/hackathons/page';
import { getHackathons } from '@/lib/api/services';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock del cliente API
vi.mock('@/lib/api/services', () => ({
  getHackathons: vi.fn(),
}));

describe('Admin Pages Smoke Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Hackathons Management Page', () => {
    it('renders the header and empty state when no data exists', async () => {
      // Mock result (Empty)
      (getHackathons as any).mockResolvedValue({ items: [], total: 0 });

      render(<AdminHackathonsPage />);

      // Verifica presencia del Header
      expect(screen.getByText('Hackathones')).toBeInTheDocument();
      expect(screen.getByText('Gestión de hackathones de la sede')).toBeInTheDocument();

      // Verifica botón para crear
      expect(screen.getByRole('button', { name: /crear hackathon/i })).toBeInTheDocument();

      // Verifica el estado vacío (Trophy icon label)
      await waitFor(() => {
        expect(screen.getByText('No se encontraron hackathones')).toBeInTheDocument();
      });
    });

    it('renders the hackathons list when data is available', async () => {
      // Mock data
      (getHackathons as any).mockResolvedValue({
        items: [
          {
            id: 'h1',
            name: 'Hackathon Test 2026',
            status: 'active',
            scope: 'internal',
            mode: 'live',
            starts_at: new Date().toISOString(),
            ends_at: new Date().toISOString(),
          }
        ],
        total: 1
      });

      render(<AdminHackathonsPage />);

      // Espera a que cargue la tabla
      await waitFor(() => {
        expect(screen.getByText('Hackathon Test 2026')).toBeInTheDocument();
      });

      // Verifica badges de estado
      expect(screen.getByText('Activo')).toBeInTheDocument();
      expect(screen.getByText('Interno')).toBeInTheDocument();
    });
  });
});
