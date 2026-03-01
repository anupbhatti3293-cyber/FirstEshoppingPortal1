import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';

const PROTECTED_ROUTES = ['/account', '/wishlist'];

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));

  if (isProtectedRoute) {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const session = await getSession(token);

    if (!session) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  const response = NextResponse.next();

  const countryCode = request.headers.get('cf-ipcountry') || 'US';
  const existingCurrency = request.cookies.get('currency');
  const existingLocale = request.cookies.get('locale');

  if (!existingCurrency) {
    const currency = countryCode === 'GB' ? 'GBP' : 'USD';
    response.cookies.set('currency', currency, {
      path: '/',
      maxAge: 31536000,
    });
  }

  if (!existingLocale) {
    const locale = countryCode === 'GB' ? 'en-GB' : 'en-US';
    response.cookies.set('locale', locale, {
      path: '/',
      maxAge: 31536000,
    });
  }

  response.headers.set('X-Country-Code', countryCode);

  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
