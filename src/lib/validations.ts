/**
 * Lightweight input validation helpers for server actions.
 * No external dependencies — avoids adding zod for simple boundary validation.
 */

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function assertString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(`${field} is required`);
  }
  return value.trim();
}

export function assertOptionalString(value: unknown): string | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function assertNumericString(value: unknown, field: string): string {
  const str = assertString(value, field);
  const num = Number(str);
  if (isNaN(num) || num < 0) {
    throw new ValidationError(`${field} must be a valid non-negative number`);
  }
  return str;
}

export function assertOptionalNumericString(value: unknown): string | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value !== "string") return undefined;
  const num = Number(value.trim());
  if (isNaN(num) || num < 0) return undefined;
  return value.trim();
}

export function assertUUID(value: unknown, field: string): string {
  const str = assertString(value, field);
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(str)) {
    throw new ValidationError(`${field} must be a valid ID`);
  }
  return str;
}

export function assertOptionalUUID(value: unknown): string | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value !== "string") return undefined;
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value.trim()) ? value.trim() : undefined;
}

export function assertDate(value: unknown, field: string): string {
  const str = assertString(value, field);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    throw new ValidationError(`${field} must be a valid date (YYYY-MM-DD)`);
  }
  return str;
}

export function assertOptionalDate(value: unknown): string | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value !== "string") return undefined;
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim()) ? value.trim() : undefined;
}

export function assertEnum<T extends string>(
  value: unknown,
  field: string,
  allowed: readonly T[]
): T {
  const str = assertString(value, field);
  if (!allowed.includes(str as T)) {
    throw new ValidationError(
      `${field} must be one of: ${allowed.join(", ")}`
    );
  }
  return str as T;
}

export function assertPositiveInt(value: unknown, field: string): number {
  const num = Number(value);
  if (!Number.isInteger(num) || num < 0) {
    throw new ValidationError(`${field} must be a non-negative integer`);
  }
  return num;
}

export function assertOptionalPositiveInt(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const num = Number(value);
  if (!Number.isInteger(num) || num < 0) return undefined;
  return num;
}

// ─── Domain-specific validators ───────────────────────────────────────────────

const VEHICLE_TYPES = [
  "bulldozer",
  "excavator",
  "harvester",
  "transport_truck",
  "tractor",
] as const;
const BILLING_MODELS = ["hourly", "per_acre", "per_km", "per_task"] as const;
const VEHICLE_STATUSES = ["active", "inactive", "maintenance"] as const;
const USER_ROLES = ["super_admin", "admin", "operator", "auditor"] as const;
const PAY_TYPES = ["hourly", "daily", "monthly", "per_acre"] as const;
const LOCALES = ["ta", "si", "en"] as const;
const PROJECT_STATUSES = [
  "planned",
  "active",
  "completed",
  "invoiced",
] as const;
const EXPENSE_CATEGORIES = [
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
] as const;
const INVOICE_STATUSES = [
  "draft",
  "sent",
  "paid",
  "overdue",
  "cancelled",
] as const;
const LOAN_TYPES = [
  "bank_loan",
  "personal_borrowing",
  "equipment_lease",
] as const;
const RECEIVABLE_TYPES = [
  "project_payment",
  "personal_lending",
] as const;
const PAYMENT_TYPES = ["advance", "partial", "final"] as const;
const INTEREST_TYPES = ["flat", "reducing"] as const;
const FARM_STAGES = [
  "land_prep",
  "sowing",
  "growth",
  "harvesting",
  "completed",
] as const;

export function validateStartLog(data: {
  vehicleId?: unknown;
  projectId?: unknown;
  startEngineHours?: unknown;
  gpsLatStart?: unknown;
  gpsLngStart?: unknown;
}) {
  return {
    vehicleId: assertUUID(data.vehicleId, "vehicleId"),
    projectId: assertOptionalUUID(data.projectId),
    startEngineHours: assertNumericString(
      data.startEngineHours,
      "startEngineHours"
    ),
    gpsLatStart: assertOptionalString(data.gpsLatStart),
    gpsLngStart: assertOptionalString(data.gpsLngStart),
  };
}

