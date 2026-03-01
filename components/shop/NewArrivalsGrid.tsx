'use client';

import { useEffect, useState } from 'react';
import { ProductCard } from './ProductCard';
import type { Currency, Product } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';

interface NewArrivalsGridProps {
  currency?: Currency;
}

export function NewArrivalsGrid({ currency = 'USD' }: NewArrivalsGridProps): JSX.Element {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts(): Promise<void> {
      try {
        const response = await fetch('/api/products?tags=new&limit=8');
        const result = await response.json();
        if (result.success && result.data) {
          setProducts(result.data.products);
        }
      } catch (error) {
        console.error('Failed to fetch new arrivals:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  if (loading) {
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
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-[3/4] w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return <div />;
  }

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
          {products.map((product) => (
            <ProductCard key={product.id} product={product} currency={currency} />
          ))}
        </div>
      </div>
    </section>
  );
}
