'use client';

import { useEffect, useState } from 'react';
import { ProductCard } from './ProductCard';
import type { Currency, Product } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';

interface TrendingProductsProps {
  currency?: Currency;
}

export function TrendingProducts({ currency = 'USD' }: TrendingProductsProps): JSX.Element {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts(): Promise<void> {
      try {
        const response = await fetch('/api/products?tags=trending&limit=8');
        const result = await response.json();
        if (result.success && result.data) {
          setProducts(result.data.products);
        }
      } catch (error) {
        console.error('Failed to fetch trending products:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  if (loading) {
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
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="w-64 lg:w-auto flex-shrink-0 space-y-4">
                  <Skeleton className="aspect-[3/4] w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return <div />;
  }

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
            {products.map((product) => (
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
