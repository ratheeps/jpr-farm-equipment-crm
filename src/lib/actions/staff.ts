"use server";

import { db } from "@/db";
import { users, staffProfiles } from "@/db/schema";
import { requireSession, isRole } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type StaffFormData = {
  phone: string;
  password?: string;
  role: string;
  preferredLocale: string;
  fullName: string;
  staffPhone?: string;
  nicNumber?: string;
  payRate?: string;
  payType: string;
};

export async function createStaff(data: StaffFormData) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }
  if (!data.password) throw new Error("Password is required");

  const passwordHash = await hashPassword(data.password);

  const [user] = await db
    .insert(users)
    .values({
      phone: data.phone,
      passwordHash,
      role: data.role as never,
      preferredLocale: data.preferredLocale as never,
    })
    .returning({ id: users.id });

  await db.insert(staffProfiles).values({
    userId: user.id,
    fullName: data.fullName,
    phone: data.staffPhone || data.phone,
    nicNumber: data.nicNumber || null,
    payRate: data.payRate || null,
    payType: data.payType as never,
  });

  revalidatePath("/admin/staff");
}

export async function updateStaff(userId: string, data: Omit<StaffFormData, "password">) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }

  await db
    .update(users)
    .set({
      role: data.role as never,
      preferredLocale: data.preferredLocale as never,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  await db
    .update(staffProfiles)
    .set({
      fullName: data.fullName,
      phone: data.staffPhone || data.phone,
      nicNumber: data.nicNumber || null,
      payRate: data.payRate || null,
      payType: data.payType as never,
      updatedAt: new Date(),
    })
    .where(eq(staffProfiles.userId, userId));

  revalidatePath("/admin/staff");
}

export async function getStaffList() {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }

  return db
    .select({
      userId: users.id,
      phone: users.phone,
      role: users.role,
      preferredLocale: users.preferredLocale,
      isActive: users.isActive,
      fullName: staffProfiles.fullName,
      staffPhone: staffProfiles.phone,
      nicNumber: staffProfiles.nicNumber,
      payRate: staffProfiles.payRate,
      payType: staffProfiles.payType,
    })
    .from(users)
    .leftJoin(staffProfiles, eq(staffProfiles.userId, users.id))
    .orderBy(staffProfiles.fullName);
}
