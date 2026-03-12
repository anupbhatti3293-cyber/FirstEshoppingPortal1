import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getTenantIdFromRequest } from '@/lib/tenant';

// PATCH /api/admin/discounts/[id] — Update or deactivate
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdminRole(request);
  if (!authResult.success) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tenantId = getTenantIdFromRequest(request);
  const codeId = parseInt(params.id);
  const body = await request.json() as Record<string, unknown>;

  // Only allow safe fields to be updated
  const allowed: (keyof typeof body)[] = [
    'is_active', 'value', 'max_uses', 'per_customer_limit',
    'expires_at', 'starts_at', 'min_order_usd', 'min_order_gbp',
  ];
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  const { data: updated, error } = await supabaseAdmin
    .from('discount_codes')
    .update(updates)
    .eq('id', codeId)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Failed to update code' }, { status: 500 });

  return NextResponse.json({ code: updated });
}
