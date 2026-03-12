'use client';

import { Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Currency } from '@/types';
import { useCurrency } from '@/lib/currencyContext';

export function CurrencySelector(): JSX.Element {
  const { currency, setCurrency } = useCurrency();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1 text-sm hover:text-[#2E86AB] transition-colors">
        <Globe className="h-4 w-4" />
        <span>{currency}</span>
        {currency === 'USD' ? ' 🇺🇸' : ' 🇬🇧'}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => setCurrency('USD')}
          className="cursor-pointer"
        >
          🇺🇸 USD - United States
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setCurrency('GBP')}
          className="cursor-pointer"
        >
          🇬🇧 GBP - United Kingdom
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
