'use client';
import { useEffect, useState } from 'react';

interface AbandonedSession {
  id: number;
  email: string;
  cart_snapshot: { name: string; quantity: number; priceUsd: number }[];
  step_reached: number;
  created_at: string;
  recovered_at: string | null;
  abandoned_email_1_sent_at: string | null;
  abandoned_email_2_sent_at: string | null;
}

interface CartStats {
  totalAbandoned: number;
  recoveredCount: number;
  recoveryRate: string;
  abandonedToday: number;
  recoveredRevenue: string;
}

const STEP_LABELS: Record<number, string> = {
  1: 'Step 1 — Contact',
  2: 'Step 2 — Shipping',
  3: 'Step 3 — Payment',
};

export default function AdminAbandonedCartsPage() {
  const [sessions, setSessions] = useState<AbandonedSession[]>([]);
  const [stats, setStats] = useState<CartStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/abandoned-carts?page=${page}`)
      .then(r => r.json())
      .then((data: { sessions: AbandonedSession[]; totalPages: number; stats: CartStats }) => {
        setSessions(data.sessions ?? []);
        setTotalPages(data.totalPages ?? 1);
        setStats(data.stats ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [page]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--color-primary)' }}>Abandoned Carts</h1>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {([
            ['Abandoned Today', stats.abandonedToday],
            ['Total Abandoned', stats.totalAbandoned],
            ['Recovered', stats.recoveredCount],
            ['Recovery Rate', `${stats.recoveryRate}%`],
            ['Revenue Recovered', `$${stats.recoveredRevenue}`],
          ] as [string, string | number][]).map(([label, value]) => (
            <div key={label} className="bg-white rounded-lg p-4 shadow-sm border text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
              <p className="text-2xl font-bold mt-1" style={{ color: 'var(--color-primary)' }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      <p className="text-sm text-gray-500 mb-4">
        Recovery emails are sent automatically: Email 1 after {process.env.NEXT_PUBLIC_ABANDONED_DELAY_LABEL || '60 minutes'},
        Email 2 after 24 hours with a 10% discount code.
      </p>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Email', 'Cart Value', 'Step', 'Started', 'Emails Sent', 'Status'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">Loading…</td></tr>
            ) : sessions.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">No abandoned carts yet</td></tr>
            ) : sessions.map(s => {
              const cartValue = (s.cart_snapshot ?? []).reduce(
                (sum, i) => sum + (i.priceUsd ?? 0) * (i.quantity ?? 1), 0
              );
              const emailsSent = [s.abandoned_email_1_sent_at, s.abandoned_email_2_sent_at].filter(Boolean).length;
              return (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{s.email}</td>
                  <td className="px-4 py-3">${cartValue.toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-500">{STEP_LABELS[s.step_reached] || `Step ${s.step_reached}`}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(s.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      emailsSent === 0 ? 'bg-gray-100 text-gray-500' :
                      emailsSent === 1 ? 'bg-yellow-100 text-yellow-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {emailsSent} / 2
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {s.recovered_at ? (
                      <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700 font-bold">✅ Recovered</span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700">Abandoned</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-sm disabled:opacity-40">← Prev</button>
          <span className="px-4 py-2 text-sm">{page} / {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary text-sm disabled:opacity-40">Next →</button>
        </div>
      )}
    </div>
  );
}
