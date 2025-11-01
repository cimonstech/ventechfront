import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
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
    const baseUrl = request.nextUrl.origin;
    const response = await fetch(`${baseUrl}/api/check-maintenance`, {
      cache: 'no-store',
      headers: {
        'Cookie': request.headers.get('cookie') || '',
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.maintenanceMode === true && pathname !== '/maintenance') {
        // Redirect to maintenance page
        const url = request.nextUrl.clone();
        url.pathname = '/maintenance';
        return NextResponse.rewrite(url);
      }
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

