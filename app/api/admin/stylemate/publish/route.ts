/**
 * POST /api/admin/stylemate/publish
 * Admin accepts AI content and writes it to the live products table.
 */
import { NextRequest, NextResponse }  from 'next/server';
import { requireAdminRole }           from '@/lib/adminAuth';
import { createClient }               from '@supabase/supabase-js';
import { PublishFieldSchema }         from '@/lib/stylemateSchemas';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TENANT_ID = 1;

export async function POST(req: NextRequest) {
  const auth = await requireAdminRole(req);
  if (!auth.success) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  let parsed;
  try {
    const body = await req.json();
    parsed = PublishFieldSchema.parse(body);
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request', details: String(err) }, { status: 400 });
  }

  const { analysisId, field, market, overrides } = parsed;

  // Fetch the analysis row
  const { data: analysis, error } = await supabaseAdmin
    .from('ai_product_analysis')
    .select('*')
    .eq('id', analysisId)
    .eq('tenant_id', TENANT_ID)
    .single();

  if (error || !analysis) {
    return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
  }

  const productId = analysis.product_id as number;
  const productUpdate: Record<string, unknown> = {};

  // Apply the selected field(s) to the live products table
  if (field === 'title' || field === 'all') {
    if (market === 'US' || market === 'BOTH') {
      productUpdate.name = overrides?.title_us ?? analysis.ai_title_us ?? analysis.ai_title;
    }
    // For UK we store in meta (or a dedicated field if added later)
  }

  if (field === 'description' || field === 'all') {
    if (market === 'US' || market === 'BOTH') {
      productUpdate.description       = overrides?.description_us       ?? analysis.ai_description_us ?? analysis.ai_description;
      productUpdate.short_description = overrides?.short_description_us ?? analysis.ai_short_desc_us  ?? analysis.ai_short_description;
    }
    if (market === 'UK') {
      productUpdate.description       = overrides?.description_uk       ?? analysis.ai_description_uk;
      productUpdate.short_description = overrides?.short_description_uk ?? analysis.ai_short_desc_uk;
    }
  }

  if (field === 'seo' || field === 'all') {
    if (market === 'US' || market === 'BOTH') {
      productUpdate.meta_title       = overrides?.seo_title_us ?? analysis.ai_seo_title_us ?? analysis.ai_seo_title;
      productUpdate.meta_description = overrides?.seo_desc_us  ?? analysis.ai_seo_desc_us  ?? analysis.ai_seo_description;
      productUpdate.tags             = analysis.ai_tags_us ?? analysis.ai_tags ?? [];
    }
    if (market === 'UK') {
      productUpdate.meta_title       = overrides?.seo_title_uk ?? analysis.ai_seo_title_uk;
      productUpdate.meta_description = overrides?.seo_desc_uk  ?? analysis.ai_seo_desc_uk;
      productUpdate.tags             = analysis.ai_tags_uk ?? [];
    }
  }

  if (Object.keys(productUpdate).length === 0) {
    return NextResponse.json({ error: 'No fields to publish' }, { status: 400 });
  }

  const { error: updateError } = await supabaseAdmin
    .from('products')
    .update({ ...productUpdate, last_ai_updated_at: new Date().toISOString() })
    .eq('id', productId)
    .eq('tenant_id', TENANT_ID);

  if (updateError) {
    return NextResponse.json({ error: 'Failed to publish', details: updateError.message }, { status: 500 });
  }

  // Mark analysis as approved
  await supabaseAdmin
    .from('ai_product_analysis')
    .update({ is_qa_verified: true, approved_at: new Date().toISOString(), approved_by_admin_id: auth.adminId })
    .eq('id', analysisId);

  await supabaseAdmin.from('automation_logs').insert({
    tenant_id: TENANT_ID,
    level:     'INFO',
    action:    'STYLEMATE_PUBLISH',
    entity:    'product',
    entity_id: String(productId),
    message:   `Admin published ${field} (${market}) for product ${productId}`,
    metadata:  { analysisId, field, market },
  });

  return NextResponse.json({ success: true, productId, fieldsPublished: Object.keys(productUpdate) });
}
