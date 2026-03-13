import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { checkRateLimit, recordFailedAttempt, clearAttempts } from '@/lib/rateLimit';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
      request.headers.get('x-real-ip') ??
      'unknown';
    const rateLimitKey = `admin-login:${ip}`;

    // Check rate limit before doing anything else
    const { allowed, retryAfterSeconds } = checkRateLimit(rateLimitKey);
    if (!allowed) {
      return NextResponse.json(
        { error: `Too many failed attempts. Try again in ${Math.ceil((retryAfterSeconds ?? 900) / 60)} minutes.` },
        { status: 429 }
      );
    }

    const body = await request.json() as { email?: string; password?: string };
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Fetch admin user
    const { data: admin, error } = await supabase
      .from('admin_users')
      .select('id, email, password_hash, role, tenant_id')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error || !admin) {
      recordFailedAttempt(rateLimitKey);
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const passwordValid = await bcrypt.compare(password, admin.password_hash);
    if (!passwordValid) {
      recordFailedAttempt(rateLimitKey);
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Clear failed attempts on success
    clearAttempts(rateLimitKey);

    // Update last_login
    await supabase
      .from('admin_users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', admin.id);

    // Sign JWT
    const secret = new TextEncoder().encode(process.env.ADMIN_JWT_SECRET!);
    const token = await new SignJWT({
      adminId: admin.id,
      email: admin.email,
      role: admin.role,
      tenantId: 1,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(secret);

    const response = NextResponse.json({
      success: true,
      admin: { id: admin.id, email: admin.email, role: admin.role },
    });

    response.cookies.set('admin-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('Admin login error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
