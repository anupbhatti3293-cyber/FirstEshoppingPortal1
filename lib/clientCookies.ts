import type { Currency, Locale } from '@/types';

export function getClientCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function getClientCurrency(defaultCurrency: Currency = 'USD'): Currency {
  const value = getClientCookie('currency');
  return value === 'GBP' || value === 'USD' ? value : defaultCurrency;
}

export function getClientLocale(defaultLocale: Locale = 'en-US'): Locale {
  const value = getClientCookie('locale');
  return value === 'en-GB' || value === 'en-US' ? value : defaultLocale;
}

