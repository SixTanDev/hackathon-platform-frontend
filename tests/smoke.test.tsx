import { render, screen } from './test-utils';
import userEvent from '@testing-library/user-event';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { expect, test, describe, vi } from 'vitest';

describe('Base Components Smoke Tests', () => {
  test('Badge component renders with content', () => {
    render(<Badge>Hackathon Platform</Badge>);
    expect(screen.getByText('Hackathon Platform')).toBeInTheDocument();
  });

  test('Button component handles interaction', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    
    render(<Button onClick={handleClick}>Acción</Button>);
    
    const button = screen.getByRole('button', { name: /acción/i });
    expect(button).toBeInTheDocument();
    
    await user.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('Button states (disabled)', () => {
    render(<Button disabled>Inválido</Button>);
    const button = screen.getByRole('button', { name: /inválido/i });
    expect(button).toBeDisabled();
    expect(button).toHaveClass('disabled:opacity-50');
  });
});
