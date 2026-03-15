import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdminRole } from '@/lib/adminAuth';
import { getMarketAppealScore } from '@/lib/aiOrchestrator';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SAMPLE_PRODUCT = {
  raw_title: 'Premium Wireless Bluetooth Earbuds with Noise Cancellation',
  raw_description: 'High-quality wireless earbuds with active noise cancellation, 24hr battery life.',
  supplier_category: 'electronics',
  estimated_margin_pct: 45,
  shipping_days_us: 7,
  supplier_rating: 4.5,
};

export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(request);
  if (!auth.success) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const b = body as { store_id?: number; model?: string; api_key?: string; product_data?: unknown };
  const storeId = b.store_id ?? 1;
  const model = (b.model ?? 'gemini').toLowerCase();
  let apiKey = b.api_key?.trim();

  if (!apiKey) {
    const { data: cred } = await supabase
      .from('ai_credentials')
      .select('encrypted_api_key')
      .eq('store_id', storeId)
      .eq('provider_name', model)
      .eq('is_active', true)
      .single();
    apiKey = cred?.encrypted_api_key ?? null;
  }

  if (!apiKey) {
    return NextResponse.json({ error: 'API key required. Enter key above and save, or provide for test.' }, { status: 400 });
  }

  try {
    const score = await getMarketAppealScore(productData, model, apiKey);
    return NextResponse.json({
      success: true,
      market_appeal_score: score,
      model,
      message: `Market Appeal Score: ${score}/10`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg, market_appeal_score: 0 }, { status: 500 });
  }
}
