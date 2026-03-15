/**
 * Phase 2.5: AI Orchestration Layer (TypeScript mirror of api/ai_factory.py)
 * Enterprise-grade Math Score + AI Market Appeal. Multi-tenant by store_id.
 */

import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

const PROVIDER_MODELS: Record<string, string> = {
  gemini: 'gemini-2.5-flash',
  'gpt-4': 'gpt-4o',
  openai: 'gpt-4o',
  claude: 'claude-sonnet-4-6',
};

export interface ProductData {
  raw_title?: string;
  title?: string;
  raw_description?: string;
  description?: string;
  supplier_category?: string;
  category?: string;
  estimated_margin_pct?: number;
  shipping_days_us?: number;
  supplier_rating?: number;
  raw_rating?: number | { rate?: number };
}

/**
 * Enterprise-grade Math Score (Architect-Approved)
 * - Margin: Penalize low-margin (<25%)
 * - Shipping: Kill switch for >12 days
 * - Rating: Exponential weighting
 */
export function calculateMathScore(
  estimatedMarginPct: number,
  shippingDaysUs: number,
  supplierRating: number
): number {
  const marginScore = Math.max(0, (estimatedMarginPct - 25) * 1.33);
  const shippingScore = shippingDaysUs > 12 ? 0 : ((12 - shippingDaysUs) / 12) * 100;
  const ratingScore = Math.pow(supplierRating / 5, 2) * 100;
  return Math.round((0.5 * marginScore + 0.3 * shippingScore + 0.2 * ratingScore) * 100) / 100;
}

function extractRating(r: unknown): number {
  if (typeof r === 'number') return r;
  if (r && typeof r === 'object' && 'rate' in r) return Number((r as { rate?: number }).rate ?? 0);
  return Number(r ?? 0) || 0;
}

/**
 * Call AI provider for Market Appeal score (0-10). Uses provided apiKey.
 */
export async function getMarketAppealScore(
  productData: ProductData,
  modelName: string,
  apiKey: string
): Promise<number> {
  const name = (modelName || 'gemini').toLowerCase();
  if (name === 'gemini') {
    return getGeminiMarketAppeal(productData, apiKey);
  }
  if (name === 'openai' || name === 'gpt-4') {
    return getOpenAIMarketAppeal(productData, apiKey);
  }
  if (name === 'claude') {
    return getClaudeMarketAppeal(productData, apiKey);
  }
  return 0;
}

async function getGeminiMarketAppeal(productData: ProductData, apiKey: string): Promise<number> {
  const ai = new GoogleGenAI({ apiKey });
  const title = productData.raw_title ?? productData.title ?? 'Unknown';
  const desc = productData.raw_description ?? productData.description ?? '';
  const category = productData.supplier_category ?? productData.category ?? '';
  const margin = productData.estimated_margin_pct ?? 0;
  const shipping = productData.shipping_days_us ?? 0;
  const rating = extractRating(productData.supplier_rating ?? productData.raw_rating);

  const prompt = `You are an e-commerce market analyst. Rate the market appeal of this product on a scale of 0 to 10.
Consider: title clarity, category fit, margin potential, shipping speed, and supplier reputation.

Product:
- Title: ${title}
- Category: ${category}
- Description: ${(desc as string).slice(0, 300) || 'N/A'}
- Margin: ${margin}%
- Shipping: ${shipping} days
- Supplier Rating: ${rating}/5

Respond with ONLY a single number between 0 and 10 (e.g. 7.5). No other text.`;

  try {
    const response = await ai.models.generateContent({
      model: PROVIDER_MODELS.gemini ?? 'gemini-2.5-flash',
      contents: prompt,
      config: { maxOutputTokens: 32, temperature: 0.3 },
    });
    const text = (response.text ?? '').trim().replace(',', '.');
    const score = parseFloat(text) || 0;
    return Math.max(0, Math.min(10, score));
  } catch {
    return 0;
  }
}

