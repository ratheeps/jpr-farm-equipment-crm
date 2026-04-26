import { describe, it, expect } from "vitest";
import { createRateLimiter } from "../rate-limit";

describe("createRateLimiter", () => {
  it("allows requests within limit", () => {
    const limiter = createRateLimiter(60_000, 3);
    expect(limiter("key1").allowed).toBe(true);
    expect(limiter("key1").allowed).toBe(true);
    expect(limiter("key1").allowed).toBe(true);
  });

  it("blocks after exceeding limit", () => {
    const limiter = createRateLimiter(60_000, 2);
    limiter("key2");
    limiter("key2");
    const result = limiter("key2");
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it("different keys are independent", () => {
    const limiter = createRateLimiter(60_000, 1);
    limiter("a");
    expect(limiter("a").allowed).toBe(false);
    expect(limiter("b").allowed).toBe(true);
  });
});
