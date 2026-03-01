'use client';

import { ProductCard } from './ProductCard';
import { MOCK_PRODUCTS } from '@/lib/constants';
import type { Currency } from '@/types';

interface NewArrivalsGridProps {
  currency?: Currency;
}

export function NewArrivalsGrid({ currency = 'USD' }: NewArrivalsGridProps): JSX.Element {
  const newProducts = MOCK_PRODUCTS.filter((p) => p.badge === 'NEW' || !p.badge).slice(0, 8);

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <h2
          className="text-4xl md:text-5xl font-bold text-center mb-12 text-[#1E3A5F]"
          style={{ fontFamily: 'Playfair Display, serif' }}
        >
          New Arrivals
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {newProducts.map((product) => (
            <ProductCard key={product.id} product={product} currency={currency} />
          ))}
        </div>
      </div>
    </section>
  );
}
