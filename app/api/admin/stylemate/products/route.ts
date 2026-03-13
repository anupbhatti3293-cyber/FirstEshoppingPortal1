/**
 * GET /api/admin/stylemate/products
 * Returns all products with their StyleMate AI status for the admin dashboard.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole }          from '@/lib/adminAuth';
import { createClient }              from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TENANT_ID = 1;

export async function GET(req: NextRequest) {
  const auth = await requireAdminRole(req);
  if (!auth.success) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status  = searchParams.get('status');  // pending|processing|completed|failed|needs_review
  const page    = Math.max(1, parseInt(searchParams.get('page')  ?? '1'));
  const perPage = Math.min(50, parseInt(searchParams.get('limit') ?? '20'));
  const offset  = (page - 1) * perPage;

  // Fetch products joined with latest AI analysis
  const { data: products, error, count } = await supabaseAdmin
    .from('products')
    .select(`
      id, name, category, quality_score, qa_badge,
      last_ai_updated_at, is_active, created_at,
      product_images ( url, position ),
      ai_product_analysis (
        id, stylemate_status, quality_score,
        ai_title_us, ai_title_uk,
        ai_seo_title_us, ai_seo_title_uk,
        prompt_version, created_at
      )
    `, { count: 'exact' })
    .eq('tenant_id', TENANT_ID)
    .order('created_at', { ascending: false })
    .range(offset, offset + perPage - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Flatten and filter by status if requested
  type ProductRow = {
    id: number;
    name: string;
    category: string;
    quality_score: number | null;
    qa_badge: string | null;
    last_ai_updated_at: string | null;
    is_active: boolean;
    created_at: string;
    product_images: Array<{ url: string; position: number }>;
    ai_product_analysis: Array<{
      id: number;
      stylemate_status: string;
      quality_score: number | null;
      ai_title_us: string | null;
      ai_title_uk: string | null;
      ai_seo_title_us: string | null;
      ai_seo_title_uk: string | null;
      prompt_version: string;
      created_at: string;
    }>;
  };

  const rows = (products as ProductRow[]).map(p => {
    const latestAnalysis = p.ai_product_analysis?.[0] ?? null;
    const aiStatus = latestAnalysis?.stylemate_status ?? 'pending';
    const thumbnail = p.product_images?.find(img => img.position === 0)?.url ?? null;
    return {
      id:               p.id,
      name:             p.name,
      category:         p.category,
      thumbnail,
      qualityScore:     p.quality_score ?? 0,
      qaBadge:          p.qa_badge ?? 'none',
      aiStatus,
      lastOptimised:    p.last_ai_updated_at,
      analysisId:       latestAnalysis?.id ?? null,
      aiTitleUs:        latestAnalysis?.ai_title_us ?? null,
      aiTitleUk:        latestAnalysis?.ai_title_uk ?? null,
      promptVersion:    latestAnalysis?.prompt_version ?? null,
    };
  }).filter(p => !status || p.aiStatus === status);

  // Summary stats
  const allStatuses = (products as ProductRow[]).map(p => p.ai_product_analysis?.[0]?.stylemate_status ?? 'pending');
  const stats = {
    total:       count ?? 0,
    optimised:   allStatuses.filter(s => s === 'completed').length,
    needsReview: allStatuses.filter(s => s === 'needs_review').length,
    failed:      allStatuses.filter(s => s === 'failed').length,
    pending:     allStatuses.filter(s => s === 'pending').length,
    avgQualityScore: products && (products as ProductRow[]).length > 0
      ? Math.round(
          (products as ProductRow[])
            .map(p => p.quality_score ?? 0)
            .reduce((a, b) => a + b, 0) / (products as ProductRow[]).length
        )
      : 0,
  };

  return NextResponse.json({ products: rows, stats, page, perPage, total: count ?? 0 });
}
