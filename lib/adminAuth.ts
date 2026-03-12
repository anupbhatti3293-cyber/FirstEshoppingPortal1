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

const adminJwtSecret = process.env.ADMIN_JWT_SECRET;
if (!adminJwtSecret) {
  throw new Error('ADMIN_JWT_SECRET environment variable is required but not set.');
}
const SECRET_KEY = new TextEncoder().encode(adminJwtSecret);

export async function createAdminToken(session: AdminUserSession): Promise<string> {
  return new SignJWT({ admin: session })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET_KEY);
}

export async function verifyAdminToken(token: string): Promise<AdminSession | null> {
  try {
    const verified = await jwtVerify(token, SECRET_KEY);
    return verified.payload as unknown as AdminSession;
  } catch {
    return null;
  }
}

/**
 * requireAdminRole
 * Used by all /api/admin/* routes in Feature 4B.
 * Reads the admin-token cookie, verifies it, and returns
 * { success, adminId, role, tenantId } or { success: false }.
 */
export async function requireAdminRole(
  request: NextRequest
): Promise<{ success: boolean; adminId?: number; role?: AdminRole; tenantId?: number }> {
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
}
