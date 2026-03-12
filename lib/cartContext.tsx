'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useAuth } from './authContext';
import { useCurrency } from './currencyContext';
import type { CartLineItem } from '@/types';

const STORAGE_KEY = 'luxehaven_guest_cart';
const FREE_SHIPPING_USD = 50;
const FREE_SHIPPING_GBP = 40;

interface AppliedDiscount {
  code: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING';
  value: number;
  amountSavedUsd: number;
  amountSavedGbp: number;
}

interface CartContextType {
  items: CartLineItem[];
  itemCount: number;
  subtotalUsd: number;
  subtotalGbp: number;
  discountCode: string;
  appliedDiscount: AppliedDiscount | null;
  discountError: string;
  freeShippingThresholdUsd: number;
  freeShippingThresholdGbp: number;
  amountUntilFreeShippingUsd: number;
  amountUntilFreeShippingGbp: number;
  isFreeShipping: boolean;
  loading: boolean;
  addItem: (item: Omit<CartLineItem, 'quantity'>, quantity?: number) => Promise<void>;
  removeItem: (productId: number, variantId: number | null) => Promise<void>;
  updateQuantity: (productId: number, variantId: number | null, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  setDiscountCode: (code: string) => void;
  applyDiscount: () => Promise<void>;
  removeDiscount: () => void;
  mergeGuestCart: () => Promise<void>;
  /** Restore cart items from an abandoned-cart recovery snapshot */
  setItemsFromRecovery: (snapshot: CartLineItem[]) => void;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { currency } = useCurrency();
  const [items, setItems] = useState<CartLineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<AppliedDiscount | null>(null);
  const [discountError, setDiscountError] = useState('');

  // ── Derived values ──────────────────────────────────────────────────────────

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  const subtotalUsd = items.reduce((sum, i) => sum + i.priceUsd * i.quantity, 0);
  const subtotalGbp = items.reduce((sum, i) => sum + i.priceGbp * i.quantity, 0);

  const amountUntilFreeShippingUsd = Math.max(0, FREE_SHIPPING_USD - subtotalUsd);
  const amountUntilFreeShippingGbp = Math.max(0, FREE_SHIPPING_GBP - subtotalGbp);
  const isFreeShipping = currency === 'GBP'
    ? subtotalGbp >= FREE_SHIPPING_GBP
    : subtotalUsd >= FREE_SHIPPING_USD;

  // ── Guest cart (localStorage) ───────────────────────────────────────────────

  function readGuestCart(): CartLineItem[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  function writeGuestCart(cartItems: CartLineItem[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cartItems));
  }

  // ── Load cart ───────────────────────────────────────────────────────────────

  const loadCart = useCallback(async () => {
    setLoading(true);
    if (user) {
      try {
        const res = await fetch('/api/cart');
        if (res.ok) {
          const { data } = await res.json();
          setItems(data || []);
        }
      } catch { /* keep existing items */ }
    } else {
      setItems(readGuestCart());
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { loadCart(); }, [loadCart]);

  // ── Add item ────────────────────────────────────────────────────────────────

  const addItem = useCallback(async (item: Omit<CartLineItem, 'quantity'>, quantity = 1) => {
    if (user) {
      await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: item.productId, variantId: item.variantId, quantity }),
      });
      await loadCart();
    } else {
      setItems(prev => {
        const existing = prev.find(i =>
          i.productId === item.productId && i.variantId === item.variantId
        );
        let next: CartLineItem[];
        if (existing) {
          next = prev.map(i =>
            i.productId === item.productId && i.variantId === item.variantId
              ? { ...i, quantity: Math.min(i.quantity + quantity, i.stockQuantity) }
              : i
          );
        } else {
          next = [...prev, { ...item, quantity }];
        }
        writeGuestCart(next);
        return next;
      });
    }
  }, [user, loadCart]);

  // ── Remove item ─────────────────────────────────────────────────────────────

  const removeItem = useCallback(async (productId: number, variantId: number | null) => {
    if (user) {
      await fetch(`/api/cart?productId=${productId}&variantId=${variantId ?? ''}`, { method: 'DELETE' });
      await loadCart();
    } else {
      setItems(prev => {
        const next = prev.filter(i => !(i.productId === productId && i.variantId === variantId));
        writeGuestCart(next);
        return next;
      });
    }
  }, [user, loadCart]);

  // ── Update quantity ─────────────────────────────────────────────────────────

  const updateQuantity = useCallback(async (productId: number, variantId: number | null, quantity: number) => {
    if (quantity <= 0) { await removeItem(productId, variantId); return; }
    if (user) {
      await fetch('/api/cart', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, variantId, quantity }),
      });
      await loadCart();
    } else {
      setItems(prev => {
        const next = prev.map(i =>
          i.productId === productId && i.variantId === variantId
            ? { ...i, quantity: Math.min(quantity, i.stockQuantity) }
            : i
        );
        writeGuestCart(next);
        return next;
      });
    }
  }, [user, loadCart, removeItem]);

  // ── Clear cart ──────────────────────────────────────────────────────────────

  const clearCart = useCallback(async () => {
    if (user) {
      await fetch('/api/cart', { method: 'DELETE' });
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    setItems([]);
    setAppliedDiscount(null);
    setDiscountCode('');
  }, [user]);

  // ── Merge guest cart on login ───────────────────────────────────────────────

  const mergeGuestCart = useCallback(async () => {
    const guestItems = readGuestCart();
    if (guestItems.length === 0) { await loadCart(); return; }
    await fetch('/api/cart/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: guestItems }),
    });
    localStorage.removeItem(STORAGE_KEY);
    await loadCart();
  }, [loadCart]);

  // ── Restore from abandoned-cart recovery snapshot ───────────────────────────

  const setItemsFromRecovery = useCallback((snapshot: CartLineItem[]) => {
    if (user) {
      // Logged-in: persist snapshot to DB via cart merge endpoint
      fetch('/api/cart/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: snapshot }),
      }).then(() => loadCart()).catch(console.error);
    } else {
      // Guest: write to localStorage
      writeGuestCart(snapshot);
      setItems(snapshot);
    }
  }, [user, loadCart]);

  // ── Discount code ───────────────────────────────────────────────────────────

  const applyDiscount = useCallback(async () => {
    if (!discountCode.trim()) return;
    setDiscountError('');
    const res = await fetch('/api/cart/validate-discount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: discountCode.trim().toUpperCase(), subtotalUsd, subtotalGbp }),
    });
    const json = await res.json();
    if (json.success) {
      setAppliedDiscount(json.data);
    } else {
      setDiscountError(json.error || 'Invalid discount code');
      setAppliedDiscount(null);
    }
  }, [discountCode, subtotalUsd, subtotalGbp]);

  const removeDiscount = useCallback(() => {
    setAppliedDiscount(null);
    setDiscountCode('');
    setDiscountError('');
  }, []);

  return (
    <CartContext.Provider value={{
      items,
      itemCount,
      subtotalUsd,
      subtotalGbp,
      discountCode,
      appliedDiscount,
      discountError,
      freeShippingThresholdUsd: FREE_SHIPPING_USD,
      freeShippingThresholdGbp: FREE_SHIPPING_GBP,
      amountUntilFreeShippingUsd,
      amountUntilFreeShippingGbp,
      isFreeShipping,
      loading,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      setDiscountCode,
      applyDiscount,
      removeDiscount,
      mergeGuestCart,
      setItemsFromRecovery,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
