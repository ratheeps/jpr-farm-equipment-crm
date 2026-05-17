"use server";

import { withRLS } from "@/db";
import { projects, dailyLogs, vehicles, invoices, invoiceItems } from "@/db/schema";
import { requireSession, isRole } from "@/lib/auth/session";
import { nextInvoiceNumberTx } from "@/lib/actions/invoices";
import { eq, and, sql, isNull, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { buildInvoiceLineItems, type InvoiceLogRow } from "@/lib/invoice-line-items";

// Reuse nextInvoiceNumberTx from src/lib/actions/invoices.ts so the COUNT(*)
// runs inside the same withRLS transaction, preventing numbering collisions.

export async function generateFromProject(projectId: string) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) throw new Error("Forbidden");

  return await withRLS(session.userId, session.role, async (tx) => {
    // Row lock on project to prevent concurrent double-bill
    // Note: Drizzle does not support .for("update") — use raw SQL for SELECT...FOR UPDATE
    // IMPORTANT: raw SQL returns snake_case column names — access with snake_case below
    const projectRows = await tx.execute<{
      id: string; name: string; mobilization_fee: string | null;
      mobilization_billed: boolean; client_name: string; client_phone: string | null;
    }>(sql`SELECT id, name, mobilization_fee, mobilization_billed, client_name, client_phone FROM projects WHERE id = ${projectId} FOR UPDATE`);
    const project = projectRows.rows[0];

    if (!project) throw new Error("Project not found");

    // Fetch completed daily logs with vehicle data
    const logRows = await tx
      .select({
        id: dailyLogs.id,
        date: dailyLogs.date,
        startEngineHours: dailyLogs.startEngineHours,
        endEngineHours: dailyLogs.endEngineHours,
        acresWorked: dailyLogs.acresWorked,
        kmTraveled: dailyLogs.kmTraveled,
        vehicleName: vehicles.name,
        vehicleBillingModel: vehicles.billingModel,
        vehicleRatePerHour: vehicles.ratePerHour,
        vehicleRatePerAcre: vehicles.ratePerAcre,
        vehicleRatePerKm: vehicles.ratePerKm,
        vehicleRatePerTask: vehicles.ratePerTask,
      })
      .from(dailyLogs)
      .innerJoin(vehicles, eq(dailyLogs.vehicleId, vehicles.id))
      .where(
        and(
          eq(dailyLogs.projectId, projectId),
          sql`${dailyLogs.endEngineHours} IS NOT NULL`,
          isNull(dailyLogs.invoiceId)
        )
      )
      .orderBy(dailyLogs.date);

    if (logRows.length === 0) {
      throw new Error("No completed logs found for this project");
    }

    // Build mobilization preamble if applicable
    // NOTE: Use snake_case accessors — raw SQL returns DB column names
    const preamble = [];
    const shouldBillMobilization =
      project.mobilization_fee &&
      Number(project.mobilization_fee) > 0 &&
      !project.mobilization_billed;

    if (shouldBillMobilization) {
      preamble.push({
        description: "Mobilization",
        quantity: "1",
        unit: "mobilization",
        rate: project.mobilization_fee!,
        amount: project.mobilization_fee!,
      });
    }

    const items = buildInvoiceLineItems(preamble, logRows as InvoiceLogRow[]);
    const subtotal = items.reduce((s, i) => s + Number(i.amount), 0);

    const invoiceNumber = await nextInvoiceNumberTx(tx);

    const [invoice] = await tx
      .insert(invoices)
      .values({
        invoiceNumber,
        projectId,
        clientName: project.client_name,
        clientPhone: project.client_phone ?? null,
        subtotal: String(subtotal),
        discountAmount: "0",
        taxAmount: "0",
        total: String(subtotal),
        status: "draft",
        notes: `Auto-generated from project: ${project.name}`,
      })
      .returning({ id: invoices.id });

    if (items.length > 0) {
      await tx.insert(invoiceItems).values(
        items.map((item, idx) => ({
          invoiceId: invoice.id,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          rate: item.rate,
          amount: item.amount,
          sortOrder: idx,
          sourceLogId: item.sourceLogId ?? null,   // preamble (mobilization) is null; log items carry id
        }))
      );
    }

    // Flip mobilization billed flag
    if (shouldBillMobilization) {
      await tx
        .update(projects)
        .set({ mobilizationBilled: true, updatedAt: new Date() })
        .where(eq(projects.id, projectId));
    }

    const logIds = (logRows as InvoiceLogRow[]).map((l) => l.id);
    if (logIds.length > 0) {
      await tx
        .update(dailyLogs)
        .set({ invoiceId: invoice.id, updatedAt: new Date() })
        .where(and(inArray(dailyLogs.id, logIds), isNull(dailyLogs.invoiceId)));
    }

    revalidatePath("/admin/invoices");
    revalidatePath(`/admin/projects/${projectId}`);
    return invoice.id;
  });
}

