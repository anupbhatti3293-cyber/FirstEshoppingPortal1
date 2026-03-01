'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Star, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Product, Currency } from '@/types';

interface ProductCardProps {
  product: Product;
  currency?: Currency;
}

export function ProductCard({ product, currency = 'USD' }: ProductCardProps): JSX.Element {
  const price = currency === 'USD' ? product.price.usd : product.price.gbp;
  const currencySymbol = currency === 'USD' ? '$' : '£';

  return (
    <div className="group relative bg-white rounded-lg overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow duration-300">
      {product.badge && (
        <div className="absolute top-3 right-3 z-10">
          <span className="bg-[#F4A261] text-white text-xs font-semibold px-3 py-1 rounded-full">
            {product.badge}
          </span>
        </div>
      )}

      <Link href={`/products/${product.id}`} className="block relative aspect-[4/5] overflow-hidden bg-gray-100">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
        />
      </Link>

      <div className="p-4">
        <Link href={`/products/${product.id}`}>
          <h3 className="font-medium text-[#1A1A2E] mb-2 group-hover:text-[#2E86AB] transition-colors line-clamp-2">
            {product.name}
          </h3>
        </Link>

        <div className="flex items-center gap-1 mb-3">
          <div className="flex items-center">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${
                  i < Math.floor(product.rating)
                    ? 'fill-[#F4A261] text-[#F4A261]'
                    : 'fill-gray-200 text-gray-200'
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-gray-500">({product.reviews})</span>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold text-[#1E3A5F]">
            {currencySymbol}{price.toFixed(2)}
          </p>

          <Button
            size="sm"
            className="bg-[#2E86AB] hover:bg-[#1E3A5F] text-white"
            onClick={() => {}}
          >
            <ShoppingCart className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}
