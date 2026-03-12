import { SignJWT, jwtVerify } from 'jose';

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

const SECRET_KEY = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || 'admin-dev-secret-change-in-production'
);

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

