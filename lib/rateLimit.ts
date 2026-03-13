// Simple in-memory rate limiter — no external dependency needed
// 5 failed attempts within 15 minutes → lockout for 15 minutes

interface Attempt {
  count: number;
  firstAt: number;
  lockedUntil?: number;
}

const store = new Map<string, Attempt>();

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

export function checkRateLimit(key: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (entry) {
    // Currently locked out?
    if (entry.lockedUntil && now < entry.lockedUntil) {
      const retryAfterSeconds = Math.ceil((entry.lockedUntil - now) / 1000);
      return { allowed: false, retryAfterSeconds };
    }

    // Window expired — reset
    if (now - entry.firstAt > WINDOW_MS) {
      store.delete(key);
      return { allowed: true };
    }

    // Within window but not yet locked
    if (entry.count >= MAX_ATTEMPTS) {
      entry.lockedUntil = now + LOCKOUT_MS;
      store.set(key, entry);
      return { allowed: false, retryAfterSeconds: Math.ceil(LOCKOUT_MS / 1000) };
    }
  }

  return { allowed: true };
}

export function recordFailedAttempt(key: string): void {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now - entry.firstAt > WINDOW_MS) {
    store.set(key, { count: 1, firstAt: now });
  } else {
    entry.count += 1;
    if (entry.count >= MAX_ATTEMPTS) {
      entry.lockedUntil = now + LOCKOUT_MS;
    }
    store.set(key, entry);
  }
}

export function clearAttempts(key: string): void {
  store.delete(key);
}
