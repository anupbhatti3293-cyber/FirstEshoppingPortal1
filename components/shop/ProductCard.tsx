'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Heart, Eye, ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import { Product, Currency } from '@/types';
import { RatingStars } from './RatingStars';
import { PriceDisplay } from './PriceDisplay';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getCategoryName } from '@/lib/products';

interface ProductCardProps {
  product: Product;
  currency?: Currency;
  onQuickView?: (product: Product) => void;
}

export function ProductCard({ product, currency = 'USD', onQuickView }: ProductCardProps): JSX.Element {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const mainImage = product.images && product.images.length > 0 ? product.images[0].url : '';
  const isOnSale = product.sale_price_usd !== null && product.sale_price_usd !== undefined;
  const isOutOfStock = product.stock_quantity <= 0 && !product.allow_backorder;
  const isNew = product.tags.includes('new');
  const isTrending = product.tags.includes('trending');

  const getBadgeVariant = (type: string): 'default' | 'destructive' | 'secondary' => {
    if (type === 'sale') return 'destructive';
    if (type === 'new') return 'default';
    return 'secondary';
  };

  const handleQuickView = (e: React.MouseEvent): void => {
    e.preventDefault();
    if (onQuickView) {
      onQuickView(product);
    }
  };

  const handleWishlist = (e: React.MouseEvent): void => {
    e.preventDefault();
    setIsWishlisted(!isWishlisted);
  };

  const handleAddToCart = (e: React.MouseEvent): void => {
    e.preventDefault();
  };

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="relative overflow-hidden rounded-lg bg-gray-100 aspect-[3/4] mb-3">
        {mainImage && (
          <Image
            src={mainImage}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        )}

        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {isOnSale && (
            <Badge variant={getBadgeVariant('sale')} className="shadow-sm">
              SALE
            </Badge>
          )}
          {isNew && (
            <Badge variant={getBadgeVariant('new')} className="shadow-sm bg-green-600">
              NEW
            </Badge>
          )}
          {isTrending && (
            <Badge variant={getBadgeVariant('trending')} className="shadow-sm bg-orange-600">
              TRENDING
            </Badge>
          )}
          {isOutOfStock && (
            <Badge variant="secondary" className="shadow-sm bg-gray-600">
              OUT OF STOCK
            </Badge>
          )}
        </div>

        <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Button
            variant="secondary"
            size="sm"
            className="h-9 w-9 p-0 rounded-full shadow-md"
            onClick={handleWishlist}
          >
            <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current text-red-500' : ''}`} />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="h-9 w-9 p-0 rounded-full shadow-md"
            onClick={handleQuickView}
          >
            <Eye className="w-4 h-4" />
          </Button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-sm transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <Button
            size="sm"
            className="w-full gap-2"
            disabled={isOutOfStock}
            onClick={handleAddToCart}
          >
            <ShoppingCart className="w-4 h-4" />
            {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 uppercase tracking-wide">
            {getCategoryName(product.category)}
          </span>
          {product.sku && (
            <span className="text-xs text-gray-400">
              {product.sku}
            </span>
          )}
        </div>

        <h3 className="font-medium text-gray-900 line-clamp-2 leading-tight">
          {product.name}
        </h3>

        <div className="flex items-center gap-2">
          <RatingStars rating={product.rating_average} size="sm" />
          <span className="text-sm text-gray-500">
            ({product.rating_count})
          </span>
        </div>

        <PriceDisplay
          priceUsd={product.base_price_usd}
          priceGbp={product.base_price_gbp}
          salePriceUsd={product.sale_price_usd}
          salePriceGbp={product.sale_price_gbp}
          currency={currency}
          size="md"
        />
      </div>
    </Link>
  );
}
