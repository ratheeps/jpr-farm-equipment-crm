"use server";

import { db } from "@/db";
import {
  loans,
  loanPayments,
  receivables,
  receivablePayments,
  cashTransactions,
} from "@/db/schema";
import { vehicles } from "@/db/schema";
import { requireSession, isRole } from "@/lib/auth/session";
import { eq, desc, sum } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// ── Types ──────────────────────────────────────────────────────────────────

export type LoanFormData = {
  loanType: string;
  lenderName: string;
  lenderPhone?: string;
  principalAmount: string;
  interestRatePercent?: string;
  interestType?: string;
  termMonths?: string;
  emiAmount?: string;
  startDate: string;
  endDate?: string;
  vehicleId?: string;
  notes?: string;
};

export type LoanPaymentData = {
  amount: string;
  paymentDate: string;
  principalPortion?: string;
  interestPortion?: string;
  paymentMethod?: string;
  referenceNumber?: string;
  notes?: string;
};

export type ReceivableFormData = {
  type: string;
  debtorName: string;
  debtorPhone?: string;
  projectId?: string;
  invoiceId?: string;
  principalAmount: string;
  interestRatePercent?: string;
  totalDue: string;
  dueDate?: string;
  notes?: string;
};

export type ReceivablePaymentData = {
  amount: string;
  paymentDate: string;
  paymentMethod?: string;
  referenceNumber?: string;
  notes?: string;
};

// ── Loans ──────────────────────────────────────────────────────────────────

export async function getLoans() {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin", "auditor")) {
    throw new Error("Forbidden");
  }

  const rows = await db
    .select({
      id: loans.id,
      loanType: loans.loanType,
      lenderName: loans.lenderName,
      lenderPhone: loans.lenderPhone,
      principalAmount: loans.principalAmount,
      emiAmount: loans.emiAmount,
      outstandingBalance: loans.outstandingBalance,
      status: loans.status,
      startDate: loans.startDate,
      endDate: loans.endDate,
      createdAt: loans.createdAt,
      vehicleName: vehicles.name,
    })
    .from(loans)
    .leftJoin(vehicles, eq(loans.vehicleId, vehicles.id))
    .orderBy(desc(loans.createdAt));

  return rows;
}

export async function getLoan(id: string) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin", "auditor")) {
    throw new Error("Forbidden");
  }

  const [loan] = await db.select().from(loans).where(eq(loans.id, id));
  if (!loan) return null;

  const payments = await db
    .select()
    .from(loanPayments)
    .where(eq(loanPayments.loanId, id))
    .orderBy(desc(loanPayments.paymentDate));

  return { loan, payments };
}

export async function createLoan(data: LoanFormData) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }

  await db.insert(loans).values({
    loanType: data.loanType as never,
    lenderName: data.lenderName,
    lenderPhone: data.lenderPhone || null,
    principalAmount: data.principalAmount,
    interestRatePercent: data.interestRatePercent || null,
    interestType: data.interestType || "reducing",
    termMonths: data.termMonths ? parseInt(data.termMonths) : null,
    emiAmount: data.emiAmount || null,
    startDate: data.startDate,
    endDate: data.endDate || null,
    vehicleId: data.vehicleId || null,
    outstandingBalance: data.principalAmount,
    notes: data.notes || null,
  });

  revalidatePath("/owner/finance");
  revalidatePath("/owner");
}

export async function updateLoan(id: string, data: LoanFormData) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }

  await db
    .update(loans)
    .set({
      loanType: data.loanType as never,
      lenderName: data.lenderName,
      lenderPhone: data.lenderPhone || null,
      principalAmount: data.principalAmount,
      interestRatePercent: data.interestRatePercent || null,
      interestType: data.interestType || "reducing",
      termMonths: data.termMonths ? parseInt(data.termMonths) : null,
      emiAmount: data.emiAmount || null,
      startDate: data.startDate,
      endDate: data.endDate || null,
      vehicleId: data.vehicleId || null,
      notes: data.notes || null,
      updatedAt: new Date(),
    })
    .where(eq(loans.id, id));

  revalidatePath("/owner/finance");
  revalidatePath(`/owner/finance/loans/${id}`);
}

export async function deleteLoan(id: string) {
  const session = await requireSession();
  if (!isRole(session, "super_admin")) {
    throw new Error("Forbidden");
  }

  await db
    .update(loans)
    .set({ status: "completed", updatedAt: new Date() })
    .where(eq(loans.id, id));

  revalidatePath("/owner/finance");
}

