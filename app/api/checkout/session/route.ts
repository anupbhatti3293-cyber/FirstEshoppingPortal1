import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getSession } from '@/lib/auth';
import { getTenantIdFromRequest } from '@/lib/tenant';

export async function POST(request: NextRequest) {
  const { email, cartSnapshot, step } = await request.json();
  if (!email) return NextResponse.json({ success: false, error: 'Email required' }, { status: 400 });

  const tenantId = getTenantIdFromRequest(request);
  const token = request.cookies.get('auth-token')?.value;
  const session = await getSession(token);

  const { data, error } = await supabaseAdmin
    .from('checkout_sessions')
    .insert({
      tenant_id: tenantId,
      user_id: session?.user.id ?? null,
      email,
      cart_snapshot: cartSnapshot ?? [],
      step_reached: step ?? 1,
    })
    .select('id, session_token')
    .single();

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, data });
}
