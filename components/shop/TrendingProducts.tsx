'use client';

import { ProductCard } from './ProductCard';
import { MOCK_PRODUCTS } from '@/lib/constants';
import type { Currency } from '@/types';

interface TrendingProductsProps {
  currency?: Currency;
}

export function TrendingProducts({ currency = 'USD' }: TrendingProductsProps): JSX.Element {
  const trendingProducts = MOCK_PRODUCTS.filter((p) => p.badge === 'Trending').slice(0, 8);

  return (
    <section className="py-16 bg-[#FAFAFA]">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center gap-2 mb-8">
          <h2
            className="text-4xl md:text-5xl font-bold text-[#1E3A5F]"
            style={{ fontFamily: 'Playfair Display, serif' }}
          >
            Trending Now
          </h2>
          <span className="text-4xl">🔥</span>
        </div>

        <div className="overflow-x-auto pb-4 -mx-4 px-4">
          <div className="flex gap-4 min-w-max lg:grid lg:grid-cols-4 lg:min-w-0">
            {trendingProducts.map((product) => (
              <div key={product.id} className="w-64 lg:w-auto flex-shrink-0">
                <ProductCard product={product} currency={currency} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