export function validateEndLog(data: {
  endEngineHours?: unknown;
  fuelUsedLiters?: unknown;
  kmTraveled?: unknown;
  acresWorked?: unknown;
  gpsLatEnd?: unknown;
  gpsLngEnd?: unknown;
  notes?: unknown;
}) {
  return {
    endEngineHours: assertNumericString(data.endEngineHours, "endEngineHours"),
    fuelUsedLiters: assertOptionalNumericString(data.fuelUsedLiters),
    kmTraveled: assertOptionalNumericString(data.kmTraveled),
    acresWorked: assertOptionalNumericString(data.acresWorked),
    gpsLatEnd: assertOptionalString(data.gpsLatEnd),
    gpsLngEnd: assertOptionalString(data.gpsLngEnd),
    notes: assertOptionalString(data.notes),
  };
}

export function validateExpense(data: {
  vehicleId?: unknown;
  projectId?: unknown;
  dailyLogId?: unknown;
  category?: unknown;
  amount?: unknown;
  description?: unknown;
  date?: unknown;
}) {
  return {
    vehicleId: assertOptionalUUID(data.vehicleId),
    projectId: assertOptionalUUID(data.projectId),
    dailyLogId: assertOptionalUUID(data.dailyLogId),
    category: assertEnum(data.category, "category", EXPENSE_CATEGORIES),
    amount: assertNumericString(data.amount, "amount"),
    description: assertOptionalString(data.description),
    date: assertDate(data.date, "date"),
  };
}

export function validateVehicle(data: {
  name?: unknown;
  registrationNumber?: unknown;
  vehicleType?: unknown;
  billingModel?: unknown;
  ratePerHour?: unknown;
  ratePerAcre?: unknown;
  ratePerKm?: unknown;
  ratePerTask?: unknown;
  fuelConsumptionBaseline?: unknown;
  maintenanceIntervalHours?: unknown;
  currentEngineHours?: unknown;
  status?: unknown;
  notes?: unknown;
}) {
  return {
    name: assertString(data.name, "name"),
    registrationNumber: assertOptionalString(data.registrationNumber),
    vehicleType: assertEnum(data.vehicleType, "vehicleType", VEHICLE_TYPES),
    billingModel: assertEnum(data.billingModel, "billingModel", BILLING_MODELS),
    ratePerHour: assertOptionalNumericString(data.ratePerHour),
    ratePerAcre: assertOptionalNumericString(data.ratePerAcre),
    ratePerKm: assertOptionalNumericString(data.ratePerKm),
    ratePerTask: assertOptionalNumericString(data.ratePerTask),
    fuelConsumptionBaseline: assertOptionalNumericString(
      data.fuelConsumptionBaseline
    ),
    maintenanceIntervalHours: assertOptionalPositiveInt(
      data.maintenanceIntervalHours
    ),
    currentEngineHours: assertOptionalNumericString(data.currentEngineHours),
    status: assertEnum(data.status, "status", VEHICLE_STATUSES),
    notes: assertOptionalString(data.notes),
  };
}

export function validateStaff(data: {
  phone?: unknown;
  password?: unknown;
  role?: unknown;
  preferredLocale?: unknown;
  fullName?: unknown;
  staffPhone?: unknown;
  nicNumber?: unknown;
  payRate?: unknown;
  payType?: unknown;
}) {
  return {
    phone: assertString(data.phone, "phone"),
    password: assertOptionalString(data.password),
    role: assertEnum(data.role, "role", USER_ROLES),
    preferredLocale: assertEnum(
      data.preferredLocale,
      "preferredLocale",
      LOCALES
    ),
    fullName: assertString(data.fullName, "fullName"),
    staffPhone: assertOptionalString(data.staffPhone),
    nicNumber: assertOptionalString(data.nicNumber),
    payRate: assertOptionalNumericString(data.payRate),
    payType: assertEnum(data.payType, "payType", PAY_TYPES),
  };
}

