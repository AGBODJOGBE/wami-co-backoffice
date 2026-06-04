/**
 * Surge rules domain. Mirrors the OpenAPI SurgeRuleBody schema.
 *   GET    /api/admin/surge-rules
 *   POST   /api/admin/surge-rules
 *   PATCH  /api/admin/surge-rules/{ruleId}
 *   DELETE /api/admin/surge-rules/{ruleId}
 */

import type { RideVehicleType } from "./ride-pricing";

export interface SurgeTimeWindow {
  startHour: number;
  endHour: number;
  daysOfWeek?: number[];
}

export interface SurgeZone {
  name: string;
  coordinates: number[][];
}

export interface SurgeDemandConfig {
  requestsPerDriverThreshold: number;
}

export interface SurgeRuleInput {
  name: string;
  description?: string;
  multiplier: number;
  priority: number;
  vehicleTypes?: RideVehicleType[];
  timeWindows?: SurgeTimeWindow[];
  zones?: SurgeZone[];
  specialDates?: string[];
  demandConfig?: SurgeDemandConfig | null;
  isActive?: boolean;
}

export interface SurgeRule extends SurgeRuleInput {
  id: string;
  createdAt?: string;
  updatedAt?: string;
}

export const DAYS_OF_WEEK_LABELS: Record<number, string> = {
  0: "Dim",
  1: "Lun",
  2: "Mar",
  3: "Mer",
  4: "Jeu",
  5: "Ven",
  6: "Sam",
};

export function defaultSurgeRule(): SurgeRuleInput {
  return {
    name: "",
    description: "",
    multiplier: 1.5,
    priority: 10,
    vehicleTypes: [],
    timeWindows: [],
    zones: [],
    specialDates: [],
    isActive: true,
  };
}
