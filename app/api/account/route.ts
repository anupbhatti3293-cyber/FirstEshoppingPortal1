import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getSession } from '@/lib/auth';

// PATCH — update profile
export async function PATCH(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  const session = await getSession(token);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorised' }, { status: 401 });

  const body = await request.json();
  const allowed = ['first_name', 'last_name', 'phone'];
  const updates: Record<string, string> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', session.user.id)
    .select('id, email, first_name, last_name, phone')
    .single();

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, data });
}

// DELETE — delete account (GDPR)
export async function DELETE(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  const session = await getSession(token);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorised' }, { status: 401 });

  // Anonymise rather than hard delete (preserve order history integrity)
  const { error } = await supabaseAdmin
    .from('users')
    .update({
      email: `deleted_${session.user.id}@deleted.invalid`,
      password_hash: 'DELETED',
      first_name: null,
      last_name: null,
      phone: null,
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', session.user.id);

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  const response = NextResponse.json({ success: true });
  response.cookies.set('auth-token', '', { maxAge: 0, path: '/' });
  return response;
}
