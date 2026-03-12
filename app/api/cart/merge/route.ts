import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getSession } from '@/lib/auth';
import { getTenantIdFromRequest } from '@/lib/tenant';
import type { CartLineItem } from '@/types';

export async function POST(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  const session = await getSession(token);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorised' }, { status: 401 });

  const { items }: { items: CartLineItem[] } = await request.json();
  if (!items?.length) return NextResponse.json({ success: true });

  const tenantId = getTenantIdFromRequest(request);

  for (const item of items) {
    const { data: existing } = await supabaseAdmin
      .from('cart_items')
      .select('id, quantity')
      .eq('user_id', session.user.id)
      .eq('product_id', item.productId)
      .is('variant_id', item.variantId ?? null)
      .maybeSingle();

    const newQty = existing ? Math.max(existing.quantity, item.quantity) : item.quantity;

    await supabaseAdmin.from('cart_items').upsert(
      { user_id: session.user.id, product_id: item.productId, variant_id: item.variantId ?? null, quantity: newQty, tenant_id: tenantId },
      { onConflict: 'user_id,product_id,variant_id' }
    );
  }

  return NextResponse.json({ success: true });
}
