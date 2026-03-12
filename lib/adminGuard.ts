import type { NextRequest } from 'next/server';
import type { AdminRole, AdminUserSession } from '@/lib/adminAuth';
import { verifyAdminToken } from '@/lib/adminAuth';

export async function getAdminFromRequest(request: NextRequest): Promise<AdminUserSession | null> {
  const token = request.cookies.get('admin-token')?.value;
  if (!token) return null;

  const session = await verifyAdminToken(token);
  if (!session?.admin) return null;

  return session.admin;
}

export async function requireAdminRole(
  request: NextRequest,
  allowedRoles: AdminRole[]
): Promise<AdminUserSession | null> {
  const admin = await getAdminFromRequest(request);
  if (!admin) return null;

  return allowedRoles.includes(admin.role) ? admin : null;
}

