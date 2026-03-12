import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  const session = await getSession(token);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorised' }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from('user_addresses')
    .select('*')
    .eq('user_id', session.user.id)
    .order('is_default', { ascending: false });

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, data });
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  const session = await getSession(token);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorised' }, { status: 401 });

  const body = await request.json();

  // If new address is default, unset existing defaults
  if (body.is_default) {
    await supabaseAdmin
      .from('user_addresses')
      .update({ is_default: false })
      .eq('user_id', session.user.id);
  }

  const { data, error } = await supabaseAdmin
    .from('user_addresses')
    .insert({ ...body, user_id: session.user.id, tenant_id: session.user.tenantId })
    .select()
    .single();

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, data });
}
