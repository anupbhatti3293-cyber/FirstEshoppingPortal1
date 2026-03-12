import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  const session = await getSession(token);

  if (!session) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, email, first_name, last_name, phone, is_verified, created_at')
    .eq('id', session.user.id)
    .single();

  return NextResponse.json({ success: true, data: user });
}
