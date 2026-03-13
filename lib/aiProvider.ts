// ============================================================
// LuxeHaven AI Provider System
// ============================================================
// Plugin-based architecture — add any new AI in ~20 lines.
// Gemini uses the official @google/genai SDK (auto-handles
// API versioning, retries, model updates).
// ============================================================

import { GoogleGenAI } from '@google/genai';

export type AIProvider = 'claude' | 'gemini' | 'openai';

export interface ProviderMeta {
  id: AIProvider;
  name: string;
  company: string;
  model: string;
  envKey: string;
  costPerProduct: string;
  description: string;
  icon: string;
}

// ── Provider registry ───────────────────────────────────────────────
export const PROVIDERS: Record<AIProvider, ProviderMeta> = {
  claude: {
    id: 'claude',
    name: 'Claude Sonnet 4.6',
    company: 'Anthropic',
    model: 'claude-sonnet-4-6',
    envKey: 'ANTHROPIC_API_KEY',
    costPerProduct: '~$0.046 per product',
    description: 'Best for nuanced brand copywriting and tone consistency.',
    icon: '🧠',
  },
  gemini: {
    id: 'gemini',
    name: 'Gemini 2.5 Flash',
    company: 'Google',
    model: 'gemini-2.5-flash',
    envKey: 'GEMINI_API_KEY',
    costPerProduct: '~$0.015 per product',
    description: "Google's latest stable model. Fast, affordable, frontier-class performance.",
    icon: '✨',
  },
  openai: {
    id: 'openai',
    name: 'GPT-4o',
    company: 'OpenAI',
    model: 'gpt-4o',
    envKey: 'OPENAI_API_KEY',
    costPerProduct: '~$0.050 per product',
    description: 'Strong all-rounder. Good choice if you already have a ChatGPT Plus account.',
    icon: '🤖',
  },
};

export function getActiveProvider(): AIProvider {
  const p = process.env.AI_PROVIDER ?? 'gemini';
  if (p in PROVIDERS) return p as AIProvider;
  return 'gemini';
}

export function getProviderMeta(provider?: AIProvider): ProviderMeta {
  return PROVIDERS[provider ?? getActiveProvider()];
}

export function hasKeyConfigured(provider: AIProvider): boolean {
  return !!process.env[PROVIDERS[provider].envKey];
}

// ── Claude (Anthropic) ─────────────────────────────────────────
async function callClaude(system: string, user: string, maxTokens: number): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set in .env.local');

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: PROVIDERS.claude.model,
          max_tokens: maxTokens,
          system,
          messages: [{ role: 'user', content: user }],
        }),
      });
      if (res.status === 529 || res.status === 503) {
        if (attempt < 3) { await sleep(attempt * 10000); continue; }
      }
      if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`);
      const data = await res.json() as { content: Array<{ type: string; text: string }> };
      const block = data.content.find((b) => b.type === 'text');
      if (!block) throw new Error('No text block in Claude response');
      return block.text;
    } catch (err) {
      if (attempt === 3) throw err;
      await sleep(attempt * 5000);
    }
  }
  throw new Error('Claude failed after 3 attempts');
}

// ── Gemini (Google) — uses official @google/genai SDK ──────────────
async function callGemini(system: string, user: string, maxTokens: number): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set in .env.local');

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: PROVIDERS.gemini.model,
        contents: user,
        config: {
          systemInstruction: system,
          maxOutputTokens: maxTokens,
          temperature: 0.7,
        },
      });
      const text = response.text;
      if (!text) throw new Error('No text in Gemini response');
      return text;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Retry on quota/overload errors
      if ((msg.includes('429') || msg.includes('503')) && attempt < 3) {
        await sleep(attempt * 10000);
        continue;
      }
      if (attempt === 3) throw err;
      await sleep(attempt * 5000);
    }
  }
  throw new Error('Gemini failed after 3 attempts');
}

// ── OpenAI (ChatGPT) ──────────────────────────────────────────
async function callOpenAI(system: string, user: string, maxTokens: number): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set in .env.local');

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: PROVIDERS.openai.model,
          max_tokens: maxTokens,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
      });
      if (res.status === 503 || res.status === 429) {
        if (attempt < 3) { await sleep(attempt * 10000); continue; }
      }
      if (!res.ok) throw new Error(`OpenAI API ${res.status}: ${await res.text()}`);
      const data = await res.json() as { choices: Array<{ message: { content: string } }> };
      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new Error('No text in OpenAI response');
      return text;
    } catch (err) {
      if (attempt === 3) throw err;
      await sleep(attempt * 5000);
    }
  }
  throw new Error('OpenAI failed after 3 attempts');
}

// ── Public unified interface ──────────────────────────────────
export async function callAI(
  system: string,
  user: string,
  maxTokens = 1500,
  providerOverride?: AIProvider
): Promise<string> {
  const provider = providerOverride ?? getActiveProvider();
  switch (provider) {
    case 'gemini': return callGemini(system, user, maxTokens);
    case 'openai': return callOpenAI(system, user, maxTokens);
    default:       return callClaude(system, user, maxTokens);
  }
}

export function parseAIJson<T>(raw: string): T {
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error(`Failed to parse AI JSON: ${cleaned.slice(0, 300)}`);
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
