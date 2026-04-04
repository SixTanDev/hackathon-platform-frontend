import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_ROUTES = ['/login', '/register'];
const AUTH_ONLY_ROUTES = ['/select-sede'];
// All protected route prefixes that require both auth + context token
const PROTECTED_PREFIXES = ['/dashboard', '/admin', '/tutor', '/research', '/superadmin'];

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

  // Redirect authenticated users away from login
  if (isPublicRoute && isAuthenticated) {
    if (hasContext) {
      const targetPath = roleCookie === 'admin' ? '/admin/dashboard' 
                       : roleCookie === 'tutor' ? '/tutor/dashboard'
                       : '/dashboard';
      return NextResponse.redirect(new URL(targetPath, request.url));
    }
    return NextResponse.redirect(new URL('/select-sede', request.url));
  }

  // Protect dashboard/admin/tutor/research routes
  if (isProtectedRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Require context for protected routes (except /admin which may be SuperAdmin without context)
  if (isProtectedRoute && isAuthenticated && !hasContext) {
    // Allow SuperAdmin access to /admin and /superadmin routes without context token
    if (pathname.startsWith('/admin') || pathname.startsWith('/superadmin')) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL('/select-sede', request.url));
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
