import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { withRLS } from "@/db";
import { users, staffProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await withRLS(session.userId, session.role, async (tx) => {
    const [row] = await tx
      .select({
        id: users.id,
        phone: users.phone,
        role: users.role,
        preferredLocale: users.preferredLocale,
        staffProfile: {
          id: staffProfiles.id,
          fullName: staffProfiles.fullName,
        },
      })
      .from(users)
      .leftJoin(staffProfiles, eq(staffProfiles.userId, users.id))
      .where(eq(users.id, session.userId))
      .limit(1);
    return row;
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}
