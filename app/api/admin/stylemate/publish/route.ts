import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdminRole } from '@/lib/adminAuth';
import { PublishFieldSchema } from '@/lib/stylemateSchemas';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TENANT_ID = 1;

export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(request);
  if (!auth.success) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = PublishFieldSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { productId, fields, locale } = parsed.data;

  // Fetch AI analysis for this product
  const { data: analysis, error: fetchError } = await supabase
    .from('ai_product_analysis')
    .select('*')
    .eq('product_id', productId)
    .eq('tenant_id', TENANT_ID)
    .eq('stylemate_status', 'completed')
    .single();

  if (fetchError || !analysis) {
    return NextResponse.json(
      { error: 'No completed AI analysis found for this product. Run StyleMate AI first.' },
      { status: 404 }
    );
  }

  // Build the product update payload based on requested fields + locale
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  const useUs = locale === 'us' || locale === 'both';
  const useUk = locale === 'uk' || locale === 'both';

  for (const field of fields) {
    switch (field) {
      case 'title':
        // Use US title as the primary product name (shown globally)
        // UK title stored in ai_product_analysis for locale-aware serving
        if (useUs && analysis.ai_title_us) updates.name = analysis.ai_title_us;
        break;
      case 'description':
        if (useUs && analysis.ai_description_us) updates.description = analysis.ai_description_us;
        break;
      case 'short_description':
        if (useUs && analysis.ai_short_desc_us) updates.short_description = analysis.ai_short_desc_us;
        break;
      case 'seo_title':
        if (useUs && analysis.ai_seo_title_us) updates.meta_title = analysis.ai_seo_title_us;
        break;
      case 'seo_description':
        if (useUs && analysis.ai_seo_desc_us) updates.meta_description = analysis.ai_seo_desc_us;
        break;
      case 'tags':
        if (useUs && analysis.ai_tags_us?.length) updates.tags = analysis.ai_tags_us;
        break;
      case 'quality_score':
        if (analysis.quality_score !== null) updates.quality_score = analysis.quality_score;
        break;
      case 'qa_badge':
        if (analysis.quality_score !== null) {
          const score = analysis.quality_score as number;
          let badge = '';
          if (score >= 85) badge = 'Engineer Tested';
          else if (score >= 70) badge = 'QA Approved';
          else if (score >= 50) badge = 'Verified';
          updates.qa_badge = badge;
        }
        break;
    }
  }

  if (Object.keys(updates).length <= 1) {
    return NextResponse.json({ error: 'No publishable fields found in AI analysis' }, { status: 400 });
  }

  const { error: updateError } = await supabase
    .from('products')
    .update(updates)
    .eq('id', productId)
    .eq('tenant_id', TENANT_ID);

  if (updateError) {
    console.error('Publish error:', updateError);
    return NextResponse.json({ error: 'Failed to publish to product' }, { status: 500 });
  }

  // Mark as published
  await supabase
    .from('ai_product_analysis')
    .update({ approved_at: new Date().toISOString() })
    .eq('product_id', productId)
    .eq('tenant_id', TENANT_ID);

  return NextResponse.json({ success: true, productId, publishedFields: fields });
}
