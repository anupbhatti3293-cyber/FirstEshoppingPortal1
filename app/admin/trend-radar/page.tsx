'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface StagingProduct {
  id: number;
  raw_title: string;
  raw_description: string;
  raw_images: string[];
  raw_rating: number;
  cost_price: number;
  suggested_retail_price: number;
  estimated_margin: number;
  ai_profit_score: number;
  shipping_speed_days: number;
  status: string;
  category: string;
}

const STORE_ID = 1;
const USER_ID = 1;

export default function TrendRadarPage() {
  const [products, setProducts] = useState<StagingProduct[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/products/staging?store_id=${STORE_ID}`);
      const data = await res.json();
      if (Array.isArray(data)) setProducts(data);
      else setProducts([]);
    } catch (err) {
      console.error(err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  function toggleSelection(id: number) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  async function handleBulkApprove() {
    if (selectedIds.size === 0) return;
    setIsProcessing(true);
    setNotification(null);
    try {
      const res = await fetch('/api/v1/products/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_ids: Array.from(selectedIds),
          store_id: STORE_ID,
          user_id: USER_ID,
        }),
      });
      const result = await res.json();
      if (res.ok && result.status === 'success') {
        setNotification(result.message ?? `${selectedIds.size} products queued.`);
        setProducts((prev) => prev.filter((p) => !selectedIds.has(p.id)));
        setSelectedIds(new Set());
      } else {
        setNotification(result.error ?? 'Approval failed.');
      }
    } catch (err) {
      console.error(err);
      setNotification('Request failed.');
    } finally {
      setIsProcessing(false);
      setTimeout(() => setNotification(null), 5000);
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#1E3A5F]" style={{ fontFamily: 'Playfair Display, serif' }}>
            AI Trend Radar
          </h1>
          <p className="text-gray-500 mt-1">Review and approve supplier products from the pipeline.</p>
        </div>
        <button
          onClick={handleBulkApprove}
          disabled={isProcessing || selectedIds.size === 0}
          className="bg-[#2E86AB] hover:bg-[#1E3A5F] disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
        >
          {isProcessing ? 'Processing...' : `Approve (${selectedIds.size})`}
        </button>
      </div>

      {notification && (
        <div className="mb-4 p-4 bg-green-100 text-green-800 rounded-lg">{notification}</div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500">No products pending review.</p>
          <p className="text-sm text-gray-400 mt-2">Run the Python pipeline to fetch and stage new products.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="w-12 px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === products.length && products.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedIds(new Set(products.map((p) => p.id)));
                      else setSelectedIds(new Set());
                    }}
                    className="rounded"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Product</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Category</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Quality</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Margin</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Shipping</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(p.id)}
                      onChange={() => toggleSelection(p.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                        {p.raw_images?.[0] ? (
                          <Image
                            src={p.raw_images[0]}
                            alt=""
                            width={48}
                            height={48}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">—</div>
                        )}
                      </div>
                      <span className="font-medium text-gray-900 line-clamp-2">{p.raw_title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{p.category}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#2E86AB] rounded-full"
                          style={{ width: `${Math.min(100, p.ai_profit_score)}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{p.ai_profit_score}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{p.estimated_margin}%</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{p.shipping_speed_days}d</td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full">
                      Pending
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
