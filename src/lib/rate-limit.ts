/**
 * Parameterized sliding window rate limiter factory.
 * For multi-instance production deployments, replace with a Redis-based solution.
 */
export function createRateLimiter(windowMs: number, maxAttempts: number) {
  const attempts = new Map<string, number[]>();

  // Periodic cleanup
  if (typeof setInterval !== "undefined") {
    setInterval(() => {
      const now = Date.now();
      const windowStart = now - windowMs;
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

  return function checkRateLimit(key: string): {
    allowed: boolean;
    retryAfterMs: number;
  } {
    const now = Date.now();
    const windowStart = now - windowMs;
    const timestamps = (attempts.get(key) ?? []).filter((t) => t > windowStart);
    attempts.set(key, timestamps);

    if (timestamps.length >= maxAttempts) {
      const oldestInWindow = timestamps[0];
      const retryAfterMs = oldestInWindow + windowMs - now;
      return { allowed: false, retryAfterMs };
    }

    timestamps.push(now);
    return { allowed: true, retryAfterMs: 0 };
  };
}

// Default limiter for login (backward compatible)
export const checkRateLimit = createRateLimiter(15 * 60 * 1000, 5);
