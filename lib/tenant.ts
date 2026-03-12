import type { NextRequest } from 'next/server';

const DEFAULT_TENANT_ID = 1;

export function getTenantIdFromRequest(request: NextRequest): number {
  const headerValue = request.headers.get('x-tenant-id');
  if (!headerValue) return DEFAULT_TENANT_ID;

  const parsed = Number.parseInt(headerValue, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_TENANT_ID;

  return parsed;
}

