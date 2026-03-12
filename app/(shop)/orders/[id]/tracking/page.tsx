'use client';
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { Order, OrderStatusHistory } from '@/types';

const STATUS_STEPS = [
  { key: 'PENDING_PAYMENT', label: 'Order Placed' },
  { key: 'PROCESSING', label: 'Processing' },
  { key: 'SHIPPED', label: 'Shipped' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
  { key: 'DELIVERED', label: 'Delivered' },
] as const;

function getStepIndex(status: string) {
  return STATUS_STEPS.findIndex(s => s.key === status);
}

export default function OrderTrackingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const orderId = params.id as string;
  const token = searchParams.get('token');

  const [order, setOrder] = useState<(Order & { order_status_history: OrderStatusHistory[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId || !token) {
      setError('Invalid tracking link. Please check your email.');
      setLoading(false);
      return;
    }
    fetch(`/api/orders/${orderId}/tracking?token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setOrder(data.order);
      })
      .catch(() => setError('Failed to load tracking information.'))
      .finally(() => setLoading(false));
  }, [orderId, token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-cream)' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-t-transparent" style={{ borderColor: 'var(--color-primary)' }} />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center" style={{ background: 'var(--color-cream)' }}>
        <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-primary)' }}>Tracking Not Found</h1>
        <p className="text-gray-600 mb-6">{error || 'This tracking link is invalid or has expired.'}</p>
        <Link href="/" className="btn-primary">Return to LuxeHaven</Link>
      </div>
    );
  }

  const currentStep = getStepIndex(order.status);
  const isCancelled = order.status === 'CANCELLED' || order.status === 'REFUNDED';

  return (
    <div className="min-h-screen py-12 px-4" style={{ background: 'var(--color-cream)' }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <Link href="/" className="text-2xl font-serif tracking-widest" style={{ color: 'var(--color-primary)' }}>LUXEHAVEN</Link>
          <h1 className="text-xl font-semibold mt-4" style={{ color: 'var(--color-primary)' }}>Order Tracking</h1>
          <p className="text-gray-500 mt-1">Order {order.order_number}</p>
        </div>

        {/* Status Stepper */}
        {!isCancelled && (
          <div className="bg-white rounded-lg p-8 mb-6 shadow-sm">
            <div className="flex items-center justify-between relative">
              {/* Progress bar */}
              <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200 z-0">
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    background: 'var(--color-accent)',
                    width: `${Math.max(0, (currentStep / (STATUS_STEPS.length - 1))) * 100}%`,
                  }}
                />
              </div>
              {STATUS_STEPS.map((step, idx) => {
                const isCompleted = idx <= currentStep;
                const isCurrent = idx === currentStep;
                return (
                  <div key={step.key} className="flex flex-col items-center z-10" style={{ flex: 1 }}>
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all"
                      style={{
                        background: isCompleted ? 'var(--color-accent)' : 'white',
                        borderColor: isCompleted ? 'var(--color-accent)' : '#d1d5db',
                        color: isCompleted ? 'var(--color-primary)' : '#9ca3af',
                        transform: isCurrent ? 'scale(1.2)' : 'scale(1)',
                      }}
                    >
                      {isCompleted ? '✓' : idx + 1}
                    </div>
                    <p className="text-xs mt-2 text-center font-medium" style={{ color: isCompleted ? 'var(--color-primary)' : '#9ca3af' }}>
                      {step.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isCancelled && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6 text-center">
            <p className="text-red-700 font-semibold text-lg">Order {order.status === 'REFUNDED' ? 'Refunded' : 'Cancelled'}</p>
            <p className="text-red-600 text-sm mt-1">If you have questions, contact support@luxehaven.com</p>
          </div>
        )}

        {/* Tracking Details */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
          <h2 className="font-semibold text-lg mb-4" style={{ color: 'var(--color-primary)' }}>Shipment Details</h2>
          {order.tracking_number ? (
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500 text-sm">Carrier</span>
                <span className="font-medium">{order.tracking_carrier || 'Standard Post'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500 text-sm">Tracking Number</span>
                <span className="font-medium font-mono text-sm">{order.tracking_number}</span>
              </div>
              {order.estimated_delivery_date && (
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500 text-sm">Estimated Delivery</span>
                  <span className="font-medium">
                    {new Date(order.estimated_delivery_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' })}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-2">
                <span className="text-gray-500 text-sm">Shipping To</span>
                <span className="font-medium text-right">
                  {order.shipping_address?.city}, {order.shipping_address?.postcode}
                </span>
              </div>
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(`${order.tracking_carrier} ${order.tracking_number} tracking`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary w-full text-center block mt-4"
              >
                Track with {order.tracking_carrier || 'Carrier'} ↗
              </a>
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <p className="text-4xl mb-3">📦</p>
              <p className="font-medium">Your order is being prepared</p>
              <p className="text-sm mt-1">Expected to ship within {order.shipping_method === 'EXPRESS' ? '1–2' : '2–4'} business days</p>
            </div>
          )}
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="font-semibold text-lg mb-4" style={{ color: 'var(--color-primary)' }}>Items in This Order</h2>
          <div className="space-y-3">
            {(order.items ?? []).map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                {item.product_snapshot.image_url && (
                  <img src={item.product_snapshot.image_url} alt={item.product_snapshot.name} className="w-12 h-12 object-cover rounded" />
                )}
                <div className="flex-1">
                  <p className="font-medium text-sm">{item.product_snapshot.name}</p>
                  {item.product_snapshot.variant_label && (
                    <p className="text-xs text-gray-400">{item.product_snapshot.variant_label}</p>
                  )}
                </div>
                <span className="text-sm text-gray-500">×{item.quantity}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-sm text-gray-400 mt-8">
          Questions? <a href="mailto:support@luxehaven.com" className="underline">Contact support</a>
        </p>
      </div>
    </div>
  );
}
