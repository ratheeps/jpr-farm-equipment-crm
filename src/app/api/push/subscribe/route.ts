import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { validateCsrf } from "@/lib/csrf";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { vapidPublicKey } from "@/lib/push";

export async function GET() {
  return NextResponse.json({ publicKey: vapidPublicKey });
}

export async function POST(request: NextRequest) {
  const csrfError = validateCsrf(request);
  if (csrfError) return csrfError;

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };

  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription payload" }, { status: 400 });
  }

  // Upsert — replace existing subscription for this endpoint
  const existing = await db
    .select({ id: pushSubscriptions.id })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, body.endpoint));

  if (existing.length > 0) {
    await db
      .update(pushSubscriptions)
      .set({ userId: session.userId, p256dh: body.keys.p256dh, auth: body.keys.auth })
      .where(eq(pushSubscriptions.endpoint, body.endpoint));
  } else {
    await db.insert(pushSubscriptions).values({
      userId: session.userId,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
    });
  }

  return NextResponse.json({ ok: true });
}
