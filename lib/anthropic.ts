// Anthropic Claude API client — server-side only
// NEVER import this in client components

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaudeResponse {
  content: Array<{ type: string; text: string }>;
  usage: { input_tokens: number; output_tokens: number };
}

export async function callClaude(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 1500
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');

  const messages: ClaudeMessage[] = [{ role: 'user', content: userMessage }];

  // Exponential backoff retry: 3 attempts
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: maxTokens,
          system: systemPrompt,
          messages,
        }),
      });

      if (response.status === 529 || response.status === 503) {
        // Overloaded — wait and retry
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, attempt * 10000));
          continue;
        }
      }

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Claude API error ${response.status}: ${errText}`);
      }

      const data = (await response.json()) as ClaudeResponse;
      const textBlock = data.content.find((b) => b.type === 'text');
      if (!textBlock) throw new Error('No text content in Claude response');

      return textBlock.text;
    } catch (err) {
      if (attempt === 3) throw err;
      await new Promise((r) => setTimeout(r, attempt * 5000));
    }
  }

  throw new Error('Claude API failed after 3 attempts');
}

export function parseClaudeJson<T>(raw: string): T {
  // Strip markdown code fences if Claude wraps in ```json
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error(`Failed to parse Claude JSON response: ${cleaned.slice(0, 200)}`);
  }
}
