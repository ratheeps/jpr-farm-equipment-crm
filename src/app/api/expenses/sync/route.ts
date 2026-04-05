import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/db";
import { expenses, staffProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { OfflineExpense } from "@/lib/offline/db";
import { validateCsrf } from "@/lib/csrf";

export async function POST(request: NextRequest) {
  const csrfError = validateCsrf(request);
  if (csrfError) return csrfError;

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [profile] = await db
    .select({ id: staffProfiles.id })
    .from(staffProfiles)
    .where(eq(staffProfiles.userId, session.userId));

  if (!profile) {
    return NextResponse.json({ error: "No staff profile" }, { status: 403 });
  }

  const record = (await request.json()) as OfflineExpense;

  // Idempotency: if same deviceId already exists, return its ID
  if (record.deviceId) {
    const [existing] = await db
      .select({ id: expenses.id })
      .from(expenses)
      .where(eq(expenses.clientDeviceId, record.deviceId));
    if (existing) {
      return NextResponse.json({ id: existing.id });
    }
  }

  const [expense] = await db
    .insert(expenses)
    .values({
      vehicleId: record.vehicleId ?? null,
      projectId: record.projectId ?? null,
      dailyLogId: record.logId ?? null,
      category: record.category as never,
      amount: String(record.amount),
      description: record.description ?? null,
      date: record.date,
      receiptImageUrl: record.receiptImagePath ?? null,
      createdBy: session.userId,
      clientDeviceId: record.deviceId,
    })
    .returning({ id: expenses.id });

  return NextResponse.json({ id: expense.id });
}
