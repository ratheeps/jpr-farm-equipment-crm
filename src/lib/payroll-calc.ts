export interface PayrollLog {
  startEngineHours: string | null;
  endEngineHours: string | null;
  acresWorked: string | null;
  kmTraveled: string | null;
  tripAllowanceOverride: string | null;
  vehicle: {
    vehicleId?: string;
    billingModel: string;
    operatorRatePerUnit: string | null;
    tripAllowance: string | null;
  };
}

export interface PayrollInput {
  payType: string;
  payRate: number;
  logs: PayrollLog[];
  logDays: number;
  leaveDays: number;
  periodDays: number;
}

export interface PayBreakdown {
  basePay: number;
  performanceBonus: number;
  perUnitBonusTotal: number;
  tripAllowanceTotal: number;
  gross: number;
  /** Vehicle IDs that had logs but no operatorRatePerUnit configured (Spec §2.6) */
  unconfiguredVehicleIds: string[];
}

function getOutputUnits(log: PayrollLog): number {
  switch (log.vehicle.billingModel) {
    case "hourly":
      return Math.max(0, Number(log.endEngineHours ?? 0) - Number(log.startEngineHours ?? 0));
    case "per_acre":
      return Number(log.acresWorked ?? 0);
    case "per_km":
      return Number(log.kmTraveled ?? 0);
    case "per_task":
      return log.endEngineHours != null ? 1 : 0;
    default:
      return 0;
  }
}

export function computePayBreakdown(input: PayrollInput): PayBreakdown {
  const { payType, payRate, logs, logDays, leaveDays, periodDays } = input;

  // Step 1: basePay — preserves existing logic
  let basePay = 0;
  let performanceBonus = 0;

  switch (payType) {
    case "hourly": {
      const totalHours = logs.reduce((sum, log) => {
        return sum + Math.max(0, Number(log.endEngineHours ?? 0) - Number(log.startEngineHours ?? 0));
      }, 0);
      basePay = totalHours * payRate;
      break;
    }
    case "daily":
      basePay = Math.max(0, logDays - leaveDays) * payRate;
      break;
    case "monthly":
      basePay = periodDays > 0
        ? payRate * (periodDays - leaveDays) / periodDays
        : payRate;
      break;
    case "per_acre": {
      const totalAcres = logs.reduce((sum, log) => sum + Number(log.acresWorked ?? 0), 0);
      performanceBonus = totalAcres * payRate;
      basePay = 0;
      break;
    }
  }

  // Step 2: perUnitBonusTotal — new additive bonus from vehicle operatorRatePerUnit
  let perUnitBonusTotal = 0;
  const unconfiguredVehicleIds: string[] = [];
  for (const log of logs) {
    const rate = Number(log.vehicle.operatorRatePerUnit ?? 0);
    if (rate > 0) {
      perUnitBonusTotal += rate * getOutputUnits(log);
    } else if (log.vehicle.operatorRatePerUnit == null && log.vehicle.vehicleId) {
      // Spec §2.6: track vehicles without configured rates so admin can fix
      if (!unconfiguredVehicleIds.includes(log.vehicle.vehicleId)) {
        unconfiguredVehicleIds.push(log.vehicle.vehicleId);
      }
    }
  }

  // Step 3: tripAllowanceTotal
  let tripAllowanceTotal = 0;
  for (const log of logs) {
    const allowance = Number(
      log.tripAllowanceOverride ?? log.vehicle.tripAllowance ?? 0
    );
    tripAllowanceTotal += allowance;
  }

  const gross = basePay + performanceBonus + perUnitBonusTotal + tripAllowanceTotal;

  return { basePay, performanceBonus, perUnitBonusTotal, tripAllowanceTotal, gross, unconfiguredVehicleIds };
}
