import {
  Tractor,
  Truck,
  Combine,
  Wheat,
  TreePalm,
  Fuel,
  Users,
  Wrench,
  Coins,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";

const map: Record<string, LucideIcon> = {
  "vehicle.tractor": Tractor,
  "vehicle.truck": Truck,
  "vehicle.harvester": Combine,
  "crop.paddy": Wheat,
  "crop.coconut": TreePalm,
  "expense.fuel": Fuel,
  "expense.wages": Users,
  "expense.maintenance": Wrench,
  "expense.other": Coins,
};

export function resolveEntityIcon(key: string): LucideIcon {
  return map[key] ?? HelpCircle;
}
