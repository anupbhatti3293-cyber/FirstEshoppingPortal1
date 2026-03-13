import { SignJWT, jwtVerify } from 'jose';
import type { NextRequest } from 'next/server';

export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER';

export interface AdminUserSession {
  id: number;
  email: string;
  role: AdminRole;
  tenantId: number;
}

export interface AdminSession {
  admin: AdminUserSession;
  expires: string;
}

function getSecretKey(): Uint8Array {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) {
    throw new Error('ADMIN_JWT_SECRET is not set in .env.local');
  }
  return new TextEncoder().encode(secret);
}

export async function createAdminToken(session: AdminUserSession): Promise<string> {
  return new SignJWT({ admin: session })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecretKey());
}

export async function verifyAdminToken(token: string): Promise<AdminSession | null> {
  try {
    const verified = await jwtVerify(token, getSecretKey());
    return verified.payload as unknown as AdminSession;
  } catch {
    return null;
  }
}

export async function requireAdminRole(
  request: NextRequest
): Promise<{ success: boolean; adminId?: number; role?: AdminRole; tenantId?: number }> {
  try {
    const token = request.cookies.get('admin-token')?.value;
    if (!token) return { success: false };

    const session = await verifyAdminToken(token);
    if (!session?.admin) return { success: false };

    return {
      success: true,
      adminId: session.admin.id,
      role: session.admin.role,
      tenantId: session.admin.tenantId,
    };
  } catch (err) {
    console.error('requireAdminRole error:', err);
    return { success: false };
  }
}
