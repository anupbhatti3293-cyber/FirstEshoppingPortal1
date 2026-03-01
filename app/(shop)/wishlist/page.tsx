'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Heart, ShoppingBag, Trash2 } from 'lucide-react';
import { PriceDisplay } from '@/components/shop/PriceDisplay';

interface WishlistItem {
  id: string;
  product_id: number;
  added_at: string;
  products: {
    id: number;
    name: string;
    slug: string;
    short_description: string;
    category: string;
    base_price_usd: number;
    base_price_gbp: number;
    stock_quantity: number;
    is_active: boolean;
    product_images: Array<{ url: string; alt_text: string }>;
  };
}

export default function WishlistPage(): JSX.Element {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    fetchWishlist();
  }, []);

  async function fetchWishlist(): Promise<void> {
    try {
      const response = await fetch('/api/wishlist');
      const result = await response.json();

      if (response.status === 401) {
        router.push('/login');
        return;
      }

      if (result.success) {
        setItems(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch wishlist:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(itemId: string): Promise<void> {
    setRemovingId(itemId);
    try {
      const response = await fetch(`/api/wishlist/${itemId}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (result.success) {
        setItems(items.filter((item) => item.id !== itemId));
      }
    } catch (error) {
      console.error('Failed to remove item:', error);
    } finally {
      setRemovingId(null);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-gray-600">Loading wishlist...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1
            className="text-4xl font-bold text-[#1A1A2E] mb-2"
            style={{ fontFamily: 'Playfair Display, serif' }}
          >
            My Wishlist
          </h1>
          <p className="text-gray-600">
            {items.length} {items.length === 1 ? 'item' : 'items'} saved for later
          </p>
        </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-16 text-center">
            <div className="max-w-md mx-auto">
              <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-[#1A1A2E] mb-2">
                Your wishlist is empty
              </h2>
              <p className="text-gray-600 mb-6">
                Discover our collection and save your favorite products
              </p>
              <Link href="/products">
                <Button className="bg-[#2E86AB] hover:bg-[#1E3A5F]">
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Start Shopping
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => {
              const product = item.products;
              const mainImage = product.product_images?.[0];

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <Link href={`/products/${product.slug}`}>
                    <div className="relative aspect-square bg-gray-100">
                      {mainImage ? (
                        <Image
                          src={mainImage.url}
                          alt={mainImage.alt_text || product.name}
                          fill
                          className="object-cover hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-400">
                          No image
                        </div>
                      )}
                    </div>
                  </Link>

                  <div className="p-4">
                    <Link href={`/products/${product.slug}`}>
                      <h3 className="font-medium text-[#1A1A2E] mb-1 hover:text-[#2E86AB] transition-colors line-clamp-2">
                        {product.name}
                      </h3>
                    </Link>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {product.short_description}
                    </p>

                    <div className="flex items-center justify-between mb-4">
                      <PriceDisplay
                        priceUsd={product.base_price_usd}
                        priceGbp={product.base_price_gbp}
                        currency="USD"
                        className="text-lg font-bold"
                      />
                      {product.stock_quantity <= 0 && (
                        <span className="text-sm text-red-600 font-medium">
                          Out of Stock
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Link href={`/products/${product.slug}`} className="flex-1">
                        <Button
                          className="w-full bg-[#2E86AB] hover:bg-[#1E3A5F]"
                          disabled={product.stock_quantity <= 0}
                        >
                          {product.stock_quantity <= 0 ? 'Out of Stock' : 'View Product'}
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleRemove(item.id)}
                        disabled={removingId === item.id}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
