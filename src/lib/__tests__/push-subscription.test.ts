import { describe, it, expect } from "vitest";

function handlePushError(statusCode: number): "delete" | "retry" | "ignore" {
  if (statusCode === 410 || statusCode === 404) return "delete";
  if (statusCode >= 500) return "retry";
  return "ignore";
}

describe("push subscription management", () => {
  it("should delete subscription on 410 Gone response", () => {
    expect(handlePushError(410)).toBe("delete");
  });

  it("should delete subscription on 404 Not Found response", () => {
    expect(handlePushError(404)).toBe("delete");
  });

  it("should retry on transient 500 error (not delete)", () => {
    expect(handlePushError(500)).toBe("retry");
    expect(handlePushError(503)).toBe("retry");
  });

  it("should ignore 4xx client errors (not 404/410)", () => {
    expect(handlePushError(400)).toBe("ignore");
    expect(handlePushError(403)).toBe("ignore");
  });
});
