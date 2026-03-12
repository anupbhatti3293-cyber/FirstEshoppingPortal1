import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import type { NextRequest } from 'next/server';

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error('JWT_SECRET environment variable is required but not set.');
}
const SECRET_KEY = new TextEncoder().encode(jwtSecret);

export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  tenantId: number;
}

export interface Session {
  user: User;
  expires: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export async function createToken(user: User): Promise<string> {
  const token = await new SignJWT({ user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET_KEY);

  return token;
}

export async function verifyToken(token: string): Promise<Session | null> {
  try {
    const verified = await jwtVerify(token, SECRET_KEY);
    return verified.payload as unknown as Session;
  } catch {
    return null;
  }
}

export async function getSession(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  return verifyToken(token);
}

/**
 * requireCustomerAuth
 * Reads the customer JWT from the 'token' cookie and returns
 * { success, userId, tenantId } — used by customer-facing API routes.
 */
export async function requireCustomerAuth(
  request: NextRequest
): Promise<{ success: boolean; userId?: number; tenantId?: number }> {
  const token = request.cookies.get('token')?.value;
  if (!token) return { success: false };

  const session = await verifyToken(token);
  if (!session?.user) return { success: false };

  return {
    success: true,
    userId: parseInt(session.user.id),
    tenantId: session.user.tenantId,
  };
}
