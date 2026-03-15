import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdminRole } from '@/lib/adminAuth';
import { processSingleProduct } from '@/lib/processSingleProduct';
import { aiOrchestrator, calculateMathScore } from '@/lib/aiOrchestrator';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TENANT_ID = 1;
const SYSTEM_USER_ID = 0;

function extractRating(rawR: unknown): number {
  if (typeof rawR === 'number') return rawR;
  if (rawR && typeof rawR === 'object' && 'rate' in rawR) return Number((rawR as { rate?: number }).rate ?? 0);
  return Number(rawR ?? 0) || 0;
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(request);
  if (!auth.success) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const storeId = (body as { store_id?: number }).store_id ?? TENANT_ID;

  const { data: rules, error: rulesErr } = await supabase
    .from('automation_rules')
    .select('*')
    .eq('tenant_id', storeId)
    .single();

  if (rulesErr && rulesErr.code !== 'PGRST116') {
    return NextResponse.json({ error: rulesErr.message }, { status: 500 });
  }

  const autoEnabled = rules?.auto_publish_enabled ?? false;
  if (!autoEnabled) {
    return NextResponse.json({
      success: true,
      message: 'Auto-publish disabled. No products evaluated.',
      evaluated: 0,
      published: 0,
    });
  }

  const minScore = rules?.min_ai_profit_score ?? 85;
  const minMargin = Number(rules?.min_margin_pct ?? 40);
  const maxShipping = rules?.max_shipping_days ?? 10;
  const minRating = Number(rules?.min_supplier_rating ?? 4.5);

  const { data: candidates, error: fetchErr } = await supabase
    .from('supplier_products')
    .select('id, raw_title, raw_description, supplier_category, estimated_margin_pct, shipping_days_us, raw_rating')
    .eq('tenant_id', storeId)
    .eq('processing_status', 'AI_PROCESSED')
    .eq('status', 'pending_review');

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  const candidatesList = candidates ?? [];
  const results: { id: number; success: boolean; productId?: number; error?: string }[] = [];

  for (const p of candidatesList) {
    const productData = {
      id: p.id,
      raw_title: p.raw_title,
      raw_description: p.raw_description,
      supplier_category: p.supplier_category,
      estimated_margin_pct: p.estimated_margin_pct,
      shipping_days_us: p.shipping_days_us,
      raw_rating: p.raw_rating,
    };

    let aiProfitScore: number;
    try {
      aiProfitScore = await aiOrchestrator(productData, storeId, supabase);
    } catch {
      const margin = Number(p.estimated_margin_pct ?? 0) || 0;
      const shipping = Number(p.shipping_days_us ?? 999) || 999;
      const rating = extractRating(p.raw_rating);
      aiProfitScore = calculateMathScore(margin, shipping, rating);
    }

    await supabase
      .from('supplier_products')
      .update({ ai_profit_score: aiProfitScore })
      .eq('id', p.id)
      .eq('tenant_id', storeId);

    const margin = Number(p.estimated_margin_pct ?? 0) || 0;
    const shipping = p.shipping_days_us ?? 999;
    const rating = extractRating(p.raw_rating);

    const passes =
      aiProfitScore >= minScore && margin >= minMargin && shipping <= maxShipping && rating >= minRating;

    if (!passes) continue;

    const { data: updated, error: updateErr } = await supabase
      .from('supplier_products')
      .update({ processing_status: 'AUTO_PUBLISHING', status: 'auto_publishing' })
      .eq('id', p.id)
      .eq('tenant_id', storeId)
      .eq('status', 'pending_review')
      .select('id')
      .single();

    if (updateErr || !updated) {
      results.push({ id: p.id, success: false, error: updateErr?.message ?? 'Already processing or published' });
      continue;
    }

    const result = await processSingleProduct(supabase, p.id, storeId, SYSTEM_USER_ID, {
      isAutomation: true,
      useAIConfirmed: true,
    });
    results.push({
      id: p.id,
      success: result.success,
      productId: result.productId,
      error: result.error,
    });
  }

  const published = results.filter((r) => r.success).length;
  return NextResponse.json({
    success: true,
    message: `Evaluated ${candidatesList.length} products. Published ${published}.`,
    evaluated: candidatesList.length,
    passed: results.length,
    published,
    results,
  });
}
