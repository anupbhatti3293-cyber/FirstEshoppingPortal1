import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdminRole } from '@/lib/adminAuth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TENANT_ID = 1;

export async function GET(request: NextRequest) {
  const auth = await requireAdminRole(request);
  if (!auth.success) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const filter = searchParams.get('filter') ?? 'all'; // all | pending | completed | failed
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  // Fetch products with their AI analysis status
  let query = supabase
    .from('products')
    .select(`
      id, name, category, quality_score, qa_badge, is_active,
      product_images(url),
      ai_product_analysis!left(stylemate_status, quality_score, approved_at, created_at)
    `)
    .eq('tenant_id', TENANT_ID)
    .order('id', { ascending: false })
    .range(offset, offset + pageSize - 1);

  const { data: products, error, count } = await query;

  if (error) {
    console.error('StyleMate products fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }

  // Map and filter by status
  const mapped = (products ?? []).map((p) => {
    const analysis = Array.isArray(p.ai_product_analysis)
      ? p.ai_product_analysis[0]
      : p.ai_product_analysis;
    const status = analysis?.stylemate_status ?? 'not_run';
    return {
      id: p.id,
      name: p.name,
      category: p.category,
      qualityScore: p.quality_score ?? analysis?.quality_score ?? null,
      qaBadge: p.qa_badge ?? null,
      isActive: p.is_active,
      image: Array.isArray(p.product_images) ? p.product_images[0]?.url ?? null : null,
      stylemateStatus: status,
      analysedAt: analysis?.created_at ?? null,
      publishedAt: analysis?.approved_at ?? null,
    };
  });

  const filtered =
    filter === 'all'
      ? mapped
      : mapped.filter((p) => {
          if (filter === 'pending') return p.stylemateStatus === 'not_run';
          if (filter === 'completed') return p.stylemateStatus === 'completed';
          if (filter === 'failed') return p.stylemateStatus === 'failed';
          return true;
        });

  // Stats
  const stats = {
    total: mapped.length,
    analysed: mapped.filter((p) => p.stylemateStatus === 'completed').length,
    pending: mapped.filter((p) => p.stylemateStatus === 'not_run').length,
    failed: mapped.filter((p) => p.stylemateStatus === 'failed').length,
    avgQualityScore:
      mapped.filter((p) => p.qualityScore !== null).length > 0
        ? Math.round(
            mapped.filter((p) => p.qualityScore !== null).reduce((s, p) => s + (p.qualityScore ?? 0), 0) /
            mapped.filter((p) => p.qualityScore !== null).length
          )
        : null,
  };

  return NextResponse.json({ products: filtered, stats, page, pageSize });
}