export async function recordLoanPayment(loanId: string, data: LoanPaymentData) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }

  await db.insert(loanPayments).values({
    loanId,
    amount: data.amount,
    principalPortion: data.principalPortion || null,
    interestPortion: data.interestPortion || null,
    paymentDate: data.paymentDate,
    paymentMethod: data.paymentMethod || null,
    referenceNumber: data.referenceNumber || null,
    notes: data.notes || null,
  });

  // Recalculate outstanding balance
  const [{ totalPaid }] = await db
    .select({ totalPaid: sum(loanPayments.amount) })
    .from(loanPayments)
    .where(eq(loanPayments.loanId, loanId));

  const [loan] = await db
    .select({ principalAmount: loans.principalAmount })
    .from(loans)
    .where(eq(loans.id, loanId));

  const newBalance = Math.max(
    0,
    parseFloat(loan.principalAmount) - parseFloat(totalPaid ?? "0")
  );

  await db
    .update(loans)
    .set({
      outstandingBalance: String(newBalance),
      status: newBalance <= 0 ? "completed" : "active",
      updatedAt: new Date(),
    })
    .where(eq(loans.id, loanId));

  revalidatePath(`/owner/finance/loans/${loanId}`);
  revalidatePath("/owner/finance");
  revalidatePath("/owner");
}

export async function deleteLoanPayment(paymentId: string, loanId: string) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }

  await db.delete(loanPayments).where(eq(loanPayments.id, paymentId));

  // Recalculate outstanding balance
  const [{ totalPaid }] = await db
    .select({ totalPaid: sum(loanPayments.amount) })
    .from(loanPayments)
    .where(eq(loanPayments.loanId, loanId));

  const [loan] = await db
    .select({ principalAmount: loans.principalAmount })
    .from(loans)
    .where(eq(loans.id, loanId));

  const newBalance = Math.max(
    0,
    parseFloat(loan.principalAmount) - parseFloat(totalPaid ?? "0")
  );

  await db
    .update(loans)
    .set({
      outstandingBalance: String(newBalance),
      status: newBalance <= 0 ? "completed" : "active",
      updatedAt: new Date(),
    })
    .where(eq(loans.id, loanId));

  revalidatePath(`/owner/finance/loans/${loanId}`);
  revalidatePath("/owner/finance");
}

// ── Receivables ────────────────────────────────────────────────────────────

export async function getReceivables() {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin", "auditor")) {
    throw new Error("Forbidden");
  }

  return db
    .select()
    .from(receivables)
    .orderBy(desc(receivables.createdAt));
}

export async function getReceivable(id: string) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin", "auditor")) {
    throw new Error("Forbidden");
  }

  const [receivable] = await db
    .select()
    .from(receivables)
    .where(eq(receivables.id, id));

  if (!receivable) return null;

  const payments = await db
    .select()
    .from(receivablePayments)
    .where(eq(receivablePayments.receivableId, id))
    .orderBy(desc(receivablePayments.paymentDate));

  return { receivable, payments };
}

export async function createReceivable(data: ReceivableFormData) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }

  await db.insert(receivables).values({
    type: data.type,
    debtorName: data.debtorName,
    debtorPhone: data.debtorPhone || null,
    projectId: data.projectId || null,
    invoiceId: data.invoiceId || null,
    principalAmount: data.principalAmount,
    interestRatePercent: data.interestRatePercent || null,
    totalDue: data.totalDue,
    amountReceived: "0",
    outstandingBalance: data.totalDue,
    dueDate: data.dueDate || null,
    notes: data.notes || null,
  });

  revalidatePath("/owner/finance");
  revalidatePath("/owner");
}

export async function updateReceivable(id: string, data: ReceivableFormData) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }

  await db
    .update(receivables)
    .set({
      type: data.type,
      debtorName: data.debtorName,
      debtorPhone: data.debtorPhone || null,
      projectId: data.projectId || null,
      principalAmount: data.principalAmount,
      interestRatePercent: data.interestRatePercent || null,
      totalDue: data.totalDue,
      dueDate: data.dueDate || null,
      notes: data.notes || null,
      updatedAt: new Date(),
    })
    .where(eq(receivables.id, id));

  revalidatePath("/owner/finance");
  revalidatePath(`/owner/finance/receivables/${id}`);
}

