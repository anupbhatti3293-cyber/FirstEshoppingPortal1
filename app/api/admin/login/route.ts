import { NextRequest, NextResponse } from 'next/server';
import { createClient }              from '@supabase/supabase-js';
import bcrypt                        from 'bcryptjs';
import { SignJWT }                   from 'jose';
import { checkRateLimit, recordFailedAttempt, clearAttempts, pruneStore } from '@/lib/rateLimit';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

export async function POST(req: NextRequest) {
  pruneStore();

  const ip     = getClientIp(req);
  const check  = checkRateLimit(ip);

  if (!check.allowed) {
    const retryAfterSec = Math.ceil((check.retryAfterMs ?? 0) / 1000);
    return NextResponse.json(
      { error: `Too many failed attempts. Try again in ${Math.ceil(retryAfterSec / 60)} minutes.` },
      {
        status: 429,
        headers: {
          'Retry-After':       String(retryAfterSec),
          'X-RateLimit-Limit': '5',
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
  }

  // Fetch admin user
  const { data: adminUser, error } = await supabaseAdmin
    .from('admin_users')
    .select('id, email, password_hash, role, tenant_id')
    .eq('email', email.toLowerCase().trim())
    .single();

  if (error || !adminUser) {
    recordFailedAttempt(ip);
    // Generic message — don't reveal whether email exists
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const passwordValid = await bcrypt.compare(password, adminUser.password_hash);
  if (!passwordValid) {
    recordFailedAttempt(ip);
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  // Success — clear failed attempts
  clearAttempts(ip);

  // Update last_login
  await supabaseAdmin
    .from('admin_users')
    .update({ last_login: new Date().toISOString() })
    .eq('id', adminUser.id);

  // Sign JWT
  const secret = new TextEncoder().encode(process.env.ADMIN_JWT_SECRET!);
  const token  = await new SignJWT({
    adminId:  adminUser.id,
    email:    adminUser.email,
    role:     adminUser.role,
    tenantId: adminUser.tenant_id,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(secret);

  const response = NextResponse.json({
    success: true,
    admin: {
      id:    adminUser.id,
      email: adminUser.email,
      role:  adminUser.role,
    },
  });

  response.cookies.set('admin-token', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   60 * 60 * 8, // 8 hours
    path:     '/',
  });

  return response;
}
