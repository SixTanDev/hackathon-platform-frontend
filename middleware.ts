import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_ROUTES = ['/login', '/register'];
const AUTH_ONLY_ROUTES = ['/select-sede'];
// All protected route prefixes that require both auth + context token
const PROTECTED_PREFIXES = ['/dashboard', '/admin', '/tutor', '/research', '/superadmin'];

const ROLE_HOME: Record<string, string> = {
  admin: '/admin/dashboard',
  superadmin: '/superadmin',
  tutor: '/tutor/dashboard',
  director_semillero: '/research/dashboard',
  student: '/dashboard',
  guest: '/dashboard',
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const authCookie = request.cookies.get('hackathon-auth-token')?.value;
  const contextCookie = request.cookies.get('hackathon-context-token')?.value;
  const roleCookie = request.cookies.get('hackathon-role')?.value;

  const isAuthenticated = !!authCookie;
  const hasContext = !!contextCookie;

  const isPublicRoute = PUBLIC_ROUTES.some((route: string) => pathname.startsWith(route));
  const isAuthOnlyRoute = AUTH_ONLY_ROUTES.some((route: string) => pathname.startsWith(route));
  const isProtectedRoute = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  // Removed automatic redirect away from login/register for authenticated users
  // to prevent 'trapping' users with sessions but no memberships.

  // Protect protected routes
  if (isProtectedRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Require context for protected routes
  if (isProtectedRoute && isAuthenticated && !hasContext) {
    if (pathname.startsWith('/admin') || pathname.startsWith('/superadmin')) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL('/select-sede', request.url));
  }

  // --- STRICT ROLE ISOLATION CHECK ---
  if (isProtectedRoute && isAuthenticated && hasContext) {
    // If role is missing but we have tokens, we need to re-sync
    if (!roleCookie && !isAuthOnlyRoute && !isPublicRoute) {
      return NextResponse.redirect(new URL('/select-sede', request.url));
    }

    const expectedHome = roleCookie ? ROLE_HOME[roleCookie] : undefined;
    const rolePrefix =
      pathname.startsWith('/superadmin')
        ? 'superadmin'
        : pathname.startsWith('/admin')
          ? 'admin'
          : pathname.startsWith('/tutor')
          ? 'tutor'
          : pathname.startsWith('/research')
            ? 'research'
            : pathname.startsWith('/dashboard')
              ? 'dashboard'
              : null;

    const isAllowed =
      roleCookie === 'superadmin'
        ? rolePrefix === 'superadmin' || rolePrefix === 'admin'
        : roleCookie === 'admin'
          ? rolePrefix === 'admin'
          : roleCookie === 'tutor'
            ? rolePrefix === 'tutor' || (rolePrefix === 'dashboard' && (pathname.includes('/challenges') || pathname.includes('/documents')))
            : roleCookie === 'director_semillero'
              ? rolePrefix === 'research'
              : roleCookie === 'student' || roleCookie === 'guest'
                ? rolePrefix === 'dashboard'
                : true;

    if (!isAllowed && expectedHome) {
      return NextResponse.redirect(new URL(expectedHome, request.url));
    }
  }

  // Auth-only routes (select-sede) require auth but not context
  if (isAuthOnlyRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