export function validateProject(data: {
  name?: unknown;
  clientName?: unknown;
  clientPhone?: unknown;
  siteLocationText?: unknown;
  siteGpsLat?: unknown;
  siteGpsLng?: unknown;
  status?: unknown;
  estimatedHours?: unknown;
  estimatedCost?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  notes?: unknown;
}) {
  return {
    name: assertString(data.name, "name"),
    clientName: assertOptionalString(data.clientName),
    clientPhone: assertOptionalString(data.clientPhone),
    siteLocationText: assertOptionalString(data.siteLocationText),
    siteGpsLat: assertOptionalString(data.siteGpsLat),
    siteGpsLng: assertOptionalString(data.siteGpsLng),
    status: assertEnum(data.status, "status", PROJECT_STATUSES),
    estimatedHours: assertOptionalNumericString(data.estimatedHours),
    estimatedCost: assertOptionalNumericString(data.estimatedCost),
    startDate: assertOptionalDate(data.startDate),
    endDate: assertOptionalDate(data.endDate),
    notes: assertOptionalString(data.notes),
  };
}

export function validateFarm(data: {
  name?: unknown;
  areaAcres?: unknown;
  locationText?: unknown;
  gpsLat?: unknown;
  gpsLng?: unknown;
  soilType?: unknown;
  waterSource?: unknown;
  isActive?: unknown;
}) {
  return {
    name: assertString(data.name, "name"),
    areaAcres: assertNumericString(data.areaAcres, "areaAcres"),
    locationText: assertOptionalString(data.locationText),
    gpsLat: assertOptionalString(data.gpsLat),
    gpsLng: assertOptionalString(data.gpsLng),
    soilType: assertOptionalString(data.soilType),
    waterSource: assertOptionalString(data.waterSource),
    isActive: data.isActive !== false,
  };
}

export function validateFarmCycle(data: {
  seasonName?: unknown;
  stage?: unknown;
  startDate?: unknown;
  expectedEndDate?: unknown;
  notes?: unknown;
}) {
  return {
    seasonName: assertString(data.seasonName, "seasonName"),
    stage: assertEnum(data.stage, "stage", FARM_STAGES),
    startDate: assertDate(data.startDate, "startDate"),
    expectedEndDate: assertOptionalDate(data.expectedEndDate),
    notes: assertOptionalString(data.notes),
  };
}

export function validateInvoice(data: {
  invoiceNumber?: unknown;
  projectId?: unknown;
  clientName?: unknown;
  clientPhone?: unknown;
  subtotal?: unknown;
  discountAmount?: unknown;
  taxAmount?: unknown;
  total?: unknown;
  status?: unknown;
  paymentDueDate?: unknown;
  notes?: unknown;
}) {
  return {
    invoiceNumber: assertString(data.invoiceNumber, "invoiceNumber"),
    projectId: assertOptionalUUID(data.projectId),
    clientName: assertOptionalString(data.clientName),
    clientPhone: assertOptionalString(data.clientPhone),
    subtotal: assertOptionalNumericString(data.subtotal) ?? "0",
    discountAmount: assertOptionalNumericString(data.discountAmount) ?? "0",
    taxAmount: assertOptionalNumericString(data.taxAmount) ?? "0",
    total: assertOptionalNumericString(data.total) ?? "0",
    status: data.status
      ? assertEnum(data.status, "status", INVOICE_STATUSES)
      : ("draft" as const),
    paymentDueDate: assertOptionalDate(data.paymentDueDate),
    notes: assertOptionalString(data.notes),
  };
}

