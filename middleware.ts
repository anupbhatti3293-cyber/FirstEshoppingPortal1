import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest): NextResponse {
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
