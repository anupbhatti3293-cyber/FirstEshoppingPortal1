/**
 * Simple in-memory rate limiter — no external dependency.
 * Tracks failed attempts per IP. Automatically resets after window expires.
 */

interface Attempt {
  count: number;
  firstAttemptAt: number;
  lockedUntil?: number;
}

const store = new Map<string, Attempt>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS    = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_MS   = 15 * 60 * 1000; // 15 minutes lockout

export function checkRateLimit(ip: string): {
  allowed: boolean;
  remaining: number;
  retryAfterMs?: number;
} {
  const now  = Date.now();
  const data = store.get(ip);

  if (!data) {
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 };
  }

  // Locked out?
  if (data.lockedUntil && now < data.lockedUntil) {
    return {
      allowed:      false,
      remaining:    0,
      retryAfterMs: data.lockedUntil - now,
    };
  }

  // Window expired — reset
  if (now - data.firstAttemptAt > WINDOW_MS) {
    store.delete(ip);
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 };
  }

  const remaining = MAX_ATTEMPTS - data.count;
  if (remaining <= 0) {
    // Apply lockout
    store.set(ip, { ...data, lockedUntil: now + LOCKOUT_MS });
    return { allowed: false, remaining: 0, retryAfterMs: LOCKOUT_MS };
  }

  return { allowed: true, remaining: remaining - 1 };
}

export function recordFailedAttempt(ip: string): void {
  const now  = Date.now();
  const data = store.get(ip);

  if (!data) {
    store.set(ip, { count: 1, firstAttemptAt: now });
    return;
  }

  // Reset window if expired
  if (now - data.firstAttemptAt > WINDOW_MS) {
    store.set(ip, { count: 1, firstAttemptAt: now });
    return;
  }

  store.set(ip, { ...data, count: data.count + 1 });
}

export function clearAttempts(ip: string): void {
  store.delete(ip);
}

/** Prune stale entries (call periodically or on each request) */
export function pruneStore(): void {
  const now = Date.now();
  for (const [ip, data] of store.entries()) {
    const expired   = now - data.firstAttemptAt > WINDOW_MS;
    const unlocked  = data.lockedUntil ? now > data.lockedUntil : true;
    if (expired && unlocked) store.delete(ip);
  }
}
