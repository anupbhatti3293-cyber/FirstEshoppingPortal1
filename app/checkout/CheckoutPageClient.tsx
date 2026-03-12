'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { useCart } from '@/lib/cartContext';
import { useAuth } from '@/lib/authContext';
import { useCurrency } from '@/lib/currencyContext';
import { Loader2, ChevronRight, Lock, CheckCircle, Package, CreditCard } from 'lucide-react';
import type { CheckoutFormData, ShippingMethod } from '@/types';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const STEPS = [
  { id: 1, label: 'Delivery', icon: Package },
  { id: 2, label: 'Shipping', icon: Package },
  { id: 3, label: 'Payment', icon: CreditCard },
];

const COUNTRIES = [
  { code: 'US', label: 'United States' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'CA', label: 'Canada' },
  { code: 'AU', label: 'Australia' },
  { code: 'DE', label: 'Germany' },
  { code: 'FR', label: 'France' },
  { code: 'NZ', label: 'New Zealand' },
];

const defaultForm: CheckoutFormData = {
  email: '', firstName: '', lastName: '', phone: '',
  line1: '', line2: '', city: '', county: '', state: '', postcode: '', zipCode: '',
  country: 'US', saveAddress: true,
  shippingMethod: 'STANDARD',
  sameAsBilling: true, notes: '', discountCode: '',
};

// ── Payment form (Step 3) ──────────────────────────────────────────────────────
function PaymentForm({
  clientSecret, onSuccess, total, currency, isGBP,
}: {
  clientSecret: string;
  onSuccess: (paymentIntentId: string) => void;
  total: number;
  currency: string;
  isGBP: boolean;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setPaying(true);
    setError('');

    const { error: submitError } = await elements.submit();
    if (submitError) { setError(submitError.message ?? 'Payment error'); setPaying(false); return; }

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (confirmError) {
      setError(confirmError.message ?? 'Payment failed');
      setPaying(false);
    } else if (paymentIntent?.status === 'succeeded') {
      onSuccess(paymentIntent.id);
    } else {
      setError('Payment incomplete. Please try again.');
      setPaying(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement options={{ layout: 'tabs' }} />
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
      )}
      <button type="submit" disabled={!stripe || paying}
        className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl
          bg-[hsl(var(--primary))] text-white font-semibold text-sm
          hover:bg-[hsl(var(--primary)/0.9)] disabled:opacity-60 transition-all">
        {paying
          ? <><Loader2 size={16} className="animate-spin" /> Processing…</>
          : <><Lock size={14} /> Pay {isGBP ? `£${total.toFixed(2)}` : `$${total.toFixed(2)}`} securely</>
        }
      </button>
      <p className="text-xs text-center text-[hsl(var(--muted-foreground))]">
        🔒 Secured by Stripe · Your payment info is never stored on our servers
      </p>
    </form>
  );
}

