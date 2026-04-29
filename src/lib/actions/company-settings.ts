"use server";

import { withRLS } from "@/db";
import { companySettings } from "@/db/schema";
import { requireSession, isRole } from "@/lib/auth/session";
import { assertOptionalString, assertOptionalNumericString, assertString } from "@/lib/validations";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getCompanySettings() {
  const session = await requireSession();
  return withRLS(session.userId, session.role, async (tx) => {
    const [row] = await tx.select().from(companySettings).limit(1);
    return row ?? null;
  });
}

export async function upsertCompanySettings(data: {
  companyName: string;
  address?: string;
  phone?: string;
  email?: string;
  taxNumber?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankBranch?: string;
  logoUrl?: string;
  invoiceFooterNote?: string;
  defaultIdleWarnPct?: string;
  defaultIdleCriticalPct?: string;
  defaultFuelVariancePct?: string;
}) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }

  const companyName = assertString(data.companyName, "Company name");

  await withRLS(session.userId, session.role, async (tx) => {
    const [existing] = await tx.select({ id: companySettings.id }).from(companySettings).limit(1);

    const values = {
      companyName,
      address: assertOptionalString(data.address) ?? null,
      phone: assertOptionalString(data.phone) ?? null,
      email: assertOptionalString(data.email) ?? null,
      taxNumber: assertOptionalString(data.taxNumber) ?? null,
      bankName: assertOptionalString(data.bankName) ?? null,
      bankAccountNumber: assertOptionalString(data.bankAccountNumber) ?? null,
      bankBranch: assertOptionalString(data.bankBranch) ?? null,
      logoUrl: assertOptionalString(data.logoUrl) ?? null,
      invoiceFooterNote: assertOptionalString(data.invoiceFooterNote) ?? null,
      defaultIdleWarnPct: assertOptionalNumericString(data.defaultIdleWarnPct) ?? null,
      defaultIdleCriticalPct: assertOptionalNumericString(data.defaultIdleCriticalPct) ?? null,
      defaultFuelVariancePct: assertOptionalNumericString(data.defaultFuelVariancePct) ?? null,
      updatedAt: new Date(),
    };

    if (existing) {
      await tx
        .update(companySettings)
        .set(values)
        .where(eq(companySettings.id, existing.id));
    } else {
      await tx.insert(companySettings).values(values);
    }
  });

  revalidatePath("/admin/settings");
}
