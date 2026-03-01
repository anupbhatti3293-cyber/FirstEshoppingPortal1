'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProductCard } from '@/components/shop/ProductCard';
import { Breadcrumbs } from '@/components/shop/Breadcrumbs';
import { Skeleton } from '@/components/ui/skeleton';
import type { Product, Currency } from '@/types';

export default function SearchPage(): JSX.Element {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const [currency] = useState<Currency>('USD');
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    async function fetchResults(): Promise<void> {
      if (!query) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/api/products?search=${encodeURIComponent(query)}&limit=50&currency=${currency}`);
        const result = await response.json();
        if (result.success && result.data) {
          setProducts(result.data.products);
        }
      } catch (error) {
        console.error('Failed to fetch search results:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchResults();
  }, [query, currency]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs
          items={[{ label: `Search Results for "${query}"`, href: `/search?q=${query}` }]}
          className="mb-6"
        />

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
            Search Results
          </h1>
          <p className="text-gray-600">
            {loading ? 'Searching...' : `${products.length} results found for "${query}"`}
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-[3/4] w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                currency={currency}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">No products found for "{query}"</p>
          </div>
        )}
      </div>
    </div>
  );
}
