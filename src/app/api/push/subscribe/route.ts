import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const session = await requireSession();
  const body = await req.json();

  const { endpoint, p256dh, auth, preferCritical, preferDailyDigest } = body;

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Missing subscription fields" }, { status: 400 });
  }

  const existing = await db
    .select({ id: pushSubscriptions.id })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(pushSubscriptions)
      .set({
        p256dh,
        auth,
        preferCritical: preferCritical ?? true,
        preferDailyDigest: preferDailyDigest ?? true,
      })
      .where(eq(pushSubscriptions.id, existing[0].id));
  } else {
    await db.insert(pushSubscriptions).values({
      userId: session.userId,
      endpoint,
      p256dh,
      auth,
      preferCritical: preferCritical ?? true,
      preferDailyDigest: preferDailyDigest ?? true,
    });
  }

  return NextResponse.json({ ok: true });
}
