import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getTenantIdFromRequest } from '@/lib/tenant';

// GET /api/admin/discounts
export async function GET(request: NextRequest) {
  const authResult = await requireAdminRole(request);
  if (!authResult.success) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tenantId = getTenantIdFromRequest(request);

  const { data: codes, error } = await supabaseAdmin
    .from('discount_codes')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: 'Failed to fetch codes' }, { status: 500 });

  // Fetch redemption history for each code
  const { data: redemptions } = await supabaseAdmin
    .from('discount_redemptions')
    .select('discount_code_id, amount_saved_usd, amount_saved_gbp, redeemed_at, guest_email, user_id')
    .eq('tenant_id', tenantId)
    .order('redeemed_at', { ascending: false })
    .limit(500);

  return NextResponse.json({ codes, redemptions: redemptions ?? [] });
}

// POST /api/admin/discounts — Create discount code
export async function POST(request: NextRequest) {
  const authResult = await requireAdminRole(request);
  if (!authResult.success) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tenantId = getTenantIdFromRequest(request);
  const body = await request.json() as {
    code?: string;
    discount_type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING';
    value: number;
    min_order_usd?: number;
    min_order_gbp?: number;
    max_uses?: number;
    per_customer_limit?: number;
    starts_at?: string;
    expires_at?: string;
    auto_generate?: boolean;
  };

  // Auto-generate code suffix if requested
  let code = body.code?.toUpperCase().trim();
  if (body.auto_generate || !code) {
    const suffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    code = code ? `${code}-${suffix}` : `LH-${suffix}`;
  }

  // Check uniqueness
  const { data: existing } = await supabaseAdmin
    .from('discount_codes')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('code', code)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: `Code ${code} already exists` }, { status: 409 });
  }

  const { data: newCode, error } = await supabaseAdmin
    .from('discount_codes')
    .insert({
      tenant_id: tenantId,
      code,
      discount_type: body.discount_type,
      value: body.value,
      min_order_usd: body.min_order_usd ?? null,
      min_order_gbp: body.min_order_gbp ?? null,
      max_uses: body.max_uses ?? null,
      per_customer_limit: body.per_customer_limit ?? 1,
      starts_at: body.starts_at ?? null,
      expires_at: body.expires_at ?? null,
      is_active: true,
      uses_count: 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Failed to create code' }, { status: 500 });

  return NextResponse.json({ code: newCode }, { status: 201 });
}
