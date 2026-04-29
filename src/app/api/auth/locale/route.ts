import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { withRLS } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { signToken } from "@/lib/auth/jwt";
import { COOKIE_NAME } from "@/lib/auth/session";
import { locales } from "@/i18n/config";
import { validateCsrf } from "@/lib/csrf";

export async function POST(request: NextRequest) {
  const csrfError = validateCsrf(request);
  if (csrfError) return csrfError;

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { locale } = await request.json();
  if (!locales.includes(locale)) {
    return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
  }

  await withRLS(session.userId, session.role, async (tx) => {
    await tx
      .update(users)
      .set({ preferredLocale: locale, updatedAt: new Date() })
      .where(eq(users.id, session.userId));
  });

  const token = await signToken({
    userId: session.userId,
    role: session.role,
    preferredLocale: locale,
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24, // 24 hours
    path: "/",
  });

  return response;
}
