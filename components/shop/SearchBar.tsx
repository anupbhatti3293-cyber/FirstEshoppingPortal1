'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { SearchResult, Currency } from '@/types';
import { useRouter } from 'next/navigation';

interface SearchBarProps {
  currency?: Currency;
  className?: string;
}

export function SearchBar({ currency = 'USD', className = '' }: SearchBarProps): JSX.Element {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);

    timeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/products/search?q=${encodeURIComponent(query)}&currency=${currency}`);
        const data = await response.json();
        if (data.success) {
          setResults(data.data || []);
          setIsOpen(true);
        }
      } catch (error) {
        console.error('Search failed:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query, currency]);

  const handleClear = (): void => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}`);
      setIsOpen(false);
    }
  };

  const handleResultClick = (): void => {
    setIsOpen(false);
    setQuery('');
  };

  const formatPrice = (price: number): string => {
    const symbol = currency === 'USD' ? '$' : '£';
    return `${symbol}${price.toFixed(2)}`;
  };

  const displayPrice = (result: SearchResult): string => {
    return currency === 'USD' ? formatPrice(result.price_usd) : formatPrice(result.price_gbp);
  };

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search products..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 pr-10"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </form>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">
              Searching...
            </div>
          ) : results.length > 0 ? (
            <div className="py-2">
              {results.map((result) => (
                <Link
                  key={result.id}
                  href={`/products/${result.slug}`}
                  onClick={handleResultClick}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  {result.image && (
                    <div className="relative w-12 h-12 flex-shrink-0 bg-gray-100 rounded">
                      <Image
                        src={result.image}
                        alt={result.name}
                        fill
                        className="object-cover rounded"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {result.name}
                    </p>
                    <p className="text-sm text-gray-500 capitalize">
                      {result.category.replace('-', ' ')}
                    </p>
                  </div>
                  <p className="font-semibold text-gray-900 flex-shrink-0">
                    {displayPrice(result)}
                  </p>
                </Link>
              ))}
              {query && (
                <div className="border-t border-gray-200 p-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      router.push(`/search?q=${encodeURIComponent(query)}`);
                      setIsOpen(false);
                    }}
                  >
                    View all results for "{query}"
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500">
              No products found for "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
