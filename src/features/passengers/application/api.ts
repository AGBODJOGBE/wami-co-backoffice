import "server-only";

import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import type { PassengerRow } from "../store";

interface UserRow {
  userId: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface UsersPayload {
  users: UserRow[];
  total: number;
}

/** Map a raw UserRow from the API to the PassengerRow shape used by the UI. */
function mapUserToPassenger(u: UserRow): PassengerRow {
  return {
    passengerId: u.userId,
    fullName: `${u.firstName} ${u.lastName}`.trim(),
    phone: u.phoneNumber,
    email: u.email ?? "",
    isActive: u.isActive,
    // isSuspended is the logical inverse of isActive
    isSuspended: !u.isActive,
    createdAt: u.createdAt,
    // Fields not available from the users endpoint — neutral defaults
    city: "",
    walletBalance: 0,
    totalRides: 0,
    rating: 0,
    registeredAgo: "—",
    lastActivity: "—",
  };
}

/**
 * Tolerates both:
 *   - `{ users, total }` (raw, after apiFetch envelope unwrap)
 *   - `{ data: { users, total } }` (legacy double-wrap)
 */
function normalizePayload(raw: unknown): UsersPayload {
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;

    // Already unwrapped by apiFetch — looks like { users, total }
    if (Array.isArray(r.users) && typeof r.total === "number") {
      return { users: r.users as UserRow[], total: r.total };
    }

    // Double-wrapped — { data: { users, total } }
    if (r.data && typeof r.data === "object") {
      const d = r.data as Record<string, unknown>;
      if (Array.isArray(d.users) && typeof d.total === "number") {
        return { users: d.users as UserRow[], total: d.total };
      }
    }
  }

  return { users: [], total: 0 };
}

/**
 * GET /api/admin/users?role=PASSENGER&search=...&isActive=...
 *
 * Returns passengers mapped to the PassengerRow shape used by the UI.
 */
export async function listPassengers(params?: {
  search?: string;
  isActive?: boolean;
}): Promise<{ passengers: PassengerRow[]; total: number }> {
  const query: Record<string, string | boolean | undefined> = {
    role: "PASSENGER",
  };
  if (params?.search !== undefined && params.search !== "") {
    query.search = params.search;
  }
  if (params?.isActive !== undefined) {
    query.isActive = params.isActive;
  }

  const raw = await apiFetch<unknown>(API_ROUTES.adminUsers.list(), { query });
  const { users, total } = normalizePayload(raw);

  return {
    passengers: users.map(mapUserToPassenger),
    total,
  };
}
