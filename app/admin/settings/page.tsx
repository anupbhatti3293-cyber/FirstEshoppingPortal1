'use client';

import { useState, useEffect } from 'react';
import { Loader2, CheckCircle, XCircle, Cpu, Zap } from 'lucide-react';

type Provider = 'claude' | 'gemini';

interface ProviderStatus {
  provider: Provider;
  hasClaudeKey: boolean;
  hasGeminiKey: boolean;
}

export default function SettingsPage() {
  const [status, setStatus] = useState<ProviderStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    fetch('/api/admin/settings/ai-provider')
      .then((r) => r.json())
      .then((d) => setStatus(d as ProviderStatus))
      .catch(() => showToast('Failed to load settings', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const switchProvider = async (provider: Provider) => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings/ai-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to save');
      setStatus((prev) => prev ? { ...prev, provider } : prev);
      showToast(`Switched to ${provider === 'claude' ? 'Claude (Anthropic)' : 'Gemini (Google)'}`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const providers = [
    {
      id: 'claude' as Provider,
      name: 'Claude Sonnet 4.6',
      company: 'Anthropic',
      envKey: 'ANTHROPIC_API_KEY',
      hasKey: status?.hasClaudeKey ?? false,
      description: 'Best for nuanced brand copywriting and tone consistency.',
      cost: '~$0.046 per product',
      icon: '🧠',
    },
    {
      id: 'gemini' as Provider,
      name: 'Gemini 1.5 Pro',
      company: 'Google',
      envKey: 'GEMINI_API_KEY',
      hasKey: status?.hasGeminiKey ?? false,
      description: 'Slightly cheaper output costs. Great if you already have a Google AI account.',
      cost: '~$0.042 per product',
      icon: '✨',
    },
  ];

  return (
    <div className="p-6 max-w-3xl">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {toast.msg}
        </div>
      )}

      <h1 className="text-3xl font-bold text-[#1E3A5F] mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
        Settings
      </h1>
      <p className="text-gray-500 mb-8">Configure your LuxeHaven admin preferences.</p>

      {/* AI Provider Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Cpu size={18} className="text-[#2E86AB]" />
          <h2 className="font-semibold text-[#1E3A5F]">StyleMate AI Provider</h2>
        </div>
        <p className="text-gray-500 text-sm mb-6">
          Choose which AI model powers your product optimisation. Both produce excellent results — switch anytime.
        </p>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 size={24} className="animate-spin text-[#2E86AB]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {providers.map((p) => {
              const isActive = status?.provider === p.id;
              const canActivate = p.hasKey;
              return (
                <div
                  key={p.id}
                  className={`rounded-xl border-2 p-5 transition-all ${
                    isActive
                      ? 'border-[#2E86AB] bg-blue-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="text-2xl">{p.icon}</span>
                      <p className="font-semibold text-[#1E3A5F] mt-1">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.company}</p>
                    </div>
                    {isActive && (
                      <span className="px-2 py-0.5 bg-[#2E86AB] text-white rounded-full text-xs font-medium">
                        Active
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 mb-3">{p.description}</p>

                  <div className="flex items-center gap-1.5 mb-1">
                    <Zap size={12} className="text-amber-500" />
                    <span className="text-xs text-gray-500">{p.cost}</span>
                  </div>

                  {/* API Key status */}
                  <div className="flex items-center gap-1.5 mb-4">
                    {p.hasKey ? (
                      <><CheckCircle size={12} className="text-green-500" />
                      <span className="text-xs text-green-600">{p.envKey} configured</span></>
                    ) : (
                      <><XCircle size={12} className="text-red-400" />
                      <span className="text-xs text-red-500">{p.envKey} not set in .env.local</span></>
                    )}
                  </div>

                  <button
                    onClick={() => switchProvider(p.id)}
                    disabled={isActive || !canActivate || saving}
                    className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[#2E86AB] text-white cursor-default'
                        : canActivate
                        ? 'bg-[#1E3A5F] text-white hover:bg-[#16304f]'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {saving ? <Loader2 size={14} className="animate-spin mx-auto" /> :
                      isActive ? 'Currently Active' :
                      !canActivate ? 'Add API Key First' :
                      `Switch to ${p.name}`}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-700">
            <strong>To activate a provider:</strong> add its API key to your <code>.env.local</code> file and restart the dev server.
            Both keys can coexist — the active provider is used for all new StyleMate AI runs.
          </p>
        </div>
      </div>
    </div>
  );
}
