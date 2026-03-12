'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle, Package, Loader2, Mail, ArrowRight } from 'lucide-react';
import type { Order } from '@/types';

export function OrderConfirmationClient({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrder() {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        if (res.ok) {
          const { data } = await res.json();
          setOrder(data);
        }
      } finally {
        setLoading(false);
      }
    }
    if (orderId !== 'pending') fetchOrder();
    else setLoading(false);
  }, [orderId]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-[hsl(var(--primary))]" size={32} />
    </div>
  );

  const email = order?.guest_email ?? '';
  const isGBP = order?.currency === 'GBP';

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full text-center space-y-6">

        {/* Success icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle size={40} className="text-green-600" strokeWidth={1.5} />
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-bold text-[hsl(var(--foreground))]"
            style={{ fontFamily: 'Playfair Display, serif' }}>
            Order Confirmed!
          </h1>
          <p className="text-[hsl(var(--muted-foreground))] mt-2">
            Thank you for shopping with LuxeHaven.
          </p>
        </div>

        {order ? (
          <div className="bg-white rounded-2xl border border-[hsl(var(--border))] p-6 text-left space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Order number</p>
                <p className="font-bold text-lg text-[hsl(var(--foreground))]">{order.order_number}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Total paid</p>
                <p className="font-bold text-lg text-[hsl(var(--foreground))]">
                  {isGBP ? `£${order.total_gbp}` : `$${order.total_usd}`}
                </p>
              </div>
            </div>

            {/* Order items */}
            {order.items && order.items.length > 0 && (
              <div className="space-y-2 border-t border-[hsl(var(--border))] pt-4">
                {order.items.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-[hsl(var(--foreground))]">
                      {item.product_snapshot.name}
                      {item.product_snapshot.variant_label && ` — ${item.product_snapshot.variant_label}`}
                      {item.quantity > 1 && ` × ${item.quantity}`}
                    </span>
                    <span className="font-medium">
                      {isGBP ? `£${item.total_price_gbp}` : `$${item.total_price_usd}`}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Status */}
            <div className="bg-[hsl(var(--muted))] rounded-xl p-3 flex items-center gap-3">
              <Package size={18} className="text-[hsl(var(--primary))] flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-[hsl(var(--foreground))]">
                  {order.shipping_method === 'EXPRESS' ? 'Express shipping' : 'Standard shipping'} — 
                  {order.shipping_method === 'EXPRESS' ? ' 2–3 business days' : ' 5–10 business days'}
                </p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  {(order.shipping_address as { line1?: string; city?: string })?.line1}, {(order.shipping_address as { city?: string })?.city}
                </p>
              </div>
            </div>

            {email && (
              <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
                <Mail size={14} />
                <span>Confirmation sent to <strong>{email}</strong></span>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[hsl(var(--border))] p-6">
            <p className="text-[hsl(var(--muted-foreground))] text-sm">
              Your payment was successful. Your order is being processed and you&apos;ll receive a confirmation email shortly.
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/products"
            className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl
              bg-[hsl(var(--primary))] text-white font-medium text-sm hover:bg-[hsl(var(--primary)/0.9)] transition-all">
            Continue Shopping <ArrowRight size={15} />
          </Link>
          {order && (
            <Link href={`/account?tab=orders`}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl
                border border-[hsl(var(--border))] font-medium text-sm hover:bg-[hsl(var(--muted))] transition-all">
              View My Orders
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
