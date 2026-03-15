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
  if (!auth.success) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const storeId = request.nextUrl.searchParams.get('store_id') ?? String(TENANT_ID);
  const tenantId = parseInt(storeId, 10) || TENANT_ID;

  const { data, error } = await supabase
    .from('supplier_products')
    .select('processing_status, status')
    .eq('tenant_id', tenantId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const counts = {
    pending_review: 0,
    auto_publishing: 0,
    published: 0,
    failed: 0,
  };

  for (const row of data ?? []) {
    const s = row.status ?? (row.processing_status === 'AI_PROCESSED' ? 'pending_review' : row.processing_status === 'AUTO_PUBLISHING' ? 'auto_publishing' : row.processing_status === 'LIVE' ? 'published' : row.processing_status === 'REJECTED' ? 'failed' : null);
    if (s === 'pending_review') counts.pending_review++;
    else if (s === 'auto_publishing') counts.auto_publishing++;
    else if (s === 'published') counts.published++;
    else if (s === 'failed') counts.failed++;
  }

  return NextResponse.json(counts);
}
