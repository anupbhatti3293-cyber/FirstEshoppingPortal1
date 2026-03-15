import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdminRole } from '@/lib/adminAuth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TENANT_ID = 1;
const DEFAULTS = {
  min_ai_profit_score: 85,
  min_margin_pct: 40,
  max_shipping_days: 10,
  min_supplier_rating: 4.5,
  auto_publish_enabled: false,
};

export async function GET(request: NextRequest) {
  const auth = await requireAdminRole(request);
  if (!auth.success) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const storeId = request.nextUrl.searchParams.get('store_id') ?? String(TENANT_ID);
  const tenantId = parseInt(storeId, 10) || TENANT_ID;

  const { data, error } = await supabase
    .from('automation_rules')
    .select('*')
    .eq('tenant_id', tenantId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Automation rules fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rules = data ?? {
    tenant_id: tenantId,
    ...DEFAULTS,
  };

  const selectedModel = rules.selected_model ?? 'gemini';
  const { data: cred } = await supabase
    .from('ai_credentials')
    .select('provider_name')
    .eq('store_id', tenantId)
    .eq('provider_name', selectedModel)
    .eq('is_active', true)
    .single();

  return NextResponse.json({
    min_ai_profit_score: rules.min_ai_profit_score ?? DEFAULTS.min_ai_profit_score,
    min_margin_pct: Number(rules.min_margin_pct ?? DEFAULTS.min_margin_pct),
    max_shipping_days: rules.max_shipping_days ?? DEFAULTS.max_shipping_days,
    min_supplier_rating: Number(rules.min_supplier_rating ?? DEFAULTS.min_supplier_rating),
    auto_publish_enabled: rules.auto_publish_enabled ?? DEFAULTS.auto_publish_enabled,
    selected_model: selectedModel,
    has_api_key: !!cred,
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(request);
  if (!auth.success) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const b = body as {
    store_id?: number;
    min_ai_profit_score?: number;
    min_margin_pct?: number;
    max_shipping_days?: number;
    min_supplier_rating?: number;
    auto_publish_enabled?: boolean;
    selected_model?: string;
    api_key?: string;
  };

  const tenantId = b.store_id ?? TENANT_ID;
  const selectedModel = (b.selected_model ?? 'gemini').toLowerCase();
  const payload = {
    tenant_id: tenantId,
    min_ai_profit_score: b.min_ai_profit_score ?? DEFAULTS.min_ai_profit_score,
    min_margin_pct: b.min_margin_pct ?? DEFAULTS.min_margin_pct,
    max_shipping_days: b.max_shipping_days ?? DEFAULTS.max_shipping_days,
    min_supplier_rating: b.min_supplier_rating ?? DEFAULTS.min_supplier_rating,
    auto_publish_enabled: b.auto_publish_enabled ?? false,
    selected_model: selectedModel,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('automation_rules')
    .upsert(payload, { onConflict: 'tenant_id' });

  if (error) {
    console.error('Automation rules upsert error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Save API key to ai_credentials if provided
  if (b.api_key !== undefined && b.api_key !== '') {
    const apiKey = b.api_key.trim();
    if (apiKey) {
      const { error: credErr } = await supabase
        .from('ai_credentials')
        .upsert(
          {
            store_id: tenantId,
            provider_name: selectedModel,
            encrypted_api_key: apiKey,
            is_active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'store_id,provider_name' }
        );
      if (credErr) {
        console.error('AI credentials upsert error:', credErr);
        return NextResponse.json({ error: credErr.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ success: true, rules: payload });
}