export function validateInvoiceItem(data: {
  description?: unknown;
  quantity?: unknown;
  unit?: unknown;
  rate?: unknown;
  amount?: unknown;
  sortOrder?: unknown;
}) {
  return {
    description: assertString(data.description, "description"),
    quantity: assertNumericString(data.quantity, "quantity"),
    unit: assertOptionalString(data.unit),
    rate: assertNumericString(data.rate, "rate"),
    amount: assertNumericString(data.amount, "amount"),
    sortOrder: assertOptionalPositiveInt(data.sortOrder) ?? 0,
  };
}

export function validateInvoicePayment(data: {
  amount?: unknown;
  paymentType?: unknown;
  paymentDate?: unknown;
  notes?: unknown;
}) {
  return {
    amount: assertNumericString(data.amount, "amount"),
    paymentType: assertEnum(
      data.paymentType,
      "paymentType",
      PAYMENT_TYPES
    ),
    paymentDate: assertDate(data.paymentDate, "paymentDate"),
    notes: assertOptionalString(data.notes),
  };
}

export function validateLoan(data: {
  loanType?: unknown;
  lenderName?: unknown;
  lenderPhone?: unknown;
  principalAmount?: unknown;
  interestRatePercent?: unknown;
  interestType?: unknown;
  termMonths?: unknown;
  emiAmount?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  vehicleId?: unknown;
  notes?: unknown;
}) {
  return {
    loanType: assertEnum(data.loanType, "loanType", LOAN_TYPES),
    lenderName: assertString(data.lenderName, "lenderName"),
    lenderPhone: assertOptionalString(data.lenderPhone),
    principalAmount: assertNumericString(
      data.principalAmount,
      "principalAmount"
    ),
    interestRatePercent: assertOptionalNumericString(data.interestRatePercent),
    interestType: data.interestType
      ? assertEnum(data.interestType, "interestType", INTEREST_TYPES)
      : undefined,
    termMonths: assertOptionalPositiveInt(data.termMonths),
    emiAmount: assertOptionalNumericString(data.emiAmount),
    startDate: assertOptionalDate(data.startDate),
    endDate: assertOptionalDate(data.endDate),
    vehicleId: assertOptionalUUID(data.vehicleId),
    notes: assertOptionalString(data.notes),
  };
}

export function validateLoanPayment(data: {
  amount?: unknown;
  principalPortion?: unknown;
  interestPortion?: unknown;
  paymentDate?: unknown;
  paymentMethod?: unknown;
  referenceNumber?: unknown;
  notes?: unknown;
}) {
  return {
    amount: assertNumericString(data.amount, "amount"),
    principalPortion: assertOptionalNumericString(data.principalPortion),
    interestPortion: assertOptionalNumericString(data.interestPortion),
    paymentDate: assertDate(data.paymentDate, "paymentDate"),
    paymentMethod: assertOptionalString(data.paymentMethod),
    referenceNumber: assertOptionalString(data.referenceNumber),
    notes: assertOptionalString(data.notes),
  };
}

export function validateReceivable(data: {
  type?: unknown;
  debtorName?: unknown;
  debtorPhone?: unknown;
  projectId?: unknown;
  invoiceId?: unknown;
  principalAmount?: unknown;
  interestRatePercent?: unknown;
  totalDue?: unknown;
  dueDate?: unknown;
  notes?: unknown;
}) {
  return {
    type: assertEnum(data.type, "type", RECEIVABLE_TYPES),
    debtorName: assertString(data.debtorName, "debtorName"),
    debtorPhone: assertOptionalString(data.debtorPhone),
    projectId: assertOptionalUUID(data.projectId),
    invoiceId: assertOptionalUUID(data.invoiceId),
    principalAmount: assertNumericString(
      data.principalAmount,
      "principalAmount"
    ),
    interestRatePercent: assertOptionalNumericString(data.interestRatePercent),
    totalDue: assertOptionalNumericString(data.totalDue),
    dueDate: assertOptionalDate(data.dueDate),
    notes: assertOptionalString(data.notes),
  };
}
