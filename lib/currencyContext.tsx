'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Currency } from '@/types';
import { getClientCurrency } from '@/lib/clientCookies';

interface CurrencyContextValue {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: 'USD',
  setCurrency: () => undefined,
});

export function CurrencyProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [currency, setCurrencyState] = useState<Currency>('USD');

  useEffect(() => {
    setCurrencyState(getClientCurrency('USD'));
  }, []);

  const setCurrency = useCallback((newCurrency: Currency): void => {
    setCurrencyState(newCurrency);
    document.cookie = `currency=${newCurrency}; path=/; max-age=31536000; SameSite=Lax`;
  }, []);

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  return useContext(CurrencyContext);
}
