// Unified AI provider — supports Claude (Anthropic) and Gemini (Google)
// Provider is selected via NEXT_PUBLIC_AI_PROVIDER env var or admin settings override
// NEVER import this in client components

export type AIProvider = 'claude' | 'gemini';

function getActiveProvider(): AIProvider {
  const p = process.env.AI_PROVIDER ?? 'claude';
  if (p === 'gemini') return 'gemini';
  return 'claude';
}

// ── Claude (Anthropic) ────────────────────────────────────────────────
async function callClaude(system: string, user: string, maxTokens: number): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');

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
          model: 'claude-sonnet-4-6',
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

// ── Gemini (Google) ──────────────────────────────────────────────────
async function callGemini(system: string, user: string, maxTokens: number): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

  const model = 'gemini-1.5-pro';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: user }] }],
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature: 0.7,
          },
        }),
      });

      if (res.status === 503 || res.status === 429) {
        if (attempt < 3) { await sleep(attempt * 10000); continue; }
      }
      if (!res.ok) throw new Error(`Gemini API ${res.status}: ${await res.text()}`);

      const data = await res.json() as {
        candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
      };
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('No text in Gemini response');
      return text;
    } catch (err) {
      if (attempt === 3) throw err;
      await sleep(attempt * 5000);
    }
  }
  throw new Error('Gemini failed after 3 attempts');
}

// ── Public unified interface ────────────────────────────────────────────

export async function callAI(
  system: string,
  user: string,
  maxTokens = 1500,
  providerOverride?: AIProvider
): Promise<string> {
  const provider = providerOverride ?? getActiveProvider();
  if (provider === 'gemini') return callGemini(system, user, maxTokens);
  return callClaude(system, user, maxTokens);
}

export function parseAIJson<T>(raw: string): T {
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error(`Failed to parse AI JSON: ${cleaned.slice(0, 200)}`);
  }
}

export function getProviderName(provider?: AIProvider): string {
  return (provider ?? getActiveProvider()) === 'gemini'
    ? 'gemini-1.5-pro'
    : 'claude-sonnet-4-6';
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