export type AutoPopulateItem = {
  description: string;
  quantity: string;
  unit: string;
  rate: string;
  amount: string;
  sourceLogId?: string;   // present on log-derived items; absent on preamble (mobilization)
};

export type AutoPopulateResult = {
  preamble: AutoPopulateItem[];
  items: AutoPopulateItem[];
  clientName: string;
  clientPhone: string | null;
};

export async function getUninvoicedLogsForProject(
  projectId: string
): Promise<AutoPopulateResult> {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) throw new Error("Forbidden");

  return await withRLS(session.userId, session.role, async (tx) => {
    const projectRows = await tx
      .select({
        clientName: projects.clientName,
        clientPhone: projects.clientPhone,
        mobilizationFee: projects.mobilizationFee,
        mobilizationBilled: projects.mobilizationBilled,
      })
      .from(projects)
      .where(eq(projects.id, projectId));
    const project = projectRows[0];
    if (!project) throw new Error("Project not found");

    const logRows = await tx
      .select({
        id: dailyLogs.id,
        date: dailyLogs.date,
        startEngineHours: dailyLogs.startEngineHours,
        endEngineHours: dailyLogs.endEngineHours,
        acresWorked: dailyLogs.acresWorked,
        kmTraveled: dailyLogs.kmTraveled,
        vehicleName: vehicles.name,
        vehicleBillingModel: vehicles.billingModel,
        vehicleRatePerHour: vehicles.ratePerHour,
        vehicleRatePerAcre: vehicles.ratePerAcre,
        vehicleRatePerKm: vehicles.ratePerKm,
        vehicleRatePerTask: vehicles.ratePerTask,
      })
      .from(dailyLogs)
      .innerJoin(vehicles, eq(dailyLogs.vehicleId, vehicles.id))
      .where(
        and(
          eq(dailyLogs.projectId, projectId),
          sql`${dailyLogs.endEngineHours} IS NOT NULL`,
          isNull(dailyLogs.invoiceId)
        )
      )
      .orderBy(dailyLogs.date);

    const preamble: AutoPopulateItem[] = [];
    const shouldBillMobilization =
      project.mobilizationFee &&
      Number(project.mobilizationFee) > 0 &&
      !project.mobilizationBilled;

    if (shouldBillMobilization) {
      preamble.push({
        description: "Mobilization",
        quantity: "1",
        unit: "mobilization",
        rate: project.mobilizationFee!,
        amount: project.mobilizationFee!,
      });
    }

    const built = buildInvoiceLineItems([], logRows as InvoiceLogRow[]);
    const items: AutoPopulateItem[] = built.map((it) => ({
      description: it.description,
      quantity: it.quantity,
      unit: it.unit,
      rate: it.rate,
      amount: it.amount,
      sourceLogId: it.sourceLogId,
    }));

    return {
      preamble,
      items,
      clientName: project.clientName,
      clientPhone: project.clientPhone ?? null,
    };
  });
}
