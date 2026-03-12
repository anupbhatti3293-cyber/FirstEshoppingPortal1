'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/authContext';

type OrderStatus = 'PENDING_PAYMENT' | 'PROCESSING' | 'SHIPPED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';

interface CustomerOrder {
  id: number;
  order_number: string;
  order_token: string;
  status: OrderStatus;
  currency: string;
  total_usd: number;
  total_gbp: number;
  created_at: string;
  shipping_method: string;
  tracking_number: string | null;
  order_items: {
    id: number;
    quantity: number;
    product_snapshot: { name: string; image_url: string | null; variant_label: string | null };
  }[];
}

const STATUS_COLOURS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'bg-yellow-100 text-yellow-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  SHIPPED: 'bg-purple-100 text-purple-800',
  OUT_FOR_DELIVERY: 'bg-indigo-100 text-indigo-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
  REFUNDED: 'bg-red-100 text-red-700',
  PARTIALLY_REFUNDED: 'bg-orange-100 text-orange-700',
};

export default function AccountOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    fetch('/api/orders')
      .then(r => r.json())
      .then((data: { orders: CustomerOrder[] }) => { setOrders(data.orders ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-cream)' }}>
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please log in to view your orders.</p>
          <Link href="/login" className="btn-primary">Log In</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4" style={{ background: 'var(--color-cream)' }}>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>My Orders</h1>
          <Link href="/account" className="text-sm text-gray-500 hover:underline">← Back to Account</Link>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading your orders…</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg shadow-sm">
            <p className="text-5xl mb-4">🛍️</p>
            <p className="text-gray-500 mb-4">You haven't placed any orders yet.</p>
            <Link href="/products" className="btn-primary">Start Shopping</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <div key={order.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                {/* Order Header */}
                <div
                  className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                >
                  <div>
                    <p className="font-mono font-bold" style={{ color: 'var(--color-primary)' }}>{order.order_number}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_COLOURS[order.status]}`}>
                      {order.status.replace('_', ' ')}
                    </span>
                    <p className="font-bold">
                      {order.currency === 'GBP' ? `£${order.total_gbp.toFixed(2)}` : `$${order.total_usd.toFixed(2)}`}
                    </p>
                    <span className="text-gray-400">{expandedId === order.id ? '▲' : '▼'}</span>
                  </div>
                </div>

                {/* Expanded Order Details */}
                {expandedId === order.id && (
                  <div className="border-t border-gray-100 p-5">
                    <div className="space-y-3 mb-4">
                      {order.order_items.map(item => (
                        <div key={item.id} className="flex items-center gap-3">
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
                    <div className="flex gap-3">
                      <Link
                        href={`/orders/${order.id}/tracking?token=${order.order_token}`}
                        className="btn-primary text-sm flex-1 text-center"
                      >
                        📦 Track Order
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
