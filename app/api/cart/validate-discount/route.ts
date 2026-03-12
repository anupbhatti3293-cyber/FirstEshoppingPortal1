import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getSession } from '@/lib/auth';
import { getTenantIdFromRequest } from '@/lib/tenant';

export async function POST(request: NextRequest) {
  const { code, subtotalUsd, subtotalGbp } = await request.json();
  if (!code) return NextResponse.json({ success: false, error: 'Code required' }, { status: 400 });

  const tenantId = getTenantIdFromRequest(request);
  const token = request.cookies.get('auth-token')?.value;
  const session = await getSession(token);

  const { data: discount } = await supabaseAdmin
    .from('discount_codes')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .maybeSingle();

  if (!discount) return NextResponse.json({ success: false, error: 'Invalid discount code' }, { status: 400 });

  const now = new Date();
  if (discount.starts_at && new Date(discount.starts_at) > now)
    return NextResponse.json({ success: false, error: 'This code is not yet active' }, { status: 400 });
  if (discount.expires_at && new Date(discount.expires_at) < now)
    return NextResponse.json({ success: false, error: 'This code has expired' }, { status: 400 });
  if (discount.max_uses !== null && discount.uses_count >= discount.max_uses)
    return NextResponse.json({ success: false, error: 'This code has reached its usage limit' }, { status: 400 });
  if (discount.min_order_usd && subtotalUsd < discount.min_order_usd)
    return NextResponse.json({ success: false, error: `Minimum order of $${discount.min_order_usd} required` }, { status: 400 });

  if (session && discount.per_customer_limit > 0) {
    const { count } = await supabaseAdmin
      .from('discount_redemptions')
      .select('id', { count: 'exact', head: true })
      .eq('discount_code_id', discount.id)
      .eq('user_id', session.user.id);
    if ((count ?? 0) >= discount.per_customer_limit)
      return NextResponse.json({ success: false, error: 'You have already used this code' }, { status: 400 });
  }

  let amountSavedUsd = 0;
  let amountSavedGbp = 0;
  if (discount.discount_type === 'PERCENTAGE') {
    amountSavedUsd = (subtotalUsd * discount.value) / 100;
    amountSavedGbp = (subtotalGbp * discount.value) / 100;
  } else if (discount.discount_type === 'FIXED_AMOUNT') {
    amountSavedUsd = Math.min(discount.value, subtotalUsd);
    amountSavedGbp = Math.min(discount.value * 0.8, subtotalGbp);
  }

  return NextResponse.json({
    success: true,
    data: {
      code: discount.code,
      type: discount.discount_type,
      value: discount.value,
      amountSavedUsd: Number(amountSavedUsd.toFixed(2)),
      amountSavedGbp: Number(amountSavedGbp.toFixed(2)),
    }
  });
}
