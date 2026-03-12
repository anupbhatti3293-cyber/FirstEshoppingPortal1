'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

type OrderStatus = 'PENDING_PAYMENT' | 'PROCESSING' | 'SHIPPED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';

interface AdminOrder {
  id: number;
  order_number: string;
  order_token: string;
  status: OrderStatus;
  currency: string;
  total_usd: number;
  total_gbp: number;
  created_at: string;
  guest_email: string | null;
  user_id: number | null;
  tracking_number: string | null;
  tracking_carrier: string | null;
  stripe_payment_intent_id: string | null;
  order_items: { quantity: number; product_snapshot: { name: string; image_url: string | null } }[];
}

interface Stats {
  totalRevenue: string;
  todayRevenue: string;
  totalOrders: number;
  todayOrders: number;
  aov: string;
  abandonedCartsToday: number;
  recoveryRate: string;
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

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [refundModal, setRefundModal] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundLoading, setRefundLoading] = useState(false);
  const [trackingInput, setTrackingInput] = useState('');
  const [carrierInput, setCarrierInput] = useState('');
  const [statusInput, setStatusInput] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      ...(search && { search }),
      ...(statusFilter && { status: statusFilter }),
    });
    const res = await fetch(`/api/admin/orders?${params}`);
    const data = await res.json() as { orders: AdminOrder[]; totalPages: number; stats: Stats };
    setOrders(data.orders ?? []);
    setTotalPages(data.totalPages ?? 1);
    setStats(data.stats ?? null);
    setLoading(false);
  }, [page, search, statusFilter]);

  useEffect(() => { void fetchOrders(); }, [fetchOrders]);

  const handleExportCsv = () => {
    window.open('/api/admin/orders?export=csv', '_blank');
  };

  const handleUpdateOrder = async () => {
    if (!selectedOrder) return;
    const body: Record<string, string> = {};
    if (statusInput) body.status = statusInput;
    if (trackingInput) body.tracking_number = trackingInput;
    if (carrierInput) body.tracking_carrier = carrierInput;
    const res = await fetch(`/api/admin/orders/${selectedOrder.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setActionMsg('✅ Order updated successfully');
      void fetchOrders();
      setTimeout(() => setActionMsg(''), 3000);
    }
  };

  const handleRefund = async () => {
    if (!selectedOrder || !refundAmount || !refundReason) return;
    setRefundLoading(true);
    const res = await fetch(`/api/admin/orders/${selectedOrder.id}/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: parseFloat(refundAmount),
        reason: refundReason,
        currency: selectedOrder.currency,
      }),
    });
    const data = await res.json() as { success?: boolean; error?: string };
    setRefundLoading(false);
    if (data.success) {
      setActionMsg(`✅ Refund of ${selectedOrder.currency === 'GBP' ? '£' : '$'}${refundAmount} issued`);
      setRefundModal(false);
      void fetchOrders();
    } else {
      setActionMsg(`❌ ${data.error}`);
    }
    setTimeout(() => setActionMsg(''), 5000);
  };

  const handleSendToSupplier = async (orderId: number) => {
    const res = await fetch(`/api/admin/orders/${orderId}/fulfil`, { method: 'POST' });
    const data = await res.json() as { success?: boolean; error?: string; supplier?: string };
    setActionMsg(data.success ? `✅ Sent to ${data.supplier}` : `❌ ${data.error}`);
    setTimeout(() => setActionMsg(''), 5000);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>Orders</h1>
        <div className="flex gap-2">
          <Link href="/admin/discounts" className="btn-secondary text-sm">Discounts</Link>
          <Link href="/admin/abandoned-carts" className="btn-secondary text-sm">Abandoned Carts</Link>
          <button onClick={handleExportCsv} className="btn-secondary text-sm">Export CSV</button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
          {([
            ['Today Revenue', `$${stats.todayRevenue}`],
            ['Total Revenue', `$${stats.totalRevenue}`],
            ['Orders Today', stats.todayOrders],
            ['Total Orders', stats.totalOrders],
            ['AOV', `$${stats.aov}`],
            ['Abandoned Today', stats.abandonedCartsToday],
            ['Recovery Rate', `${stats.recoveryRate}%`],
          ] as [string, string | number][]).map(([label, value]) => (
            <div key={label} className="bg-white rounded-lg p-4 shadow-sm border">
              <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
              <p className="text-xl font-bold mt-1" style={{ color: 'var(--color-primary)' }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {actionMsg && (
        <div className="mb-4 p-3 rounded-lg bg-blue-50 text-blue-800 text-sm">{actionMsg}</div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by order # or email…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="border rounded px-3 py-2 text-sm flex-1"
        />
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="border rounded px-3 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          {Object.keys(STATUS_COLOURS).map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Order', 'Date', 'Customer', 'Items', 'Total', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">Loading orders…</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">No orders found</td></tr>
            ) : orders.map(order => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono font-medium">{order.order_number}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(order.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-gray-600">{order.guest_email ?? `User #${order.user_id}`}</td>
                <td className="px-4 py-3">{order.order_items?.reduce((s, i) => s + i.quantity, 0) ?? 0}</td>
                <td className="px-4 py-3 font-semibold">
                  {order.currency === 'GBP' ? `£${order.total_gbp.toFixed(2)}` : `$${order.total_usd.toFixed(2)}`}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_COLOURS[order.status]}`}>
                    {order.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedOrder(order);
                        setStatusInput(order.status);
                        setTrackingInput(order.tracking_number ?? '');
                        setCarrierInput(order.tracking_carrier ?? '');
                      }}
                      className="text-xs text-blue-600 hover:underline"
                    >Edit</button>
                    <button
                      onClick={() => { setSelectedOrder(order); setRefundModal(true); }}
                      className="text-xs text-red-600 hover:underline"
                    >Refund</button>
                    <button
                      onClick={() => handleSendToSupplier(order.id)}
                      className="text-xs text-green-600 hover:underline"
                    >Fulfil</button>
                    <Link
                      href={`/orders/${order.id}/tracking?token=${order.order_token}`}
                      className="text-xs text-purple-600 hover:underline"
                      target="_blank"
                    >Track</Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-sm disabled:opacity-40">← Prev</button>
          <span className="px-4 py-2 text-sm text-gray-600">{page} / {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary text-sm disabled:opacity-40">Next →</button>
        </div>
      )}

      {/* Edit Order Modal */}
      {selectedOrder && !refundModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--color-primary)' }}>Update Order {selectedOrder.order_number}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select value={statusInput} onChange={e => setStatusInput(e.target.value)} className="w-full border rounded px-3 py-2">
                  {Object.keys(STATUS_COLOURS).map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tracking Number</label>
                <input value={trackingInput} onChange={e => setTrackingInput(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="e.g. JD123456789GB" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Carrier</label>
                <input value={carrierInput} onChange={e => setCarrierInput(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="e.g. Royal Mail, FedEx" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleUpdateOrder} className="btn-primary flex-1">Save Changes</button>
              <button onClick={() => setSelectedOrder(null)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {selectedOrder && refundModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--color-primary)' }}>Issue Refund</h2>
            <p className="text-sm text-gray-500 mb-4">Order {selectedOrder.order_number} · {selectedOrder.currency}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Refund Amount ({selectedOrder.currency === 'GBP' ? '£' : '$'})</label>
                <input
                  type="number"
                  value={refundAmount}
                  onChange={e => setRefundAmount(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  placeholder="e.g. 29.99"
                  step="0.01"
                  min="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Reason (required)</label>
                <textarea
                  value={refundReason}
                  onChange={e => setRefundReason(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  rows={2}
                  placeholder="e.g. Customer request — item not as described"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleRefund} disabled={refundLoading || !refundAmount || !refundReason} className="btn-primary flex-1 disabled:opacity-50">
                {refundLoading ? 'Processing…' : 'Issue Refund'}
              </button>
              <button onClick={() => { setRefundModal(false); setSelectedOrder(null); }} className="btn-secondary flex-1">Cancel</button>
            </div>
            <p className="text-xs text-gray-400 mt-3">UK Consumer Rights Act 2015 — 14-day right to cancel. Refund processed via Stripe.</p>
          </div>
        </div>
      )}
    </div>
  );
}
