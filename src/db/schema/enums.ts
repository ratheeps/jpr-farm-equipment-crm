import { pgEnum } from "drizzle-orm/pg-core";

export const vehicleTypeEnum = pgEnum("vehicle_type", [
  "bulldozer",
  "excavator",
  "harvester",
  "transport_truck",
  "tractor",
]);

export const billingModelEnum = pgEnum("billing_model", [
  "hourly",
  "per_acre",
  "per_km",
  "per_task",
]);

export const userRoleEnum = pgEnum("user_role", [
  "super_admin",
  "admin",
  "operator",
  "auditor",
  "finance",
]);

export const localeEnum = pgEnum("locale", ["ta", "si", "en"]);

export const payTypeEnum = pgEnum("pay_type", [
  "hourly",
  "daily",
  "monthly",
  "per_acre",
]);

export const vehicleStatusEnum = pgEnum("vehicle_status", [
  "active",
  "inactive",
  "maintenance",
]);

export const projectStatusEnum = pgEnum("project_status", [
  "planned",
  "active",
  "completed",
  "invoiced",
]);

export const farmCycleStageEnum = pgEnum("farm_cycle_stage", [
  "land_prep",
  "sowing",
  "growth",
  "harvesting",
  "completed",
]);

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "sent",
  "paid",
  "overdue",
  "cancelled",
]);

export const syncStatusEnum = pgEnum("sync_status", [
  "local",
  "synced",
  "conflict",
]);

export const expenseCategoryEnum = pgEnum("expense_category", [
  "fuel",
  "parts",
  "repair",
  "labor",
  "transport",
  "seeds",
  "fertilizer",
  "pesticide",
  "water",
  "misc",
]);

export const leaveTypeEnum = pgEnum("leave_type", [
  "annual",
  "sick",
  "unpaid",
  "other",
]);

export const leaveStatusEnum = pgEnum("leave_status", [
  "pending",
  "approved",
  "rejected",
]);

export const shiftTypeEnum = pgEnum("shift_type", [
  "morning",
  "afternoon",
  "full_day",
]);

export const payrollStatusEnum = pgEnum("payroll_status", [
  "draft",
  "finalized",
  "paid",
]);

export const loanTypeEnum = pgEnum("loan_type", [
  "bank_loan",
  "personal_borrowing",
  "equipment_lease",
]);

export const loanStatusEnum = pgEnum("loan_status", [
  "active",
  "completed",
  "defaulted",
]);

export const receivableStatusEnum = pgEnum("receivable_status", [
  "pending",
  "partial",
  "paid",
  "overdue",
  "written_off",
]);

export const transactionTypeEnum = pgEnum("transaction_type", [
  "income",
  "expense",
  "loan_payment",
  "lease_payment",
  "lending_out",
  "repayment_received",
  "borrowing_in",
  "debt_repayment",
]);

export const alertTypeEnum = pgEnum("alert_type", [
  "idling",
  "fuel_anomaly",
  "maintenance_overdue",
]);

export const alertSeverityEnum = pgEnum("alert_severity", [
  "warning",
  "critical",
]);
