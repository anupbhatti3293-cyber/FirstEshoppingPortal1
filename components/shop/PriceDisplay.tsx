import type { Currency } from '@/types';

interface PriceDisplayProps {
  priceUsd: number;
  priceGbp: number;
  salePriceUsd?: number | null;
  salePriceGbp?: number | null;
  currency: Currency;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showVatNotice?: boolean;
}

export function PriceDisplay({
  priceUsd,
  priceGbp,
  salePriceUsd,
  salePriceGbp,
  currency,
  size = 'md',
  className = '',
  showVatNotice = false,
}: PriceDisplayProps): JSX.Element {
  const basePrice = currency === 'USD' ? priceUsd : priceGbp;
  const salePrice = currency === 'USD' ? salePriceUsd : salePriceGbp;
  const symbol = currency === 'USD' ? '$' : '£';
  const isOnSale = salePrice !== null && salePrice !== undefined && salePrice < basePrice;

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl',
  };

  const formatPrice = (price: number): string => {
    return `${symbol}${price.toFixed(2)}`;
  };

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex items-center gap-2">
        <span className={`font-semibold text-gray-900 ${sizeClasses[size]}`}>
          {formatPrice(isOnSale ? salePrice : basePrice)}
        </span>
        {isOnSale && (
          <span className={`text-gray-500 line-through ${size === 'lg' ? 'text-lg' : 'text-sm'}`}>
            {formatPrice(basePrice)}
          </span>
        )}
      </div>
      {showVatNotice && currency === 'GBP' && (
        <span className="text-xs text-gray-500 mt-0.5">
          Price includes VAT
        </span>
      )}
    </div>
  );
}
