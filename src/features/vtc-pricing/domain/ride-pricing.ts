/**
 * Ride pricing domain. Mirrors PATCH /api/admin/ride-pricing/{vehicleType}.
 *
 * Versioning note: each PATCH deactivates the previous config and creates
 * a new version — never edit in place. There is currently no
 * `GET /api/admin/ride-pricing/{vehicleType}` endpoint to read the current
 * config; until then the form starts from sane defaults each time.
 */

export type RideVehicleType =
  | "MOTO"
  | "TRICYCLE"
  | "ECO"
  | "STANDARD"
  | "CONFORT"
  | "VIP"
  | "VAN";

export const RIDE_VEHICLE_LABELS: Record<RideVehicleType, string> = {
  MOTO: "Moto",
  TRICYCLE: "Tricycle",
  ECO: "Eco",
  STANDARD: "Standard",
  CONFORT: "Confort",
  VIP: "VIP",
  VAN: "Van",
};

export interface DistanceTiers {
  upTo10km: number;
  upTo20km: number;
  upTo30km: number;
  above30km: number;
}

export interface TimedPackage {
  durationMinutes: number;
  price: number;
  includedKm: number;
  extraKmRate: number;
}

export interface RidePricingInput {
  baseFare: number;
  distanceTiers: DistanceTiers;
  perMinute: number;
  minimumFare: number;
  driverShareRate: number;
  routeDeviationThreshold: number;
  freeWaitingMinutes: number;
  waitingFeePerMinute: number;
  /** Minutes after which a passenger no-show is declared. */
  noShowMinutes: number;
  /** Flat fee billed to the passenger on a confirmed no-show (FCFA). */
  noShowFee: number;
  timedPackages: TimedPackage[];
}

export const DEFAULT_RIDE_PRICING: RidePricingInput = {
  baseFare: 200,
  distanceTiers: {
    upTo10km: 150,
    upTo20km: 120,
    upTo30km: 100,
    above30km: 80,
  },
  perMinute: 10,
  minimumFare: 500,
  driverShareRate: 0.82,
  routeDeviationThreshold: 2.5,
  freeWaitingMinutes: 3,
  waitingFeePerMinute: 30,
  noShowMinutes: 15,
  noShowFee: 500,
  timedPackages: [
    {
      durationMinutes: 60,
      price: 2500,
      includedKm: 15,
      extraKmRate: 150,
    },
  ],
};
