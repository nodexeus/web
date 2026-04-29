import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public routes that don't require authentication
const publicRoutes = [
  '/login',
  '/register',
  '/verify',
  '/verified',
  '/forgot-password',
  '/password-reset',
  '/logout',
  '/deactivated',
  '/accept-invite',
  '/decline-invite',
  '/invite-registered',
  '/decline-registered',
  '/api/auth/',
];

/**
 * Auth Middleware
 *
 * Checks for the `bv-token` httpOnly cookie (set by the BFF auth API routes)
 * to determine if the user is logged in. If the cookie is missing or the token
 * is expired without a refresh cookie present, the user is redirected to /login.
 *
 * The `bv-token` cookie contains the JWT access token and is set as httpOnly
 * by the server-side /api/auth/login and /api/auth/refresh routes.
 *
 * The `bv-refresh` cookie contains the refresh token and is also httpOnly.
 * If the access token is expired but a refresh cookie exists, we allow the
 * request through — the client will trigger a refresh via /api/auth/refresh.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check for the httpOnly access token cookie (set by BFF auth API routes)
  const tokenCookie = request.cookies.get('bv-token');

  if (!tokenCookie?.value) {
    // No access token at all — redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Optionally decode and check expiry
  try {
    const payload = JSON.parse(
      Buffer.from(tokenCookie.value.split('.')[1], 'base64').toString(),
    );
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && payload.exp < now) {
      // Access token is expired — check if we have a refresh token
      const hasRefresh = request.cookies.get('bv-refresh')?.value;

      if (!hasRefresh) {
        // No refresh token either — redirect to login
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
      }

      // Refresh token exists — allow through, client will trigger refresh
    }
  } catch {
    // Invalid token format — redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Match all routes except static files
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
