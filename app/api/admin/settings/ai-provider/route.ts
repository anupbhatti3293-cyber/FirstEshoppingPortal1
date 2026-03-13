import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdminRole } from '@/lib/adminAuth';
import { z } from 'zod';
import { PROVIDERS, type AIProvider, hasKeyConfigured, getActiveProvider } from '@/lib/aiProvider';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TENANT_ID = 1;

const UpdateSchema = z.object({
  provider: z.enum(['claude', 'gemini', 'openai']),
});

export async function GET(request: NextRequest) {
  const auth = await requireAdminRole(request);
  if (!auth.success) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('tenant_id', TENANT_ID)
    .eq('key', 'ai_provider')
    .single();

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: 'Failed to fetch setting' }, { status: 500 });
  }

  const provider: AIProvider = (data?.value as AIProvider) ?? getActiveProvider();

  // Return all providers with their key status
  const providers = Object.values(PROVIDERS).map((p) => ({
    ...p,
    hasKey: hasKeyConfigured(p.id),
  }));

  return NextResponse.json({ provider, providers });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(request);
  if (!auth.success) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { provider } = parsed.data;

  if (!hasKeyConfigured(provider as AIProvider)) {
    const meta = PROVIDERS[provider as AIProvider];
    return NextResponse.json(
      { error: `${meta.envKey} is not configured in .env.local` },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from('settings')
    .upsert(
      { tenant_id: TENANT_ID, key: 'ai_provider', value: provider },
      { onConflict: 'tenant_id,key' }
    );

  if (error) return NextResponse.json({ error: 'Failed to save setting' }, { status: 500 });

  return NextResponse.json({ success: true, provider });
}
