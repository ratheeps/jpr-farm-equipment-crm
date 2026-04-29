"use server";

import { withRLS, type DB } from "@/db";
import { users } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { eq } from "drizzle-orm";

export async function changePassword(data: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ success?: true; error?: string }> {
  const session = await requireSession();

  const current =
    typeof data.currentPassword === "string" ? data.currentPassword : "";
  const next = typeof data.newPassword === "string" ? data.newPassword : "";

  if (!current || !next) {
    return { error: "Both current and new password are required" };
  }
  if (next.length < 6) {
    return { error: "passwordTooShort" };
  }
  if (current === next) {
    return { error: "New password must be different from current password" };
  }

  return withRLS(session.userId, session.role, async (tx: DB) => {
    const [user] = await tx
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!user) {
      return { error: "User not found" };
    }

    const valid = await verifyPassword(current, user.passwordHash);
    if (!valid) {
      return { error: "currentPasswordIncorrect" };
    }

    const newHash = await hashPassword(next);
    await tx
      .update(users)
      .set({ passwordHash: newHash, updatedAt: new Date() })
      .where(eq(users.id, session.userId));

    return { success: true };
  });
}
