/**
 * Lazy-initialised Anthropic client for StyleMate AI.
 * All calls are server-side only — API key never exposed to client.
 */

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL             = 'claude-sonnet-4-6';
const PROMPT_VERSION    = 'v1.0';

export { PROMPT_VERSION };

export interface ClaudeMessage {
  role:    'user' | 'assistant';
  content: string;
}

export interface ClaudeOptions {
  system?:    string;
  maxTokens?: number;
}

/**
 * Call the Anthropic API with automatic retry (exponential backoff).
 * Returns parsed JSON — callers must specify the expected shape via generics.
 */
export async function callClaude<T = unknown>(
  messages:  ClaudeMessage[],
  options:   ClaudeOptions = {},
  retries  = 3
): Promise<T> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }

  const body = {
    model:      MODEL,
    max_tokens: options.maxTokens ?? 1500,
    system:     options.system ?? '',
    messages,
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    if (attempt > 0) {
      // Exponential backoff: 2s, 4s, 8s
      await new Promise(r => setTimeout(r, 2000 * Math.pow(2, attempt - 1)));
    }

    const res = await fetch(ANTHROPIC_API_URL, {
      method:  'POST',
      headers: {
        'Content-Type':      'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key':         apiKey,
      },
      body: JSON.stringify(body),
    });

    if (res.status === 429 || res.status === 529) {
      // Rate limited or overloaded — retry
      lastError = new Error(`Claude API returned ${res.status}`);
      continue;
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Claude API error ${res.status}: ${text}`);
    }

    const data = await res.json() as {
      content: Array<{ type: string; text: string }>;
    };

    const text = data.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('')
      .trim();

    // Strip markdown code fences if present
    const cleaned = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/,      '')
      .replace(/\s*```$/,      '')
      .trim();

    return JSON.parse(cleaned) as T;
  }

  throw lastError ?? new Error('Claude API failed after retries');
}
