'use client';
import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/lib/cartContext';
import type { CartLineItem } from '@/types';

interface RecoveredSession {
  email: string;
  cartSnapshot: CartLineItem[];
  stepReached: number;
  currency: string;
  sessionToken: string;
}

export default function RecoverCheckoutPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setItemsFromRecovery } = useCart();
  const token = params.token as string;
  const discountCode = searchParams.get('code');

  const [session, setSession] = useState<RecoveredSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    fetch(`/api/checkout/recover/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setSession(data.session);
      })
      .catch(() => setError('Failed to load your saved cart.'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleContinue = async () => {
    if (!session) return;
    setRestoring(true);
    // Restore cart items from snapshot
    setItemsFromRecovery(session.cartSnapshot);
    // Navigate to checkout, pre-filling email and applying discount if present
    const url = new URL('/checkout', window.location.origin);
    url.searchParams.set('email', session.email);
    url.searchParams.set('step', '2');
    url.searchParams.set('sessionToken', session.sessionToken);
    if (discountCode) url.searchParams.set('code', discountCode);
    router.push(url.toString());
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-cream)' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-t-transparent" style={{ borderColor: 'var(--color-primary)' }} />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center" style={{ background: 'var(--color-cream)' }}>
        <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-primary)' }}>Link Expired</h1>
        <p className="text-gray-600 mb-6">{error || 'This recovery link has expired or already been used.'}</p>
        <Link href="/cart" className="btn-primary">Return to Cart</Link>
      </div>
    );
  }

  const sym = session.currency === 'GBP' ? '£' : '$';
  const subtotal = session.cartSnapshot.reduce((s, i) => {
    return s + (session.currency === 'GBP' ? i.priceGbp : i.priceUsd) * i.quantity;
  }, 0);

  return (
    <div className="min-h-screen py-12 px-4" style={{ background: 'var(--color-cream)' }}>
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-serif tracking-widest" style={{ color: 'var(--color-primary)' }}>LUXEHAVEN</Link>
          <h1 className="text-xl font-semibold mt-4" style={{ color: 'var(--color-primary)' }}>Your Saved Cart</h1>
          <p className="text-gray-500 mt-1">Continue where you left off</p>
        </div>

        {discountCode && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-center">
            <p className="text-green-700 font-semibold">🎁 10% discount applied!</p>
            <p className="text-green-600 text-sm mt-1">Code <strong>{discountCode}</strong> will be applied at checkout</p>
          </div>
        )}

        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
          <h2 className="font-semibold mb-4" style={{ color: 'var(--color-primary)' }}>Items in Your Cart</h2>
          <div className="space-y-3">
            {session.cartSnapshot.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                {item.imageUrl && (
                  <img src={item.imageUrl} alt={item.name} className="w-12 h-12 object-cover rounded" />
                )}
                <div className="flex-1">
                  <p className="font-medium text-sm">{item.name}</p>
                  {item.variantLabel && <p className="text-xs text-gray-400">{item.variantLabel}</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{sym}{((session.currency === 'GBP' ? item.priceGbp : item.priceUsd) * item.quantity).toFixed(2)}</p>
                  <p className="text-xs text-gray-400">×{item.quantity}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="pt-4 mt-2 border-t flex justify-between font-semibold">
            <span>Subtotal</span>
            <span>{sym}{subtotal.toFixed(2)}</span>
          </div>
        </div>

        <button
          onClick={handleContinue}
          disabled={restoring}
          className="btn-primary w-full py-4 text-lg disabled:opacity-50"
        >
          {restoring ? 'Restoring...' : 'Continue to Checkout →'}
        </button>

        <p className="text-center text-sm text-gray-400 mt-4">
          🔒 SSL Secured &nbsp;|&nbsp; 30-Day Returns &nbsp;|&nbsp; UK Duties Included
        </p>
      </div>
    </div>
  );
}
