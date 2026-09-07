/**
 * Admin-side view of a driver.
 *
 * Backend exposes today:
 *   - GET    /api/admin/drivers                   (rich list — list of AdminDriver)
 *   - GET    /api/admin/drivers/online            (online drivers + GPS — OnlineDriver)
 *   - GET    /api/admin/drivers/pending           (PendingDriver)
 *   - PATCH  /api/admin/drivers/{id}/approve
 *   - PATCH  /api/admin/drivers/{id}/suspend     (body: { reason })
 *   - PATCH  /api/admin/drivers/{id}/reactivate
 */

/** Status values returned by /drivers list and approve/suspend/reactivate. */
export type AdminDriverStatus =
  | "PENDING"
  | "OFFLINE"
  | "ONLINE"
  | "AVAILABLE"
  | "BUSY"
  | "SUSPENDED";

/** Item returned by GET /api/admin/drivers/pending. */
export interface PendingDriver {
  driverId: string;
  userId: string;
  category: string;
  isDocumentsVerified: boolean;
  createdAt: string;
  /** Real status from GET /api/admin/drivers — used to show "Réactiver" vs "Suspendre". */
  status?: AdminDriverStatus;
  /** Enriched server-side by cross-referencing GET /api/admin/drivers when
   * available — keeps the pending UI showing real names. */
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  photoUrl?: string | null;
}

export interface PendingDriversResult {
  drivers: PendingDriver[];
  total: number;
}

/** Common shape returned by approve/suspend/reactivate. */
export interface DriverStatusChangeResult {
  driverId: string;
  status: AdminDriverStatus;
  message: string;
}

/** Embedded vehicle summary returned in /drivers and /drivers/online. */
export interface DriverVehicleSummary {
  vehicleId: string;
  vehicleType: string;
  /** Service level category of the vehicle: ECO | STANDARD | PREMIUM | VIP */
  vehicleCategory: string | null;
  make: string;
  model: string;
  color: string;
  licensePlate: string;
}

/** Item returned by GET /api/admin/drivers (rich, joined with user + vehicle). */
export interface AdminDriver {
  driverId: string;
  userId: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  photoUrl?: string | null;
  status: AdminDriverStatus;
  driverType: string;
  category: string;
  rating: number;
  totalRides: number;
  isApproved: boolean;
  isVehicleOwner: boolean;
  /** Enrichi côté serveur depuis /api/admin/drivers/pending */
  isDocumentsVerified?: boolean;
  vehicle?: DriverVehicleSummary | null;
  createdAt: string;
  /**
   * Enrichi côté serveur en croisant GET /api/admin/drivers/online.
   * true = app ouverte + GPS actif en ce moment.
   * undefined = données online non disponibles (fallback gracieux).
   * Réversible : supprimer l'enrichissement dans page.tsx suffit à revenir en arrière.
   */
  isOnline?: boolean;
}

export interface AdminDriversResult {
  drivers: AdminDriver[];
  total: number;
}

/** Item returned by GET /api/admin/drivers/online (with GPS position). */
export interface OnlineDriver {
  driverId: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  photoUrl?: string | null;
  rating: number;
  totalRides: number;
  latitude: number;
  longitude: number;
  heading: number;
  speed: number;
  vehicle?: DriverVehicleSummary | null;
  currentRideId?: string | null;
  isInRide: boolean;
  updatedAt: string;
}

export interface OnlineDriversResult {
  drivers: OnlineDriver[];
  total: number;
}

/** Raison de fin de session de connexion driver. */
export type SessionEndReason = "LOGOUT" | "SUPERSEDED" | "TIMEOUT";

/** Item retourné par GET /api/admin/drivers/:driverId/sessions */
export interface DriverConnectionSession {
  id: string;
  driverId: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  endReason: SessionEndReason | null;
}

export interface DriverSessionsResult {
  sessions: DriverConnectionSession[];
  total: number;
  totalDurationSeconds: number;
  page: number;
  limit: number;
}

// ─── Driver type ─────────────────────────────────────────────────────────────

export type DriverType = "VTC" | "DELIVERY" | "BOTH";

export const DRIVER_TYPE_LABELS: Record<DriverType, string> = {
  VTC:      "VTC",
  DELIVERY: "Livraison",
  BOTH:     "VTC + Livraison",
};

export interface UpdateDriverTypeResponse {
  driverId:   string;
  driverType: DriverType;
  message:    string;
}

// ─── UpdateDriverInfo ─────────────────────────────────────────────────────────

export interface UpdateDriverInfoInput {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  email?: string;
  gender?: "MALE" | "FEMALE";
  address?: {
    city: string;
    quarter: string;
    street?: string;
    details?: string;
    landmark?: string;
  };
}

// ─── Commission debts ─────────────────────────────────────────────────────────

export interface DriverCommissionDebtRow {
  driverId: string;
  walletId: string;
  driverName: string;
  driverPhone: string;
  driverStatus: string;
  debtAmount: number;
  mainBalance: number;
  bonusBalance: number;
  referralBalance: number;
  updatedAt: string;
}

export interface DriverCommissionDebtsListResult {
  drivers: DriverCommissionDebtRow[];
  total: number;
  totalDebtAmount: number;
  page: number;
  limit: number;
}

export type DebtSource = "RIDE" | "B2C_DELIVERY" | "CONTRACT_INSTALLMENT";

export interface DriverDebtItem {
  transactionId: string;
  source: DebtSource;
  entityId: string;
  entityNumber: string;
  commissionAmount: number;
  description: string;
  date: string;
}

export interface DriverCommissionDebtDetail {
  driverId: string;
  walletId: string;
  driverName: string;
  driverPhone: string;
  debtAmount: number;
  currentBalance: number;
  items: DriverDebtItem[];
  total: number;
  page: number;
  limit: number;
}

// ─── Daily connection time (DailyConnectionTimeSplitter) ─────────────────────

export interface DailyConnectionEntry {
  date: string;         // YYYY-MM-DD (Africa/Porto-Novo)
  totalSeconds: number;
  totalHours: number;
}

export interface DriverDailyConnectionReport {
  driverId: string;
  days: DailyConnectionEntry[];
  grandTotalSeconds: number;
  grandTotalHours: number;
}

export interface DriverConnectionTimeByDayResponse {
  from: string;
  to: string;
  drivers: DriverDailyConnectionReport[];
}

// ─────────────────────────────────────────────────────────────────────────────

export function fullName(d: { firstName?: string; lastName?: string }): string {
  return `${d.firstName ?? ""} ${d.lastName ?? ""}`.trim();
}

export const ADMIN_DRIVER_STATUS_META: Record<
  AdminDriverStatus,
  {
    label: string;
    tone: "neutral" | "primary" | "success" | "warning" | "danger" | "info";
  }
> = {
  PENDING: { label: "En attente", tone: "warning" },
  OFFLINE: { label: "Hors ligne", tone: "neutral" },
  ONLINE: { label: "En ligne", tone: "success" },
  AVAILABLE: { label: "Disponible", tone: "success" },
  BUSY: { label: "Occupé", tone: "info" },
  SUSPENDED: { label: "Suspendu", tone: "danger" },
};

export function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return "à l'instant";
  const min = Math.floor(sec / 60);
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `il y a ${d} j`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `il y a ${mo} mois`;
  return `il y a ${Math.floor(mo / 12)} an${Math.floor(mo / 12) > 1 ? "s" : ""}`;
}
