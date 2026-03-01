'use client';

import { useState } from 'react';
import { Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Currency } from '@/types';

export function CurrencySelector(): JSX.Element {
  const [currency, setCurrency] = useState<Currency>('USD');

  const handleCurrencyChange = (newCurrency: Currency): void => {
    setCurrency(newCurrency);
    document.cookie = `currency=${newCurrency}; path=/; max-age=31536000`;
    window.location.reload();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1 text-sm hover:text-[#2E86AB] transition-colors">
        <Globe className="h-4 w-4" />
        <span>{currency}</span>
        {currency === 'USD' ? ' 🇺🇸' : ' 🇬🇧'}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => handleCurrencyChange('USD')}
          className="cursor-pointer"
        >
          🇺🇸 USD - United States
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleCurrencyChange('GBP')}
          className="cursor-pointer"
        >
          🇬🇧 GBP - United Kingdom
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
