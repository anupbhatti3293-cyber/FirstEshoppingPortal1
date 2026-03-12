import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { hashPassword, createToken } from '@/lib/auth';
import { getTenantIdFromRequest } from '@/lib/tenant';

export async function POST(request: NextRequest) {
  try {
    const { email, password, firstName, lastName } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password are required' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ success: false, error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request);

    // Check if user already exists
    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .eq('tenant_id', tenantId)
      .single();

    if (existing) {
      return NextResponse.json({ success: false, error: 'An account with this email already exists' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .insert({
        tenant_id: tenantId,
        email: email.toLowerCase(),
        password_hash: passwordHash,
        first_name: firstName || null,
        last_name: lastName || null,
        is_active: true,
        is_verified: false,
      })
      .select('id, email, first_name, last_name, tenant_id')
      .single();

    if (error || !user) {
      console.error('Register error:', error);
      return NextResponse.json({ success: false, error: 'Failed to create account' }, { status: 500 });
    }

    const token = await createToken({
      id: String(user.id),
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      tenantId: user.tenant_id,
    });

    const response = NextResponse.json({
      success: true,
      data: { email: user.email, firstName: user.first_name, lastName: user.last_name },
    });

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('Register error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
