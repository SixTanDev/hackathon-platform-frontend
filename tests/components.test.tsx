import { render, screen } from './test-utils';
import { StatusBadge } from '@/components/shared/status-badge';
import { PageHeader } from '@/components/shared/page-header';
import { describe, it, expect } from 'vitest';

describe('Shared Components Suite', () => {
  describe('StatusBadge', () => {
    it('renders with label', () => {
      render(<StatusBadge label="Activo" variant="success" />);
      expect(screen.getByText('Activo')).toBeInTheDocument();
    });

    it('renders with dot indicator when enabled', () => {
      const { container } = render(<StatusBadge label="Alerta" variant="warning" dot />);
      // Check for the dot span
      const dot = container.querySelector('span.rounded-full');
      expect(dot).toBeInTheDocument();
    });

    it('applies the correct variant styles', () => {
      const { container } = render(<StatusBadge label="Error" variant="danger" />);
      // We expect the badge wrapper to have the danger variant class (red color)
      expect(container.firstChild).toHaveClass('text-red-500');
    });
  });

  describe('PageHeader', () => {
    it('renders title and description', () => {
      render(<PageHeader title="Panel de Control" description="Resumen de métricas" />);
      expect(screen.getByText('Panel de Control')).toBeInTheDocument();
      expect(screen.getByText('Resumen de métricas')).toBeInTheDocument();
    });

    it('renders actions as children', () => {
      render(
        <PageHeader title="Hackathones">
          <button>Nueva Hackathon</button>
        </PageHeader>
      );
      expect(screen.getByRole('button', { name: /nueva hackathon/i })).toBeInTheDocument();
    });
  });
});
