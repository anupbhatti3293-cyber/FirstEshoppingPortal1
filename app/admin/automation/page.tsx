'use client';

import { useState, useEffect } from 'react';

const STORE_ID = 1;

const AI_MODELS = [
  { id: 'gemini', name: 'Gemini 2.5 Flash' },
  { id: 'gpt-4', name: 'GPT-4o' },
  { id: 'claude', name: 'Claude Sonnet' },
] as const;

interface Rules {
  min_ai_profit_score: number;
  min_margin_pct: number;
  max_shipping_days: number;
  min_supplier_rating: number;
  auto_publish_enabled: boolean;
  selected_model: string;
}

interface Status {
  pending_review: number;
  auto_publishing: number;
  published: number;
  failed: number;
}

export default function AutomationPage() {
  const [rules, setRules] = useState<Rules>({
    min_ai_profit_score: 85,
    min_margin_pct: 40,
    max_shipping_days: 10,
    min_supplier_rating: 4.5,
    auto_publish_enabled: false,
    selected_model: 'gemini',
  });
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState<Status | null>(null);
  const [saving, setSaving] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testScore, setTestScore] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchRules();
    fetchStatus();
  }, []);

  async function fetchRules() {
    try {
      const res = await fetch(`/api/v1/automation/rules?store_id=${STORE_ID}`);
      const data = await res.json();
      if (res.ok) {
        setRules({
          min_ai_profit_score: data.min_ai_profit_score ?? 85,
          min_margin_pct: data.min_margin_pct ?? 40,
          max_shipping_days: data.max_shipping_days ?? 10,
          min_supplier_rating: data.min_supplier_rating ?? 4.5,
          auto_publish_enabled: data.auto_publish_enabled ?? false,
          selected_model: data.selected_model ?? 'gemini',
        });
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchStatus() {
    try {
      const res = await fetch(`/api/v1/automation/status?store_id=${STORE_ID}`);
      const data = await res.json();
      if (res.ok) setStatus(data);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const payload: Record<string, unknown> = { store_id: STORE_ID, ...rules };
      if (apiKey) payload.api_key = apiKey;
      const res = await fetch('/api/v1/automation/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Configuration saved.');
      } else {
        setMessage(data.error ?? 'Save failed.');
      }
    } catch (err) {
      setMessage('Request failed.');
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 4000);
    }
  }

  async function handleTestModel() {
    setTesting(true);
    setTestScore(null);
    setMessage(null);
    try {
      const res = await fetch('/api/v1/automation/test-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: STORE_ID,
          model: rules.selected_model,
          api_key: apiKey || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setTestScore(data.market_appeal_score ?? 0);
        setMessage(data.message ?? `Market Appeal: ${data.market_appeal_score}/10`);
      } else {
        setMessage(data.error ?? 'Test failed.');
      }
    } catch {
      setMessage('Test request failed.');
    } finally {
      setTesting(false);
      setTimeout(() => { setMessage(null); setTestScore(null); }, 6000);
    }
  }

  async function handleEvaluate() {
    setEvaluating(true);
    setMessage(null);
    try {
      const res = await fetch('/api/v1/automation/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: STORE_ID }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message ?? 'Evaluation complete.');
        fetchStatus();
      } else {
        setMessage(data.error ?? 'Evaluation failed.');
      }
    } catch (err) {
      setMessage('Request failed.');
    } finally {
      setEvaluating(false);
      setTimeout(() => setMessage(null), 5000);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-[#1E3A5F] mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
        Zero-Touch Automation
      </h1>
      <p className="text-gray-500 mb-8">
        Configure auto-publish rules. Products meeting thresholds are published without manual approval.
      </p>

      {message && (
        <div className="mb-6 p-4 bg-green-100 text-green-800 rounded-lg">{message}</div>
      )}

      <div className="space-y-8">
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-[#1E3A5F] mb-4">Automation Toggle</h2>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={rules.auto_publish_enabled}
              onChange={(e) => setRules((r) => ({ ...r, auto_publish_enabled: e.target.checked }))}
              className="w-5 h-5 rounded"
            />
            <span>Enable Auto Publish</span>
          </label>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-[#1E3A5F] mb-4">AI Model & Credentials</h2>
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Active Model</label>
              <select
                value={rules.selected_model}
                onChange={(e) => setRules((r) => ({ ...r, selected_model: e.target.value }))}
                className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg"
              >
                {AI_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Provider API Key</label>
              <input
                type="password"
                placeholder="Enter API key (saved securely)"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg"
                autoComplete="off"
              />
              <p className="text-xs text-gray-500 mt-1">Leave blank to keep existing key. Enter new key to update.</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleTestModel}
                disabled={testing}
                className="bg-amber-100 hover:bg-amber-200 text-amber-800 px-4 py-2 rounded-lg font-medium disabled:opacity-50"
              >
                {testing ? 'Testing...' : 'Test Model'}
              </button>
              {testScore !== null && (
                <span className="text-lg font-semibold text-[#1E3A5F]">Market Appeal: {testScore}/10</span>
              )}
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-[#1E3A5F] mb-4">Rule Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min AI Profit Score</label>
              <input
                type="number"
                min={0}
                max={100}
                value={rules.min_ai_profit_score}
                onChange={(e) => setRules((r) => ({ ...r, min_ai_profit_score: parseInt(e.target.value, 10) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Margin %</label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={rules.min_margin_pct}
                onChange={(e) => setRules((r) => ({ ...r, min_margin_pct: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Shipping Days</label>
              <input
                type="number"
                min={1}
                max={90}
                value={rules.max_shipping_days}
                onChange={(e) => setRules((r) => ({ ...r, max_shipping_days: parseInt(e.target.value, 10) || 10 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Supplier Rating</label>
              <input
                type="number"
                min={0}
                max={5}
                step={0.1}
                value={rules.min_supplier_rating}
                onChange={(e) => setRules((r) => ({ ...r, min_supplier_rating: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-6 bg-[#2E86AB] hover:bg-[#1E3A5F] text-white px-6 py-2.5 rounded-lg font-medium disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-[#1E3A5F] mb-4">Automation Status</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-amber-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-amber-700">{status?.pending_review ?? '—'}</div>
              <div className="text-sm text-amber-600">Pending Review</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-700">{status?.auto_publishing ?? '—'}</div>
              <div className="text-sm text-blue-600">Auto Publishing</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-700">{status?.published ?? '—'}</div>
              <div className="text-sm text-green-600">Published</div>
            </div>
            <div className="bg-red-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-700">{status?.failed ?? '—'}</div>
              <div className="text-sm text-red-600">Failed</div>
            </div>
          </div>
          <button
            onClick={handleEvaluate}
            disabled={evaluating}
            className="bg-[#F4A261] hover:bg-[#e8914a] text-[#1A1A2E] px-6 py-2.5 rounded-lg font-medium disabled:opacity-50"
          >
            {evaluating ? 'Evaluating...' : 'Run Evaluation Now'}
          </button>
        </section>
      </div>
    </div>
  );
}