// ── Main checkout page ────────────────────────────────────────────────────────
export function CheckoutPageClient() {
  const router = useRouter();
  const { user } = useAuth();
  const { currency } = useCurrency();
  const { items, subtotalUsd, subtotalGbp, appliedDiscount, clearCart } = useCart();
  const isGBP = currency === 'GBP';

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<CheckoutFormData>(defaultForm);
  const [clientSecret, setClientSecret] = useState('');
  const [paymentIntentId, setPaymentIntentId] = useState('');
  const [breakdown, setBreakdown] = useState<{
    subtotalUsd: number; subtotalGbp: number;
    shippingUsd: number; shippingGbp: number;
    vatGbp: number;
    discountAmountUsd: number; discountAmountGbp: number;
    totalUsd: number; totalGbp: number;
  } | null>(null);
  const [checkoutSessionId, setCheckoutSessionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<CheckoutFormData>>({});

  // Pre-fill email if logged in
  useEffect(() => {
    if (user?.email) setForm(f => ({ ...f, email: user.email! }));
    // Restore order notes from cart page
    const saved = typeof window !== 'undefined' ? sessionStorage.getItem('checkout_notes') : null;
    if (saved) setForm(f => ({ ...f, notes: saved }));
  }, [user]);

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0 && step < 3) router.replace('/cart');
  }, [items, step, router]);

  const updateForm = (key: keyof CheckoutFormData, value: string | boolean) =>
    setForm(f => ({ ...f, [key]: value }));

  // ── Validation ──────────────────────────────────────────────────────────────
  function validateStep1(): boolean {
    const e: Partial<Record<keyof CheckoutFormData, string>> = {};
    if (!form.email) e.email = 'Email required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email';
    if (!form.firstName) e.firstName = 'First name required';
    if (!form.lastName) e.lastName = 'Last name required';
    if (!form.line1) e.line1 = 'Address required';
    if (!form.city) e.city = 'City required';
    if (!form.country) e.country = 'Country required';
    setErrors(e as Partial<CheckoutFormData>);
    return Object.keys(e).length === 0;
  }

  // ── Create checkout session ─────────────────────────────────────────────────
  async function createCheckoutSession() {
    const res = await fetch('/api/checkout/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.email, cartSnapshot: items, step: 1 }),
    });
    if (res.ok) {
      const { data } = await res.json();
      setCheckoutSessionId(data?.id ?? null);
    }
  }

  // ── Step 1 → 2 ─────────────────────────────────────────────────────────────
  async function handleStep1() {
    if (!validateStep1()) return;
    setLoading(true);
    await createCheckoutSession();
    setStep(2);
    setLoading(false);
  }

  // ── Step 2 → 3: create PaymentIntent ───────────────────────────────────────
  async function handleStep2() {
    setLoading(true);
    try {
      const res = await fetch('/api/checkout/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartItems: items,
          currency,
          shippingMethod: form.shippingMethod,
          discountCode: appliedDiscount?.code,
          checkoutSessionId,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setClientSecret(json.data.clientSecret);
      setBreakdown(json.data.breakdown);
      setStep(3);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // ── Payment success ─────────────────────────────────────────────────────────
  const handlePaymentSuccess = useCallback(async (piId: string) => {
    setPaymentIntentId(piId);
    // Poll for order creation (webhook is async)
    let orderId: number | null = null;
    let attempts = 0;
    while (!orderId && attempts < 15) {
      await new Promise(r => setTimeout(r, 1000));
      const res = await fetch(`/api/orders/by-payment-intent?piId=${piId}`);
      if (res.ok) {
        const { data } = await res.json();
        if (data?.id) orderId = data.id;
      }
      attempts++;
    }
    await clearCart();
    if (orderId) {
      router.push(`/order-confirmation/${orderId}`);
    } else {
      router.push('/order-confirmation/pending');
    }
  }, [clearCart, router]);

  // ── Shipping costs ──────────────────────────────────────────────────────────
  const stdShipUsd = subtotalUsd >= 50 ? 0 : 4.99;
  const stdShipGbp = subtotalGbp >= 40 ? 0 : 3.99;
  const expShipUsd = 14.99;
  const expShipGbp = 11.99;

  const shippingUsd = form.shippingMethod === 'EXPRESS' ? expShipUsd : stdShipUsd;
  const shippingGbp = form.shippingMethod === 'EXPRESS' ? expShipGbp : stdShipGbp;
  const vatGbp = isGBP ? subtotalGbp * 0.2 : 0;
  const discUsd = appliedDiscount?.amountSavedUsd ?? 0;
  const discGbp = appliedDiscount?.amountSavedGbp ?? 0;
  const totalUsd = Math.max(0, subtotalUsd - discUsd + shippingUsd);
  const totalGbp = Math.max(0, subtotalGbp - discGbp + shippingGbp + vatGbp);

  const fmt = (usd: number, gbp: number) => isGBP ? `£${gbp.toFixed(2)}` : `$${usd.toFixed(2)}`;

  const inputClass = (field?: string) => `w-full px-3 py-2.5 text-sm rounded-lg border transition-all
    focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent
    ${field && errors[field as keyof CheckoutFormData]
      ? 'border-red-400 bg-red-50'
      : 'border-[hsl(var(--border))] bg-white'}`;

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <div className="max-w-5xl mx-auto px-4 py-10">

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-0 mb-10">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all
                ${step === s.id ? 'bg-[hsl(var(--primary))] text-white' :
                  step > s.id ? 'bg-green-100 text-green-700' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}`}>
                {step > s.id ? <CheckCircle size={14} /> : <s.icon size={14} />}
                {s.label}
              </div>
              {i < STEPS.length - 1 && (
                <ChevronRight size={16} className="text-[hsl(var(--muted-foreground))] mx-1" />
              )}
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Left: form */}
          <div className="lg:col-span-3 space-y-6">

            {/* STEP 1: Contact + Address */}
            {step === 1 && (
              <div className="bg-white rounded-2xl border border-[hsl(var(--border))] p-6 space-y-4">
                <h2 className="text-lg font-semibold" style={{ fontFamily: 'Playfair Display, serif' }}>
                  Delivery Information
                </h2>

                <div>
                  <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">Email *</label>
                  <input type="email" value={form.email} onChange={e => updateForm('email', e.target.value)}
                    className={inputClass('email')} placeholder="you@example.com" />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">First name *</label>
                    <input type="text" value={form.firstName} onChange={e => updateForm('firstName', e.target.value)}
                      className={inputClass('firstName')} placeholder="Jane" />
                    {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">Last name *</label>
                    <input type="text" value={form.lastName} onChange={e => updateForm('lastName', e.target.value)}
                      className={inputClass('lastName')} placeholder="Smith" />
                    {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">Phone</label>
                  <input type="tel" value={form.phone} onChange={e => updateForm('phone', e.target.value)}
                    className={inputClass()} placeholder="+1 555 000 0000" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">Country *</label>
                  <select value={form.country} onChange={e => updateForm('country', e.target.value)}
                    className={inputClass('country')}>
                    {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">Address line 1 *</label>
                  <input type="text" value={form.line1} onChange={e => updateForm('line1', e.target.value)}
                    className={inputClass('line1')} placeholder="123 High Street" />
                  {errors.line1 && <p className="text-red-500 text-xs mt-1">{errors.line1}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">Address line 2</label>
                  <input type="text" value={form.line2} onChange={e => updateForm('line2', e.target.value)}
                    className={inputClass()} placeholder="Apt, suite, etc." />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">City *</label>
                    <input type="text" value={form.city} onChange={e => updateForm('city', e.target.value)}
                      className={inputClass('city')} placeholder="London" />
                    {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">
                      {form.country === 'GB' ? 'Postcode' : 'ZIP / Postcode'}
                    </label>
                    <input type="text"
                      value={form.country === 'GB' ? form.postcode : form.zipCode}
                      onChange={e => form.country === 'GB'
                        ? updateForm('postcode', e.target.value)
                        : updateForm('zipCode', e.target.value)}
                      className={inputClass()} placeholder={form.country === 'GB' ? 'SW1A 1AA' : '10001'} />
                  </div>
                </div>

                {form.country === 'GB' && (
                  <div>
                    <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">County</label>
                    <input type="text" value={form.county} onChange={e => updateForm('county', e.target.value)}
                      className={inputClass()} placeholder="Greater London" />
                  </div>
                )}

                {user && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.saveAddress}
                      onChange={e => updateForm('saveAddress', e.target.checked)}
                      className="rounded" />
                    <span className="text-sm text-[hsl(var(--muted-foreground))]">Save this address to my account</span>
                  </label>
                )}

                <button onClick={handleStep1} disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl
                    bg-[hsl(var(--primary))] text-white font-semibold text-sm
                    hover:bg-[hsl(var(--primary)/0.9)] disabled:opacity-60 transition-all">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <>Continue to Shipping <ChevronRight size={16} /></>}
                </button>
              </div>
            )}

            {/* STEP 2: Shipping method */}
            {step === 2 && (
              <div className="bg-white rounded-2xl border border-[hsl(var(--border))] p-6 space-y-4">
                <h2 className="text-lg font-semibold" style={{ fontFamily: 'Playfair Display, serif' }}>
                  Shipping Method
                </h2>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  Delivering to {form.line1}, {form.city}
                </p>

                {[
                  {
                    id: 'STANDARD' as ShippingMethod,
                    label: 'Standard Shipping',
                    detail: '5–10 business days',
                    priceUsd: stdShipUsd,
                    priceGbp: stdShipGbp,
                  },
                  {
                    id: 'EXPRESS' as ShippingMethod,
                    label: 'Express Shipping',
                    detail: '2–3 business days',
                    priceUsd: expShipUsd,
                    priceGbp: expShipGbp,
                  },
                ].map(opt => (
                  <label key={opt.id}
                    className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all
                      ${form.shippingMethod === opt.id
                        ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.04)]'
                        : 'border-[hsl(var(--border))] hover:border-[hsl(var(--primary)/0.4)]'}`}>
                    <div className="flex items-center gap-3">
                      <input type="radio" name="shipping" value={opt.id}
                        checked={form.shippingMethod === opt.id}
                        onChange={() => updateForm('shippingMethod', opt.id)}
                        className="accent-[hsl(var(--primary))]" />
                      <div>
                        <p className="text-sm font-medium">{opt.label}</p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">{opt.detail}</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold">
                      {isGBP
                        ? (opt.priceGbp === 0 ? 'FREE' : `£${opt.priceGbp}`)
                        : (opt.priceUsd === 0 ? 'FREE' : `$${opt.priceUsd}`)}
                    </span>
                  </label>
                ))}

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setStep(1)}
                    className="flex-1 py-3 rounded-xl border border-[hsl(var(--border))] text-sm font-medium
                      hover:bg-[hsl(var(--muted))] transition-all">
                    ← Back
                  </button>
                  <button onClick={handleStep2} disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl
                      bg-[hsl(var(--primary))] text-white font-semibold text-sm
                      hover:bg-[hsl(var(--primary)/0.9)] disabled:opacity-60 transition-all">
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <>Continue to Payment <ChevronRight size={16} /></>}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Payment */}
            {step === 3 && clientSecret && (
              <div className="bg-white rounded-2xl border border-[hsl(var(--border))] p-6 space-y-4">
                <h2 className="text-lg font-semibold" style={{ fontFamily: 'Playfair Display, serif' }}>
                  Payment
                </h2>
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: {
                      theme: 'stripe',
                      variables: {
                        colorPrimary: 'hsl(211, 55%, 25%)',
                        borderRadius: '8px',
                        fontFamily: 'Inter, sans-serif',
                      },
                    },
                  }}>
                  <PaymentForm
                    clientSecret={clientSecret}
                    onSuccess={handlePaymentSuccess}
                    total={isGBP ? (breakdown?.totalGbp ?? totalGbp) : (breakdown?.totalUsd ?? totalUsd)}
                    currency={currency}
                    isGBP={isGBP}
                  />
                </Elements>
                <button onClick={() => setStep(2)}
                  className="w-full py-2.5 rounded-xl border border-[hsl(var(--border))] text-sm font-medium
                    hover:bg-[hsl(var(--muted))] transition-all">
                  ← Back to Shipping
                </button>
              </div>
            )}
          </div>

          {/* Right: Order summary sidebar */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-[hsl(var(--border))] p-5 sticky top-24">
              <h3 className="font-semibold text-sm mb-4 text-[hsl(var(--foreground))]">
                Order Summary ({items.length} {items.length === 1 ? 'item' : 'items'})
              </h3>
              <div className="space-y-3 max-h-60 overflow-y-auto mb-4">
                {items.map(item => (
                  <div key={`${item.productId}-${item.variantId}`} className="flex gap-3 text-sm">
                    <div className="relative w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-[hsl(var(--muted))]">
                      {item.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      )}
                      <span className="absolute -top-1 -right-1 bg-[hsl(var(--primary))] text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium line-clamp-1 text-xs">{item.name}</p>
                      {item.variantLabel && <p className="text-xs text-[hsl(var(--muted-foreground))]">{item.variantLabel}</p>}
                    </div>
                    <span className="font-medium text-xs flex-shrink-0">
                      {isGBP ? `£${(item.priceGbp * item.quantity).toFixed(2)}` : `$${(item.priceUsd * item.quantity).toFixed(2)}`}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-2 text-sm border-t border-[hsl(var(--border))] pt-3">
                <div className="flex justify-between text-[hsl(var(--muted-foreground))]">
                  <span>Subtotal</span><span>{fmt(subtotalUsd, subtotalGbp)}</span>
                </div>
                {appliedDiscount && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount ({appliedDiscount.code})</span>
                    <span>-{fmt(discUsd, discGbp)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[hsl(var(--muted-foreground))]">
                  <span>Shipping</span>
                  <span>{fmt(shippingUsd, shippingGbp) === fmt(0, 0) ? 'FREE' : fmt(shippingUsd, shippingGbp)}</span>
                </div>
                {isGBP && <div className="flex justify-between text-[hsl(var(--muted-foreground))]">
                  <span>VAT (20%)</span><span>£{vatGbp.toFixed(2)}</span>
                </div>}
                <div className="flex justify-between font-bold border-t border-[hsl(var(--border))] pt-2 text-[hsl(var(--foreground))]">
                  <span>Total</span><span>{fmt(totalUsd, totalGbp)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