async function getOpenAIMarketAppeal(productData: ProductData, apiKey: string): Promise<number> {
  const title = productData.raw_title ?? productData.title ?? 'Unknown';
  const desc = productData.raw_description ?? productData.description ?? '';
  const category = productData.supplier_category ?? productData.category ?? '';
  const margin = productData.estimated_margin_pct ?? 0;
  const shipping = productData.shipping_days_us ?? 0;
  const rating = extractRating(productData.supplier_rating ?? productData.raw_rating);

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: `Rate market appeal 0-10 for: ${title} | ${category} | ${(desc as string).slice(0, 200)} | Margin ${margin}% | ${shipping}d | Rating ${rating}/5. Reply with ONLY a number.`,
        },
      ],
      max_tokens: 16,
      temperature: 0.3,
    }),
  });
  if (!res.ok) return 0;
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = data.choices?.[0]?.message?.content?.trim() ?? '';
  const score = parseFloat(text.replace(/[^0-9.]/g, '')) || 0;
  return Math.max(0, Math.min(10, score));
}

async function getClaudeMarketAppeal(productData: ProductData, apiKey: string): Promise<number> {
  const title = productData.raw_title ?? productData.title ?? 'Unknown';
  const desc = productData.raw_description ?? productData.description ?? '';
  const category = productData.supplier_category ?? productData.category ?? '';
  const margin = productData.estimated_margin_pct ?? 0;
  const shipping = productData.shipping_days_us ?? 0;
  const rating = extractRating(productData.supplier_rating ?? productData.raw_rating);

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 16,
      messages: [
        {
          role: 'user',
          content: `Rate market appeal 0-10 for: ${title} | ${category} | ${(desc as string).slice(0, 200)} | Margin ${margin}% | ${shipping}d | Rating ${rating}/5. Reply with ONLY a number.`,
        },
      ],
    }),
  });
  if (!res.ok) return 0;
  const data = (await res.json()) as { content?: Array<{ text?: string }> };
  const text = data.content?.[0]?.text?.trim() ?? '';
  const score = parseFloat(text.replace(/[^0-9.]/g, '')) || 0;
  return Math.max(0, Math.min(10, score));
}

/**
 * AI Orchestrator: 70% math + 30% AI market appeal.
 * Graceful fallback: Math Score only if AI fails.
 */
export async function aiOrchestrator(
  productData: ProductData & { id?: number },
  storeId: number,
  supabase: ReturnType<typeof createClient>,
  apiKeyOverride?: string | null
): Promise<number> {
  const margin = Number(productData.estimated_margin_pct ?? 0) || 0;
  const shipping = Number(productData.shipping_days_us ?? 999) || 999;
  const rating = extractRating(productData.supplier_rating ?? productData.raw_rating);

  const mathScore = calculateMathScore(margin, shipping, rating);

  let marketAppealScaled = 0;
  let modelName = 'gemini';
  let apiKey = apiKeyOverride;

  if (!apiKey) {
    const { data: rules } = await supabase
      .from('automation_rules')
      .select('selected_model')
      .eq('tenant_id', storeId)
      .single();
    modelName = (rules?.selected_model as string) || 'gemini';

    const { data: cred } = await supabase
      .from('ai_credentials')
      .select('encrypted_api_key')
      .eq('store_id', storeId)
      .eq('provider_name', modelName)
      .eq('is_active', true)
      .single();
    apiKey = cred?.encrypted_api_key ?? null;
  } else {
    const { data: rules } = await supabase
      .from('automation_rules')
      .select('selected_model')
      .eq('tenant_id', storeId)
      .single();
    modelName = (rules?.selected_model as string) || 'gemini';
  }

  if (apiKey) {
    try {
      const appeal = await getMarketAppealScore(productData as ProductData, modelName, apiKey);
      marketAppealScaled = appeal * 10;
    } catch {
      /* fallback to math only */
    }
  }

  const aiProfitScore = Math.round((0.7 * mathScore + 0.3 * marketAppealScaled) * 100) / 100;
  return aiProfitScore;
}
