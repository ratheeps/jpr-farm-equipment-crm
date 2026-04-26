export interface InvoiceLogRow {
  date: string;
  startEngineHours: string | null;
  endEngineHours: string | null;
  acresWorked: string | null;
  kmTraveled: string | null;
  vehicleName: string;
  vehicleBillingModel: string;
  vehicleRatePerHour: string | null;
  vehicleRatePerAcre: string | null;
  vehicleRatePerKm: string | null;
  vehicleRatePerTask: string | null;
}

export interface LineItem {
  description: string;
  quantity: string;
  unit: string;
  rate: string;
  amount: string;
}

function getOutputAndRate(log: InvoiceLogRow): { quantity: string; unit: string; rate: string } {
  switch (log.vehicleBillingModel) {
    case "hourly": {
      const hours = Math.max(0, Number(log.endEngineHours ?? 0) - Number(log.startEngineHours ?? 0));
      return { quantity: hours.toFixed(1), unit: "hours", rate: log.vehicleRatePerHour ?? "0" };
    }
    case "per_acre":
      return { quantity: String(Number(log.acresWorked ?? 0)), unit: "acres", rate: log.vehicleRatePerAcre ?? "0" };
    case "per_km":
      return { quantity: Number(log.kmTraveled ?? 0).toFixed(1), unit: "km", rate: log.vehicleRatePerKm ?? "0" };
    case "per_task":
      return { quantity: "1", unit: "tasks", rate: log.vehicleRatePerTask ?? "0" };
    default:
      return { quantity: "0", unit: "units", rate: "0" };
  }
}

export function buildInvoiceLineItems(
  preambleItems: LineItem[],
  logs: InvoiceLogRow[]
): LineItem[] {
  const logItems: LineItem[] = logs.map((log) => {
    const { quantity, unit, rate } = getOutputAndRate(log);
    const amount = String(Number(quantity) * Number(rate));
    return {
      description: `${log.vehicleName} on ${log.date}`,
      quantity,
      unit,
      rate,
      amount,
    };
  });
  return [...preambleItems, ...logItems];
}
