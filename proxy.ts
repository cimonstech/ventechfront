import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const MAINTENANCE_CACHE_MS = 30_000;
let maintenanceCache: { value: boolean; at: number } | null = null;

async function maintenanceIsOn(origin: string, cookie: string): Promise<boolean> {
  const now = Date.now();
  if (maintenanceCache && now - maintenanceCache.at < MAINTENANCE_CACHE_MS) {
    return maintenanceCache.value;
  }

  const response = await fetch(`${origin}/api/check-maintenance`, {
    cache: 'no-store',
    headers: { Cookie: cookie },
  });
  if (!response.ok) return false;

  const data = await response.json();
  const value = data.maintenanceMode === true;
  maintenanceCache = { value, at: now };
  return value;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip middleware for admin routes, API routes, login, register, and static files
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') ||
    pathname === '/maintenance' ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password'
  ) {
    return NextResponse.next();
  }

  // Check maintenance mode from API route (to avoid Supabase client issues in middleware)
  // Only check for non-admin, non-auth pages
  try {
    const on = await maintenanceIsOn(
      request.nextUrl.origin,
      request.headers.get('cookie') || ''
    );
    if (on && pathname !== '/maintenance') {
      const url = request.nextUrl.clone();
      url.pathname = '/maintenance';
      return NextResponse.rewrite(url);
    }
  } catch (error) {
    // If error checking maintenance mode, continue normally (don't log in production)
    if (process.env.NODE_ENV === 'development') {
      console.error('Error checking maintenance mode:', error);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

