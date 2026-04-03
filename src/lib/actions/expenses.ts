"use server";

import { db } from "@/db";
import { expenses, staffProfiles, vehicles } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

async function getStaffProfile(userId: string) {
  const [profile] = await db
    .select()
    .from(staffProfiles)
    .where(eq(staffProfiles.userId, userId));
  return profile ?? null;
}

export async function createExpense(data: {
  vehicleId?: string;
  projectId?: string;
  dailyLogId?: string;
  category: string;
  amount: string;
  description?: string;
  date: string;
}) {
  const session = await requireSession();
  const profile = await getStaffProfile(session.userId);
  if (!profile) throw new Error("No staff profile");

  await db.insert(expenses).values({
    vehicleId: data.vehicleId ?? null,
    projectId: data.projectId ?? null,
    dailyLogId: data.dailyLogId ?? null,
    staffId: profile.id,
    createdBy: session.userId,
    category: data.category as never,
    amount: data.amount,
    description: data.description ?? null,
    date: data.date,
  });

  revalidatePath("/operator/expenses");
}

export async function getMyExpenses(limit = 30) {
  const session = await requireSession();
  const profile = await getStaffProfile(session.userId);
  if (!profile) return [];

  return db
    .select({
      id: expenses.id,
      date: expenses.date,
      category: expenses.category,
      amount: expenses.amount,
      description: expenses.description,
      syncStatus: expenses.syncStatus,
      vehicleName: vehicles.name,
    })
    .from(expenses)
    .leftJoin(vehicles, eq(expenses.vehicleId, vehicles.id))
    .where(eq(expenses.staffId, profile.id))
    .orderBy(desc(expenses.date))
    .limit(limit);
}