export async function deleteReceivable(id: string) {
  const session = await requireSession();
  if (!isRole(session, "super_admin")) {
    throw new Error("Forbidden");
  }

  await db
    .update(receivables)
    .set({ status: "written_off", updatedAt: new Date() })
    .where(eq(receivables.id, id));

  revalidatePath("/owner/finance");
}

export async function recordReceivablePayment(
  receivableId: string,
  data: ReceivablePaymentData
) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }

  await db.insert(receivablePayments).values({
    receivableId,
    amount: data.amount,
    paymentDate: data.paymentDate,
    paymentMethod: data.paymentMethod || null,
    referenceNumber: data.referenceNumber || null,
    notes: data.notes || null,
  });

  // Recalculate balances
  const [{ totalReceived }] = await db
    .select({ totalReceived: sum(receivablePayments.amount) })
    .from(receivablePayments)
    .where(eq(receivablePayments.receivableId, receivableId));

  const [rec] = await db
    .select({ totalDue: receivables.totalDue })
    .from(receivables)
    .where(eq(receivables.id, receivableId));

  const received = parseFloat(totalReceived ?? "0");
  const totalDue = parseFloat(rec.totalDue);
  const newBalance = Math.max(0, totalDue - received);

  let newStatus: "pending" | "partial" | "paid" = "pending";
  if (received >= totalDue) newStatus = "paid";
  else if (received > 0) newStatus = "partial";

  await db
    .update(receivables)
    .set({
      amountReceived: String(received),
      outstandingBalance: String(newBalance),
      status: newStatus,
      updatedAt: new Date(),
    })
    .where(eq(receivables.id, receivableId));

  revalidatePath(`/owner/finance/receivables/${receivableId}`);
  revalidatePath("/owner/finance");
  revalidatePath("/owner");
}

export async function deleteReceivablePayment(
  paymentId: string,
  receivableId: string
) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }

  await db
    .delete(receivablePayments)
    .where(eq(receivablePayments.id, paymentId));

  // Recalculate
  const [{ totalReceived }] = await db
    .select({ totalReceived: sum(receivablePayments.amount) })
    .from(receivablePayments)
    .where(eq(receivablePayments.receivableId, receivableId));

  const [rec] = await db
    .select({ totalDue: receivables.totalDue })
    .from(receivables)
    .where(eq(receivables.id, receivableId));

  const received = parseFloat(totalReceived ?? "0");
  const totalDue = parseFloat(rec.totalDue);
  const newBalance = Math.max(0, totalDue - received);

  let newStatus: "pending" | "partial" | "paid" = "pending";
  if (received >= totalDue) newStatus = "paid";
  else if (received > 0) newStatus = "partial";

  await db
    .update(receivables)
    .set({
      amountReceived: String(received),
      outstandingBalance: String(newBalance),
      status: newStatus,
      updatedAt: new Date(),
    })
    .where(eq(receivables.id, receivableId));

  revalidatePath(`/owner/finance/receivables/${receivableId}`);
  revalidatePath("/owner/finance");
}

// ── Summary ────────────────────────────────────────────────────────────────

export async function getFinanceSummary() {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin", "auditor")) {
    throw new Error("Forbidden");
  }

  const [debtResult] = await db
    .select({ total: sum(loans.outstandingBalance) })
    .from(loans)
    .where(eq(loans.status, "active"));

  const [emiResult] = await db
    .select({ total: sum(loans.emiAmount) })
    .from(loans)
    .where(eq(loans.status, "active"));

  const [receivablesResult] = await db
    .select({ total: sum(receivables.outstandingBalance) })
    .from(receivables);

  const totalDebt = parseFloat(debtResult?.total ?? "0");
  const monthlyEmi = parseFloat(emiResult?.total ?? "0");
  const totalReceivables = parseFloat(receivablesResult?.total ?? "0");
  const netWorth = totalReceivables - totalDebt;

  return { totalDebt, monthlyEmi, totalReceivables, netWorth };
}

// ── Transactions ───────────────────────────────────────────────────────────

export async function getCashTransactions() {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin", "auditor")) {
    throw new Error("Forbidden");
  }

  return db
    .select()
    .from(cashTransactions)
    .orderBy(desc(cashTransactions.transactionDate));
}
