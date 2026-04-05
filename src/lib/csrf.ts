import { NextRequest, NextResponse } from "next/server";

/**
 * Validates that the request Origin header matches the app's host.
 * Returns a 403 response if the origin is invalid, or null if valid.
 * Safe to use on Edge and Node.js runtimes.
 */
export function validateCsrf(request: NextRequest): NextResponse | null {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  // Allow requests with no origin (same-origin browser navigations, non-browser clients)
  if (!origin) return null;

  try {
    const originHost = new URL(origin).host;
    if (originHost === host) return null;
  } catch {
    // Malformed origin URL — reject
  }

  return NextResponse.json(
    { error: "Invalid request origin" },
    { status: 403 }
  );
}
