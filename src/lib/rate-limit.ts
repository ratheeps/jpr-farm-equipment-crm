/**
 * Simple in-memory sliding window rate limiter.
 * For multi-instance production deployments, replace with a Redis-based solution.
 */
const attempts = new Map<string, number[]>();

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

export function checkRateLimit(key: string): {
  allowed: boolean;
  retryAfterMs: number;
} {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  const timestamps = (attempts.get(key) ?? []).filter((t) => t > windowStart);
  attempts.set(key, timestamps);

  if (timestamps.length >= MAX_ATTEMPTS) {
    const oldestInWindow = timestamps[0];
    const retryAfterMs = oldestInWindow + WINDOW_MS - now;
    return { allowed: false, retryAfterMs };
  }

  timestamps.push(now);
  return { allowed: true, retryAfterMs: 0 };
}

// Periodic cleanup to prevent memory leaks
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    const windowStart = now - WINDOW_MS;
    for (const [key, timestamps] of attempts) {
      const valid = timestamps.filter((t) => t > windowStart);
      if (valid.length === 0) {
        attempts.delete(key);
      } else {
        attempts.set(key, valid);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}
