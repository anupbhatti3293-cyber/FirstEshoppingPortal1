'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/cartContext';
import { useCurrency } from '@/lib/currencyContext';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Tag, X, Loader2, CheckCircle } from 'lucide-react';

export function CartPageClient() {
  const router = useRouter();
  const { currency } = useCurrency();
  const {
    items, itemCount, subtotalUsd, subtotalGbp,
    discountCode, appliedDiscount, discountError,
    amountUntilFreeShippingUsd, amountUntilFreeShippingGbp,
    freeShippingThresholdUsd, freeShippingThresholdGbp,
    isFreeShipping,
    removeItem, updateQuantity, setDiscountCode, applyDiscount, removeDiscount, loading,
  } = useCart();

  const [discountLoading, setDiscountLoading] = useState(false);
  const [notes, setNotes] = useState('');

  const isGBP = currency === 'GBP';
  const fmt = (usd: number, gbp: number) =>
    isGBP ? `£${gbp.toFixed(2)}` : `$${usd.toFixed(2)}`;

  const subtotal = isGBP ? subtotalGbp : subtotalUsd;
  const threshold = isGBP ? freeShippingThresholdGbp : freeShippingThresholdUsd;
  const amountUntilFree = isGBP ? amountUntilFreeShippingGbp : amountUntilFreeShippingUsd;
  const shippingProgress = Math.min((subtotal / threshold) * 100, 100);

  // Shipping cost
  const standardShippingUsd = isFreeShipping ? 0 : 4.99;
  const standardShippingGbp = isFreeShipping ? 0 : 3.99;

  // VAT for UK (20%)
  const vatGbp = isGBP ? subtotalGbp * 0.2 : 0;

  // Discount
  const discountSavedUsd = appliedDiscount?.amountSavedUsd ?? 0;
  const discountSavedGbp = appliedDiscount?.amountSavedGbp ?? 0;
  const isDiscountFreeShipping = appliedDiscount?.type === 'FREE_SHIPPING';
  const effectiveShippingUsd = isDiscountFreeShipping ? 0 : standardShippingUsd;
  const effectiveShippingGbp = isDiscountFreeShipping ? 0 : standardShippingGbp;

  const totalUsd = subtotalUsd - discountSavedUsd + effectiveShippingUsd;
  const totalGbp = subtotalGbp - discountSavedGbp + effectiveShippingGbp + vatGbp;

  async function handleApplyDiscount() {
    setDiscountLoading(true);
    await applyDiscount();
    setDiscountLoading(false);
  }

  function handleCheckout() {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('checkout_notes', notes);
    }
    router.push('/checkout');
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-[hsl(var(--primary))]" size={32} />
    </div>
  );

  if (items.length === 0) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 bg-[hsl(var(--background))]">
      <ShoppingBag size={56} className="text-[hsl(var(--muted-foreground))]" strokeWidth={1} />
      <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]" style={{ fontFamily: 'Playfair Display, serif' }}>
        Your cart is empty
      </h1>
      <p className="text-[hsl(var(--muted-foreground))] text-center max-w-sm">
        Discover our curated collection and find something you&apos;ll love.
      </p>
      <Link href="/products"
        className="flex items-center gap-2 px-6 py-3 rounded-lg bg-[hsl(var(--primary))] text-white text-sm font-medium hover:bg-[hsl(var(--primary)/0.9)] transition-all">
        Browse products <ArrowRight size={16} />
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-[hsl(var(--foreground))] mb-8" style={{ fontFamily: 'Playfair Display, serif' }}>
          Shopping Cart
          <span className="ml-3 text-lg font-normal text-[hsl(var(--muted-foreground))]">
            ({itemCount} {itemCount === 1 ? 'item' : 'items'})
          </span>
        </h1>

        {/* Free Shipping Progress Bar */}
        <div className={`rounded-xl p-4 mb-6 transition-colors ${isFreeShipping ? 'bg-green-50 border border-green-200' : 'bg-[hsl(var(--muted))] border border-[hsl(var(--border))]'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              {isFreeShipping
                ? <span className="text-green-700 flex items-center gap-1.5"><CheckCircle size={15} /> You&apos;ve unlocked FREE shipping! 🎉</span>
                : <span className="text-[hsl(var(--foreground))]">Add {isGBP ? `£${amountUntilFree.toFixed(2)}` : `$${amountUntilFree.toFixed(2)}`} more for FREE shipping</span>
              }
            </span>
            <span className="text-xs text-[hsl(var(--muted-foreground))]">
              {isGBP ? `£${subtotalGbp.toFixed(2)} / £${threshold}` : `$${subtotalUsd.toFixed(2)} / $${threshold}`}
            </span>
          </div>
          <div className="h-2 bg-white rounded-full overflow-hidden border border-[hsl(var(--border))]">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isFreeShipping ? 'bg-green-500' : shippingProgress > 70 ? 'bg-[hsl(var(--accent))]' : 'bg-[hsl(var(--primary))]'}`}
              style={{ width: `${shippingProgress}%` }}
            />
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map(item => {
              const price = isGBP ? item.priceGbp : item.priceUsd;
              const lineTotal = price * item.quantity;
              const outOfStock = item.stockQuantity === 0;

              return (
                <div key={`${item.productId}-${item.variantId}`}
                  className={`bg-white rounded-2xl border p-4 flex gap-4 transition-all ${outOfStock ? 'border-red-200 bg-red-50' : 'border-[hsl(var(--border))]'}`}>

                  {/* Image */}
                  <div className="relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-[hsl(var(--muted))]">
                    {item.imageUrl ? (
                      <Image src={item.imageUrl} alt={item.name} fill className="object-cover"
                        sizes="96px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag size={24} className="text-[hsl(var(--muted-foreground))]" />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between gap-2">
                      <div>
                        <Link href={`/products/${item.slug}`}
                          className="font-medium text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))] text-sm line-clamp-2 transition-colors">
                          {item.name}
                        </Link>
                        {item.variantLabel && (
                          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{item.variantLabel}</p>
                        )}
                        {outOfStock && (
                          <p className="text-xs text-red-600 font-medium mt-1">⚠ Out of stock — remove to proceed</p>
                        )}
                      </div>
                      <button onClick={() => removeItem(item.productId, item.variantId)}
                        className="text-[hsl(var(--muted-foreground))] hover:text-red-500 transition-colors flex-shrink-0">
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      {/* Quantity stepper */}
                      <div className="flex items-center gap-1 border border-[hsl(var(--border))] rounded-lg overflow-hidden">
                        <button
                          onClick={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)}
                          className="p-2 hover:bg-[hsl(var(--muted))] transition-colors">
                          <Minus size={13} />
                        </button>
                        <span className="px-3 text-sm font-medium min-w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)}
                          disabled={item.quantity >= item.stockQuantity}
                          className="p-2 hover:bg-[hsl(var(--muted))] transition-colors disabled:opacity-40">
                          <Plus size={13} />
                        </button>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm text-[hsl(var(--foreground))]">
                          {isGBP ? `£${lineTotal.toFixed(2)}` : `$${lineTotal.toFixed(2)}`}
                        </p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">
                          {isGBP ? `£${item.priceGbp.toFixed(2)}` : `$${item.priceUsd.toFixed(2)}`} each
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Order Notes */}
            <div className="bg-white rounded-2xl border border-[hsl(var(--border))] p-4">
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                Order note / Gift message <span className="text-[hsl(var(--muted-foreground))] font-normal">(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder="Add a gift message or special instructions..."
                className="w-full text-sm px-3 py-2.5 rounded-lg border border-[hsl(var(--border))] resize-none
                  focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent transition-all
                  text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))]"
              />
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-[hsl(var(--border))] p-6 sticky top-24">
              <h2 className="text-lg font-semibold mb-5 text-[hsl(var(--foreground))]">Order Summary</h2>

              {/* Discount Code */}
              {!appliedDiscount ? (
                <div className="mb-5">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                      <input
                        type="text"
                        value={discountCode}
                        onChange={e => setDiscountCode(e.target.value.toUpperCase())}
                        onKeyDown={e => e.key === 'Enter' && handleApplyDiscount()}
                        placeholder="Discount code"
                        className="w-full pl-8 pr-3 py-2.5 text-sm rounded-lg border border-[hsl(var(--border))]
                          focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent transition-all"
                      />
                    </div>
                    <button onClick={handleApplyDiscount} disabled={discountLoading || !discountCode}
                      className="px-4 py-2.5 rounded-lg bg-[hsl(var(--primary))] text-white text-sm font-medium
                        hover:bg-[hsl(var(--primary)/0.9)] disabled:opacity-50 transition-all">
                      {discountLoading ? <Loader2 size={14} className="animate-spin" /> : 'Apply'}
                    </button>
                  </div>
                  {discountError && <p className="text-red-500 text-xs mt-1.5">{discountError}</p>}
                </div>
              ) : (
                <div className="mb-5 bg-green-50 border border-green-200 rounded-lg px-3 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-green-600" />
                    <span className="text-sm font-medium text-green-700">{appliedDiscount.code}</span>
                    <span className="text-xs text-green-600">
                      -{isGBP ? `£${appliedDiscount.amountSavedGbp.toFixed(2)}` : `$${appliedDiscount.amountSavedUsd.toFixed(2)}`}
                    </span>
                  </div>
                  <button onClick={removeDiscount} className="text-green-600 hover:text-green-800">
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Price breakdown */}
              <div className="space-y-2.5 text-sm border-t border-[hsl(var(--border))] pt-4">
                <div className="flex justify-between text-[hsl(var(--muted-foreground))]">
                  <span>Subtotal</span>
                  <span>{fmt(subtotalUsd, subtotalGbp)}</span>
                </div>
                {appliedDiscount && appliedDiscount.type !== 'FREE_SHIPPING' && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount ({appliedDiscount.code})</span>
                    <span>-{fmt(discountSavedUsd, discountSavedGbp)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[hsl(var(--muted-foreground))]">
                  <span>Shipping</span>
                  <span className={isFreeShipping || isDiscountFreeShipping ? 'text-green-600 font-medium' : ''}>
                    {isFreeShipping || isDiscountFreeShipping ? 'FREE' : fmt(standardShippingUsd, standardShippingGbp)}
                  </span>
                </div>
                {isGBP && (
                  <div className="flex justify-between text-[hsl(var(--muted-foreground))]">
                    <span>VAT (20%)</span>
                    <span>£{vatGbp.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base pt-2 border-t border-[hsl(var(--border))] text-[hsl(var(--foreground))]">
                  <span>Total</span>
                  <span>{isGBP ? `£${totalGbp.toFixed(2)}` : `$${totalUsd.toFixed(2)}`}</span>
                </div>
                {isGBP && (
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    🇬🇧 All import duties included — no customs surprises
                  </p>
                )}
              </div>

              {/* CTA */}
              <button
                onClick={handleCheckout}
                disabled={items.some(i => i.stockQuantity === 0)}
                className="w-full mt-5 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl
                  bg-[hsl(var(--primary))] text-white font-semibold text-sm tracking-wide
                  hover:bg-[hsl(var(--primary)/0.9)] active:scale-[0.99]
                  disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200">
                Proceed to Checkout <ArrowRight size={16} />
              </button>

              <Link href="/products"
                className="block text-center text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] mt-3 transition-colors">
                ← Continue Shopping
              </Link>

              {/* Trust signals */}
              <div className="mt-5 pt-4 border-t border-[hsl(var(--border))] grid grid-cols-2 gap-2">
                {['🔒 Secure Checkout', '↩️ 30-Day Returns', '🚚 Free Shipping $50+', '✓ SSL Encrypted'].map(t => (
                  <div key={t} className="text-xs text-[hsl(var(--muted-foreground))] text-center py-1">{t}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
