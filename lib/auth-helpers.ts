import type { RoleName } from '@/types/api';

/**
 * Returns the default dashboard path for a given role.
 */
export function getDashboardPathForRole(role: RoleName | null | undefined): string {
  switch (role) {
    case 'admin':
      return '/admin/dashboard';
    case 'tutor':
      return '/tutor/dashboard';
    case 'director_semillero':
      return '/research/dashboard';
    case 'student':
      return '/dashboard';
    case 'guest':
      return '/dashboard';
    default:
      return '/dashboard';
  }
}

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  tutor: 'Tutor',
  director_semillero: 'Director de Semillero',
  student: 'Estudiante',
  guest: 'Invitado',
};

export const ROLE_COLORS: Record<string, string> = {
  admin: 'text-[#dce3f0] bg-[#f59a23]/18 border-[#f59a23]/35 font-semibold',
  tutor: 'text-primary bg-primary/10 border-primary/20',
  director_semillero: 'text-unad-gold bg-unad-gold/10 border-unad-gold/20',
  student: 'text-secondary bg-secondary/10 border-secondary/20',
  guest: 'text-muted-foreground bg-muted border-border',
};

/**
 * Decode JWT payload without verifying (client-side only).
 */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

/**
 * Check if a JWT token is expired or will expire within `bufferSeconds`.
 */
export function isTokenExpiringSoon(token: string | null, bufferSeconds = 60): boolean {
  if (!token) return true;
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return true;
  const nowSeconds = Math.floor(Date.now() / 1000);
  return payload.exp - nowSeconds <= bufferSeconds;
}
