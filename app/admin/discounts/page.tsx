'use client';
import { useEffect, useState } from 'react';

interface DiscountCode {
  id: number;
  code: string;
  discount_type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING';
  value: number;
  uses_count: number;
  max_uses: number | null;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

export default function AdminDiscountsPage() {
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [msg, setMsg] = useState('');

  // Create form state
  const [formCode, setFormCode] = useState('');
  const [formType, setFormType] = useState<'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING'>('PERCENTAGE');
  const [formValue, setFormValue] = useState('');
  const [formMaxUses, setFormMaxUses] = useState('');
  const [formExpiry, setFormExpiry] = useState('');
  const [formAutoGen, setFormAutoGen] = useState(false);
  const [formMinOrderUsd, setFormMinOrderUsd] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchCodes = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/discounts');
    const data = await res.json() as { codes: DiscountCode[] };
    setCodes(data.codes ?? []);
    setLoading(false);
  };

  useEffect(() => { void fetchCodes(); }, []);

  const handleCreate = async () => {
    if (formType !== 'FREE_SHIPPING' && !formValue) return;
    setCreating(true);
    const res = await fetch('/api/admin/discounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: formCode || undefined,
        discount_type: formType,
        value: formType === 'FREE_SHIPPING' ? 0 : parseFloat(formValue),
        max_uses: formMaxUses ? parseInt(formMaxUses) : undefined,
        expires_at: formExpiry || undefined,
        min_order_usd: formMinOrderUsd ? parseFloat(formMinOrderUsd) : undefined,
        auto_generate: formAutoGen,
      }),
    });
    const data = await res.json() as { code?: DiscountCode; error?: string };
    setCreating(false);
    if (data.error) {
      setMsg(`❌ ${data.error}`);
    } else {
      setMsg(`✅ Created: ${data.code?.code}`);
      setShowCreate(false);
      void fetchCodes();
    }
    setTimeout(() => setMsg(''), 5000);
  };

  const handleToggle = async (id: number, isActive: boolean) => {
    await fetch(`/api/admin/discounts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !isActive }),
    });
    void fetchCodes();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>Discount Codes</h1>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary">
          {showCreate ? 'Cancel' : '+ Create Code'}
        </button>
      </div>

      {msg && <div className="mb-4 p-3 rounded bg-blue-50 text-blue-800 text-sm">{msg}</div>}

      {/* Create Form */}
      {showCreate && (
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border">
          <h2 className="font-semibold mb-4" style={{ color: 'var(--color-primary)' }}>New Discount Code</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Code Prefix (optional)</label>
              <div className="flex gap-2">
                <input
                  value={formCode}
                  onChange={e => setFormCode(e.target.value.toUpperCase())}
                  className="flex-1 border rounded px-3 py-2 text-sm"
                  placeholder="e.g. SUMMER"
                />
                <label className="flex items-center gap-1 text-sm text-gray-500 cursor-pointer">
                  <input type="checkbox" checked={formAutoGen} onChange={e => setFormAutoGen(e.target.checked)} />
                  Auto-suffix
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select value={formType} onChange={e => setFormType(e.target.value as typeof formType)} className="w-full border rounded px-3 py-2 text-sm">
                <option value="PERCENTAGE">Percentage %</option>
                <option value="FIXED_AMOUNT">Fixed Amount $</option>
                <option value="FREE_SHIPPING">Free Shipping</option>
              </select>
            </div>
            {formType !== 'FREE_SHIPPING' && (
              <div>
                <label className="block text-sm font-medium mb-1">{formType === 'PERCENTAGE' ? 'Percentage (e.g. 10)' : 'Amount (e.g. 5.00)'}</label>
                <input type="number" value={formValue} onChange={e => setFormValue(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Max Uses (blank = unlimited)</label>
              <input type="number" value={formMaxUses} onChange={e => setFormMaxUses(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Min Order (USD, optional)</label>
              <input type="number" value={formMinOrderUsd} onChange={e => setFormMinOrderUsd(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" placeholder="e.g. 50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Expiry Date (optional)</label>
              <input type="datetime-local" value={formExpiry} onChange={e => setFormExpiry(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
            </div>
          </div>
          <button onClick={handleCreate} disabled={creating} className="btn-primary mt-4 disabled:opacity-50">
            {creating ? 'Creating…' : 'Create Code'}
          </button>
        </div>
      )}

      {/* Codes Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Code', 'Type', 'Value', 'Uses', 'Expires', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">Loading…</td></tr>
            ) : codes.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">No discount codes yet</td></tr>
            ) : codes.map(code => (
              <tr key={code.id} className={`hover:bg-gray-50 ${!code.is_active ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3 font-mono font-bold">{code.code}</td>
                <td className="px-4 py-3 text-gray-500">{code.discount_type.replace('_', ' ')}</td>
                <td className="px-4 py-3 font-semibold">
                  {code.discount_type === 'PERCENTAGE' ? `${code.value}%` :
                   code.discount_type === 'FIXED_AMOUNT' ? `$${code.value.toFixed(2)}` : 'Free Ship'}
                </td>
                <td className="px-4 py-3">{code.uses_count}{code.max_uses ? ` / ${code.max_uses}` : ''}</td>
                <td className="px-4 py-3 text-gray-500">
                  {code.expires_at ? new Date(code.expires_at).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    code.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {code.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleToggle(code.id, code.is_active)}
                    className={`text-xs ${code.is_active ? 'text-red-600' : 'text-green-600'} hover:underline`}
                  >
                    {code.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
