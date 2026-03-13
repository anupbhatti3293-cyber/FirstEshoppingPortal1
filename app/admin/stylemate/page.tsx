'use client';

import { useState, useEffect, useCallback } from 'react';
import { Metadata }   from 'next';

type QaBadge = 'none' | 'verified' | 'qa_approved' | 'engineer_tested';
type AiStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'needs_review';

interface Product {
  id:             number;
  name:           string;
  category:       string;
  thumbnail:      string | null;
  qualityScore:   number;
  qaBadge:        QaBadge;
  aiStatus:       AiStatus;
  lastOptimised:  string | null;
  analysisId:     number | null;
  aiTitleUs:      string | null;
  aiTitleUk:      string | null;
}

interface Stats {
  total:           number;
  optimised:       number;
  needsReview:     number;
  failed:          number;
  pending:         number;
  avgQualityScore: number;
}

interface AnalysisResult {
  analysisId:  number;
  productId:   number;
  title:       { title_us: string; title_uk: string };
  description: { description_us: string; description_uk: string; short_description_us: string; short_description_uk: string };
  seo:         { seo_title_us: string; seo_title_uk: string; seo_desc_us: string; seo_desc_uk: string; tags_us: string[]; tags_uk: string[] };
  quality:     { quality_score: number; qa_badge: string; improvement_suggestions: string[] };
  status:      string;
}

const BADGE_LABELS: Record<QaBadge, string> = {
  none:            'No Badge',
  verified:        'Verified',
  qa_approved:     'QA Approved',
  engineer_tested: 'Engineer Tested',
};

const BADGE_COLOURS: Record<QaBadge, string> = {
  none:            'bg-gray-100 text-gray-500',
  verified:        'bg-blue-100 text-blue-700',
  qa_approved:     'bg-green-100 text-green-700',
  engineer_tested: 'bg-purple-100 text-purple-700',
};

const STATUS_COLOURS: Record<AiStatus, string> = {
  pending:     'bg-gray-100 text-gray-500',
  processing:  'bg-yellow-100 text-yellow-700',
  completed:   'bg-green-100 text-green-700',
  failed:      'bg-red-100 text-red-700',
  needs_review:'bg-orange-100 text-orange-700',
};

