'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { ProductCard } from '@/components/shop/ProductCard';
import { FilterSidebar } from '@/components/shop/FilterSidebar';
import { SortDropdown } from '@/components/shop/SortDropdown';
import { ViewToggle } from '@/components/shop/ViewToggle';
import { Pagination } from '@/components/shop/Pagination';
import { Breadcrumbs } from '@/components/shop/Breadcrumbs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import type { ProductListResponse, Currency } from '@/types';
import { getCategoryName, getCategoryDescription } from '@/lib/products';
import { getClientCurrency } from '@/lib/clientCookies';

export default function CategoryPage(): JSX.Element {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const category = params.category as string;
  const [currency, setCurrency] = useState<Currency>('USD');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ProductListResponse | null>(null);

  useEffect(() => {
    setCurrency(getClientCurrency('USD'));
  }, []);

  const [filters, setFilters] = useState({
    categories: [category],
    minPrice: searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined,
    maxPrice: searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined,
    rating: searchParams.get('rating') ? Number(searchParams.get('rating')) : undefined,
    inStock: searchParams.get('inStock') === 'true',
    tags: searchParams.get('tags') ? searchParams.get('tags')!.split(',') : [],
  });

  const sort = searchParams.get('sort') || 'featured';
  const page = searchParams.get('page') ? Number(searchParams.get('page')) : 1;

  useEffect(() => {
    async function fetchProducts(): Promise<void> {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('category', category);
        if (filters.minPrice !== undefined) params.set('minPrice', filters.minPrice.toString());
        if (filters.maxPrice !== undefined) params.set('maxPrice', filters.maxPrice.toString());
        if (filters.rating !== undefined) params.set('rating', filters.rating.toString());
        if (filters.inStock) params.set('inStock', 'true');
        if (filters.tags.length > 0) params.set('tags', filters.tags.join(','));
        params.set('sort', sort);
        params.set('page', page.toString());
        params.set('currency', currency);

        const response = await fetch(`/api/products?${params.toString()}`);
        const result = await response.json();
        if (result.success) {
          setData(result.data);
        }
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, [category, filters, sort, page, currency]);

  const updateURL = (newFilters: any, newSort?: string, newPage?: number): void => {
    const params = new URLSearchParams();
    if (newFilters.minPrice !== undefined) params.set('minPrice', newFilters.minPrice.toString());
    if (newFilters.maxPrice !== undefined) params.set('maxPrice', newFilters.maxPrice.toString());
    if (newFilters.rating !== undefined) params.set('rating', newFilters.rating.toString());
    if (newFilters.inStock) params.set('inStock', 'true');
    if (newFilters.tags.length > 0) params.set('tags', newFilters.tags.join(','));
    if (newSort && newSort !== 'featured') params.set('sort', newSort);
    if (newPage && newPage > 1) params.set('page', newPage.toString());

    router.push(`/products/category/${category}${params.toString() ? `?${params.toString()}` : ''}`);
  };

  const handleFiltersChange = (newFilters: any): void => {
    setFilters({ ...newFilters, categories: [category] });
    updateURL(newFilters, sort, 1);
  };

  const handleSortChange = (newSort: string): void => {
    updateURL(filters, newSort, 1);
  };

  const handlePageChange = (newPage: number): void => {
    updateURL(filters, sort, newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClearFilters = (): void => {
    const emptyFilters = {
      categories: [category],
      minPrice: undefined,
      maxPrice: undefined,
      rating: undefined,
      inStock: false,
      tags: [],
    };
    setFilters(emptyFilters);
    updateURL(emptyFilters, 'featured', 1);
  };

  const categoryName = getCategoryName(category);
  const categoryDescription = getCategoryDescription(category);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs
          items={[
            { label: 'Products', href: '/products' },
            { label: categoryName, href: `/products/category/${category}` },
          ]}
          className="mb-6"
        />

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
            {categoryName}
          </h1>
          {categoryDescription && (
            <p className="text-gray-600">
              {categoryDescription}
            </p>
          )}
        </div>

        <div className="flex gap-8">
          <aside className="hidden lg:block w-64 flex-shrink-0">
            {data && (
              <FilterSidebar
                filters={filters}
                facets={data.facets}
                currency={currency}
                onFiltersChange={handleFiltersChange}
                onClearFilters={handleClearFilters}
              />
            )}
          </aside>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-6 gap-4">
              <div className="flex items-center gap-4">
                <div className="lg:hidden">
                  {data && (
                    <FilterSidebar
                      filters={filters}
                      facets={data.facets}
                      currency={currency}
                      onFiltersChange={handleFiltersChange}
                      onClearFilters={handleClearFilters}
                      isMobile
                    />
                  )}
                </div>
                {data && (
                  <p className="text-sm text-gray-600">
                    {data.total} {data.total === 1 ? 'product' : 'products'}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <SortDropdown value={sort} onChange={handleSortChange} />
                <ViewToggle view={view} onChange={setView} />
              </div>
            </div>

            {loading ? (
              <div className={view === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-6'}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="space-y-4">
                    <Skeleton className="aspect-[3/4] w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))}
              </div>
            ) : data && data.products.length > 0 ? (
              <>
                <div className={view === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-6'}>
                  {data.products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      currency={currency}
                    />
                  ))}
                </div>

                {data.totalPages > 1 && (
                  <Pagination
                    currentPage={data.page}
                    totalPages={data.totalPages}
                    onPageChange={handlePageChange}
                    className="mt-12"
                  />
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <p className="text-gray-500 text-lg mb-4">No products found in this category</p>
                <Button onClick={handleClearFilters} variant="outline">
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
