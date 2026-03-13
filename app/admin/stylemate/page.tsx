'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Sparkles, CheckCircle, XCircle, Clock, RefreshCw, Upload } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  category: string;
  qualityScore: number | null;
  qaBadge: string | null;
  isActive: boolean;
  image: string | null;
  stylemateStatus: 'not_run' | 'processing' | 'completed' | 'failed';
  analysedAt: string | null;
  publishedAt: string | null;
}

interface Stats {
  total: number;
  analysed: number;
  pending: number;
  failed: number;
  avgQualityScore: number | null;
}

interface AIResult {
  title: { us: string; uk: string };
  description: { us: { full: string; short: string }; uk: { full: string; short: string } };
  seo: {
    us: { metaTitle: string; metaDescription: string; tags: string[] };
    uk: { metaTitle: string; metaDescription: string; tags: string[] };
  };
  quality: { score: number; badge: string; notes?: string };
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; colour: string }> = {
    not_run:    { label: 'Not Run',    colour: 'bg-gray-100 text-gray-600' },
    processing: { label: 'Running…',  colour: 'bg-blue-100 text-blue-700' },
    completed:  { label: 'Done',       colour: 'bg-green-100 text-green-700' },
    failed:     { label: 'Failed',     colour: 'bg-red-100 text-red-700' },
  };
  const s = map[status] ?? map['not_run'];
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.colour}`}>{s.label}</span>
  );
}

function QualityBar({ score }: { score: number | null }) {
  if (score === null) return <span className="text-gray-400 text-sm">—</span>;
  const colour = score >= 85 ? 'bg-green-500' : score >= 70 ? 'bg-blue-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${colour}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-sm font-medium text-gray-700">{score}</span>
    </div>
  );
}

export default function StyleMatePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'failed'>('all');
  const [loading, setLoading] = useState(true);
  const [runningIds, setRunningIds] = useState<Set<number>>(new Set());
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [locale, setLocale] = useState<'us' | 'uk'>('us');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [publishing, setPublishing] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/stylemate/products?filter=${filter}`);
      const data = await res.json() as { products: Product[]; stats: Stats };
      setProducts(data.products ?? []);
      setStats(data.stats ?? null);
    } catch {
      showToast('Failed to load products', 'error');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const runAI = async (product: Product) => {
    setRunningIds((prev) => new Set(prev).add(product.id));
    setSelectedProduct(product);
    setAiResult(null);

    try {
      const res = await fetch('/api/admin/stylemate/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id }),
      });
      const data = await res.json() as { result?: AIResult; error?: string };

      if (!res.ok || !data.result) {
        throw new Error(data.error ?? 'AI analysis failed');
      }

      setAiResult(data.result);
      showToast(`StyleMate AI complete for "${product.name}"`, 'success');
      fetchProducts();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'AI analysis failed', 'error');
    } finally {
      setRunningIds((prev) => { const n = new Set(prev); n.delete(product.id); return n; });
    }
  };

  const publishAll = async () => {
    if (!selectedProduct || !aiResult) return;
    setPublishing(true);
    try {
      const res = await fetch('/api/admin/stylemate/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct.id,
          fields: ['title', 'description', 'short_description', 'seo_title', 'seo_description', 'tags', 'quality_score', 'qa_badge'],
          locale: 'both',
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Publish failed');
      showToast('Published to live product ✓', 'success');
      fetchProducts();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Publish failed', 'error');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#1E3A5F]" style={{ fontFamily: 'Playfair Display, serif' }}>
          StyleMate AI
        </h1>
        <p className="text-gray-500 mt-1">AI-powered product optimisation — titles, descriptions, SEO &amp; quality scores</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Total Products', value: stats?.total ?? '—' },
          { label: 'Analysed', value: stats?.analysed ?? '—' },
          { label: 'Pending', value: stats?.pending ?? '—' },
          { label: 'Failed', value: stats?.failed ?? '—' },
          { label: 'Avg Quality', value: stats?.avgQualityScore !== null && stats?.avgQualityScore !== undefined ? `${stats.avgQualityScore}/100` : '—' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-gray-500 text-xs">{s.label}</p>
            <p className="text-2xl font-bold text-[#1E3A5F] mt-1">{String(s.value)}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-6">
        {/* Product list */}
        <div className="flex-1 min-w-0">
          {/* Filters */}
          <div className="flex gap-2 mb-4">
            {(['all', 'pending', 'completed', 'failed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                  filter === f
                    ? 'bg-[#1E3A5F] text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {f}
              </button>
            ))}
            <button onClick={fetchProducts} className="ml-auto p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
              <RefreshCw size={16} />
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="flex justify-center items-center py-16">
                <Loader2 size={24} className="animate-spin text-[#2E86AB]" />
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Sparkles size={32} className="mx-auto mb-2 opacity-30" />
                <p>No products found</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Product</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Category</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Quality</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => { setSelectedProduct(p); setAiResult(null); }}
                      className={`border-b border-gray-50 cursor-pointer hover:bg-blue-50 transition-colors ${
                        selectedProduct?.id === p.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {p.image && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.image} alt={p.name} className="w-10 h-10 rounded-lg object-cover" />
                          )}
                          <span className="font-medium text-gray-800 line-clamp-1">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 capitalize">{p.category}</td>
                      <td className="px-4 py-3"><QualityBar score={p.qualityScore} /></td>
                      <td className="px-4 py-3"><StatusBadge status={p.stylemateStatus} /></td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); runAI(p); }}
                          disabled={runningIds.has(p.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2E86AB] text-white text-xs font-medium hover:bg-[#1E6A8A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {runningIds.has(p.id) ? (
                            <><Loader2 size={12} className="animate-spin" /> Running</>
                          ) : (
                            <><Sparkles size={12} /> Run AI</>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Results panel */}
        {selectedProduct && (
          <div className="w-96 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 p-4 sticky top-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-[#1E3A5F] text-sm line-clamp-1">{selectedProduct.name}</h2>
                <div className="flex gap-1">
                  {(['us', 'uk'] as const).map((l) => (
                    <button
                      key={l}
                      onClick={() => setLocale(l)}
                      className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                        locale === l ? 'bg-[#1E3A5F] text-white' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {!aiResult && !runningIds.has(selectedProduct.id) && (
                <div className="text-center py-8 text-gray-400">
                  <Sparkles size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Click &ldquo;Run AI&rdquo; to analyse this product</p>
                </div>
              )}

              {runningIds.has(selectedProduct.id) && (
                <div className="text-center py-8">
                  <Loader2 size={28} className="animate-spin text-[#2E86AB] mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Claude is analysing…</p>
                </div>
              )}

              {aiResult && (
                <div className="space-y-4 text-sm">
                  {/* Quality score */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Quality Score</p>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-[#1E3A5F]">{aiResult.quality.score}</span>
                      <span className="text-xs text-gray-400">/100</span>
                      {aiResult.quality.badge !== 'none' && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium capitalize">
                          {aiResult.quality.badge.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <p className="text-xs text-gray-500 mb-1">AI Title ({locale.toUpperCase()})</p>
                    <p className="font-medium text-gray-800">{aiResult.title[locale]}</p>
                  </div>

                  {/* Short description */}
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Short Description ({locale.toUpperCase()})</p>
                    <p className="text-gray-700 leading-relaxed">{aiResult.description[locale].short}</p>
                  </div>

                  {/* SEO */}
                  <div>
                    <p className="text-xs text-gray-500 mb-1">SEO Title ({locale.toUpperCase()})</p>
                    <p className="text-gray-700">{aiResult.seo[locale].metaTitle}</p>
                  </div>

                  {/* Tags */}
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Tags ({locale.toUpperCase()})</p>
                    <div className="flex flex-wrap gap-1">
                      {aiResult.seo[locale].tags.map((tag) => (
                        <span key={tag} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{tag}</span>
                      ))}
                    </div>
                  </div>

                  {/* Publish button */}
                  <button
                    onClick={publishAll}
                    disabled={publishing}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#1E3A5F] text-white font-medium hover:bg-[#16304f] disabled:opacity-50 transition-colors"
                  >
                    {publishing ? (
                      <><Loader2 size={14} className="animate-spin" /> Publishing…</>
                    ) : (
                      <><Upload size={14} /> Publish to Live Product</>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
