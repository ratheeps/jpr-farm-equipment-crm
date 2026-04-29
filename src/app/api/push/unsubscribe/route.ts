import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { validateCsrf } from "@/lib/csrf";
import { withRLS } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const csrfError = validateCsrf(request);
  if (csrfError) return csrfError;

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { endpoint?: string };
  if (!body.endpoint) {
    return NextResponse.json({ error: "endpoint is required" }, { status: 400 });
  }

  await withRLS(session.userId, session.role, async (tx) => {
    await tx
      .delete(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.endpoint, body.endpoint!),
          eq(pushSubscriptions.userId, session.userId)
        )
      );
  });

  return NextResponse.json({ ok: true });
}
