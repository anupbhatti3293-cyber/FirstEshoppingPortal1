'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/authContext';
import { useCurrency } from '@/lib/currencyContext';
import { Heart, Trash2, Loader2, ArrowRight, ShoppingBag } from 'lucide-react';
import { PriceDisplay } from '@/components/shop/PriceDisplay';

interface WishlistItem {
  id: number;
  product_id: number;
  added_at: string;
  products: {
    id: number;
    name: string;
    slug: string;
    base_price_usd: number;
    base_price_gbp: number;
    sale_price_usd: number | null;
    sale_price_gbp: number | null;
    rating_average: number;
    stock_quantity: number;
    product_images: { url: string; alt_text: string; is_primary: boolean; position: number }[];
  };
}

export function WishlistPage() {
  const { user, loading: authLoading, setWishlistCount } = useAuth();
  const { currency } = useCurrency();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<number | null>(null);

  const fetchWishlist = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/wishlist');
    if (res.ok) {
      const { data } = await res.json();
      setItems(data || []);
      setWishlistCount((data || []).length);
    }
    setLoading(false);
  }, [setWishlistCount]);

  useEffect(() => {
    if (!authLoading && user) fetchWishlist();
    else if (!authLoading && !user) setLoading(false);
  }, [authLoading, user, fetchWishlist]);

  async function removeItem(productId: number) {
    setRemoving(productId);
    await fetch(`/api/wishlist?productId=${productId}`, { method: 'DELETE' });
    setItems(prev => prev.filter(i => i.product_id !== productId));
    setWishlistCount(items.length - 1);
    setRemoving(null);
  }

  if (authLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-[hsl(var(--primary))]" size={32} />
    </div>
  );

  if (!user) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
      <Heart size={48} className="text-[hsl(var(--muted-foreground))]" strokeWidth={1} />
      <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]" style={{ fontFamily: 'Playfair Display, serif' }}>
        Sign in to see your wishlist
      </h1>
      <p className="text-[hsl(var(--muted-foreground))] text-center max-w-sm">
        Save your favourite pieces and they&apos;ll be waiting for you when you come back.
      </p>
      <Link href="/login?redirect=/wishlist"
        className="flex items-center gap-2 px-6 py-3 rounded-lg bg-[hsl(var(--primary))] text-white text-sm font-medium hover:bg-[hsl(var(--primary)/0.9)] transition-all">
        Sign in <ArrowRight size={16} />
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[hsl(var(--foreground))]" style={{ fontFamily: 'Playfair Display, serif' }}>
              My Wishlist
            </h1>
            <p className="text-[hsl(var(--muted-foreground))] mt-1 text-sm">
              {items.length} {items.length === 1 ? 'item' : 'items'} saved
            </p>
          </div>
          <Link href="/products"
            className="flex items-center gap-2 text-sm text-[hsl(var(--primary))] font-medium hover:underline">
            <ShoppingBag size={15} /> Continue shopping
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[hsl(var(--border))] p-16 text-center">
            <Heart size={48} className="mx-auto text-[hsl(var(--muted-foreground))] mb-4" strokeWidth={1} />
            <h2 className="text-xl font-semibold text-[hsl(var(--foreground))] mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
              Your wishlist is empty
            </h2>
            <p className="text-[hsl(var(--muted-foreground))] text-sm mb-6">
              Browse our collection and save the pieces you love.
            </p>
            <Link href="/products"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[hsl(var(--primary))] text-white text-sm font-medium hover:bg-[hsl(var(--primary)/0.9)] transition-all">
              Explore products <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {items.map(item => {
              const product = item.products;
              const primaryImg = product.product_images?.find(i => i.is_primary) || product.product_images?.[0];
              const inStock = product.stock_quantity > 0;
              return (
                <div key={item.id} className="bg-white rounded-2xl border border-[hsl(var(--border))] overflow-hidden group hover:shadow-md transition-all duration-300">
                  <div className="relative aspect-square overflow-hidden bg-[hsl(var(--muted))]">
                    {primaryImg ? (
                      <Image
                        src={primaryImg.url}
                        alt={primaryImg.alt_text || product.name}
                        fill className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[hsl(var(--muted-foreground))]">
                        <ShoppingBag size={32} />
                      </div>
                    )}
                    <button
                      onClick={() => removeItem(item.product_id)}
                      disabled={removing === item.product_id}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white shadow flex items-center justify-center
                        text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                      title="Remove from wishlist"
                    >
                      {removing === item.product_id
                        ? <Loader2 size={14} className="animate-spin" />
                        : <Trash2 size={14} />}
                    </button>
                    {!inStock && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs text-center py-1.5">
                        Out of stock
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <Link href={`/products/${product.slug}`}
                      className="block text-sm font-medium text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))] line-clamp-2 mb-2 transition-colors">
                      {product.name}
                    </Link>
                    <PriceDisplay
                      priceUsd={product.sale_price_usd ?? product.base_price_usd}
                      priceGbp={product.sale_price_gbp ?? product.base_price_gbp}
                      currency={currency}
                    />
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