export default function StyleMateAIPage() {
  const [products,        setProducts]        = useState<Product[]>([]);
  const [stats,           setStats]           = useState<Stats | null>(null);
  const [loading,         setLoading]         = useState(true);
  const [filterStatus,    setFilterStatus]    = useState<string>('');
  const [runningIds,      setRunningIds]      = useState<Set<number>>(new Set());
  const [selectedResult,  setSelectedResult]  = useState<AnalysisResult | null>(null);
  const [previewMarket,   setPreviewMarket]   = useState<'US' | 'UK'>('US');
  const [publishingId,    setPublishingId]    = useState<number | null>(null);
  const [toast,           setToast]           = useState<string>('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const url = filterStatus
        ? `/api/admin/stylemate/products?status=${filterStatus}`
        : '/api/admin/stylemate/products';
      const res  = await fetch(url);
      const data = await res.json() as { products: Product[]; stats: Stats };
      setProducts(data.products ?? []);
      setStats(data.stats ?? null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const runStyleMate = async (productId: number) => {
    setRunningIds(prev => new Set(prev).add(productId));
    try {
      const res  = await fetch('/api/admin/stylemate/analyse', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ productId, market: 'BOTH' }),
      });
      const data = await res.json() as AnalysisResult & { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Unknown error');
      setSelectedResult(data);
      showToast(`✓ StyleMate AI complete — quality score: ${data.quality.quality_score}/100`);
      await fetchProducts();
    } catch (err) {
      showToast(`✗ Failed: ${String(err)}`);
    } finally {
      setRunningIds(prev => { const s = new Set(prev); s.delete(productId); return s; });
    }
  };

  const publishContent = async (analysisId: number, field: string) => {
    setPublishingId(analysisId);
    try {
      const res  = await fetch('/api/admin/stylemate/publish', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ analysisId, field, market: previewMarket }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Publish failed');
      showToast(`✓ Published ${field} (${previewMarket}) to live store`);
      await fetchProducts();
    } catch (err) {
      showToast(`✗ Publish failed: ${String(err)}`);
    } finally {
      setPublishingId(null);
    }
  };

  const scoreColour = (score: number) =>
    score >= 85 ? 'text-purple-600' :
    score >= 70 ? 'text-green-600'  :
    score >= 50 ? 'text-blue-600'   : 'text-red-500';

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-[#1E3A5F] text-white px-5 py-3 rounded-xl shadow-lg text-sm">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#1E3A5F]" style={{ fontFamily: 'Playfair Display, serif' }}>
          StyleMate AI
        </h1>
        <p className="text-gray-500 mt-1">AI-powered product titles, descriptions, SEO &amp; quality scoring</p>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          {[
            { label: 'Total Products',    value: stats.total },
            { label: 'Optimised',         value: stats.optimised },
            { label: 'Needs Review',      value: stats.needsReview },
            { label: 'Failed',            value: stats.failed },
            { label: 'Pending',           value: stats.pending },
            { label: 'Avg Quality Score', value: `${stats.avgQualityScore}/100` },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-gray-400 text-xs mb-1">{s.label}</p>
              <p className="text-2xl font-bold text-[#1E3A5F]">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {['', 'pending', 'completed', 'needs_review', 'failed'].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
              filterStatus === s
                ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-[#1E3A5F]'
            }`}
          >
            {s === '' ? 'All' : s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </button>
        ))}
      </div>

      {/* Products table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-8">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading products…</div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No products found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Product</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Category</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Quality</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">QA Badge</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">AI Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.thumbnail && (
                        <img src={p.thumbnail} alt={p.name}
                          className="w-10 h-10 rounded-lg object-cover border border-gray-200" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900 line-clamp-1">{p.name}</p>
                        {p.aiTitleUs && (
                          <p className="text-xs text-gray-400 line-clamp-1">AI: {p.aiTitleUs}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 capitalize">{p.category}</td>
                  <td className="px-4 py-3">
                    <span className={`font-bold text-base ${scoreColour(p.qualityScore)}`}>
                      {p.qualityScore > 0 ? `${p.qualityScore}/100` : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      BADGE_COLOURS[p.qaBadge as QaBadge] ?? 'bg-gray-100 text-gray-500'
                    }`}>
                      {BADGE_LABELS[p.qaBadge as QaBadge] ?? p.qaBadge}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      STATUS_COLOURS[p.aiStatus as AiStatus] ?? 'bg-gray-100 text-gray-500'
                    }`}>
                      {p.aiStatus.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => runStyleMate(p.id)}
                        disabled={runningIds.has(p.id)}
                        className="px-3 py-1.5 bg-[#1E3A5F] text-white rounded-lg text-xs font-medium
                                   hover:bg-[#2E86AB] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {runningIds.has(p.id) ? 'Running…' : p.aiStatus === 'completed' ? 'Re-run' : 'Run AI'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Results preview panel */}
      {selectedResult && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-[#1E3A5F]" style={{ fontFamily: 'Playfair Display, serif' }}>
              AI Results — Product #{selectedResult.productId}
            </h2>
            <div className="flex items-center gap-3">
              {/* Market toggle */}
              <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                {(['US', 'UK'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setPreviewMarket(m)}
                    className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                      previewMarket === m
                        ? 'bg-[#1E3A5F] text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >{m}</button>
                ))}
              </div>
              <button onClick={() => setSelectedResult(null)}
                className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>
          </div>

          {/* Quality score */}
          <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-xl">
            <div className="text-center">
              <p className="text-xs text-gray-400 mb-1">Quality Score</p>
              <p className={`text-3xl font-bold ${scoreColour(selectedResult.quality.quality_score)}`}>
                {selectedResult.quality.quality_score}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400 mb-1">QA Badge</p>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                BADGE_COLOURS[selectedResult.quality.qa_badge as QaBadge] ?? 'bg-gray-100 text-gray-500'
              }`}>
                {BADGE_LABELS[selectedResult.quality.qa_badge as QaBadge] ?? selectedResult.quality.qa_badge}
              </span>
            </div>
            {selectedResult.quality.improvement_suggestions.length > 0 && (
              <div className="flex-1">
                <p className="text-xs text-gray-400 mb-1">Suggestions</p>
                <ul className="text-xs text-gray-600 space-y-0.5">
                  {selectedResult.quality.improvement_suggestions.map((s, i) => (
                    <li key={i}>• {s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Content sections */}
          {([
            { label: 'Title',       field: 'title',       content: previewMarket === 'US' ? selectedResult.title.title_us : selectedResult.title.title_uk },
            { label: 'Short Desc',  field: 'description', content: previewMarket === 'US' ? selectedResult.description.short_description_us : selectedResult.description.short_description_uk },
            { label: 'Description', field: 'description', content: previewMarket === 'US' ? selectedResult.description.description_us : selectedResult.description.description_uk },
            { label: 'SEO Title',   field: 'seo',         content: previewMarket === 'US' ? selectedResult.seo.seo_title_us : selectedResult.seo.seo_title_uk },
            { label: 'SEO Desc',    field: 'seo',         content: previewMarket === 'US' ? selectedResult.seo.seo_desc_us : selectedResult.seo.seo_desc_uk },
          ] as const).map(({ label, field, content }) => (
            <div key={label} className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
                <button
                  onClick={() => publishContent(selectedResult.analysisId, field)}
                  disabled={publishingId === selectedResult.analysisId}
                  className="text-xs text-[#2E86AB] hover:text-[#1E3A5F] font-medium transition-colors
                             disabled:opacity-50"
                >
                  {publishingId === selectedResult.analysisId ? 'Publishing…' : `Publish ${label}`}
                </button>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap">
                {content}
              </div>
            </div>
          ))}

          {/* Tags */}
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Tags ({previewMarket})</p>
            <div className="flex flex-wrap gap-2">
              {(previewMarket === 'US' ? selectedResult.seo.tags_us : selectedResult.seo.tags_uk).map(tag => (
                <span key={tag} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">{tag}</span>
              ))}
            </div>
          </div>

          {/* Publish all */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => publishContent(selectedResult.analysisId, 'all')}
              disabled={publishingId === selectedResult.analysisId}
              className="px-6 py-2 bg-[#1E3A5F] text-white rounded-xl text-sm font-medium
                         hover:bg-[#2E86AB] transition-colors disabled:opacity-50"
            >
              {publishingId === selectedResult.analysisId ? 'Publishing…' : `Publish All to Live Store (${previewMarket})`}
            </button>
            <button
              onClick={() => setSelectedResult(null)}
              className="px-6 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
