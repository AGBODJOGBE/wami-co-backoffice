import "server-only";

import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import type { PassengerRow } from "../store";

/**
 * Raw user shape as returned by GET /api/admin/users.
 * The backend may use `id` or `userId` — we accept both.
 */
interface UserRow {
  id?: string;
  userId?: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  phone?: string;
  email: string | null;
  isActive: boolean;
  hasPassengerProfile?: boolean;
  createdAt: string;
  address?: { city?: string };
}

interface UsersPayload {
  users: UserRow[];
  total: number;
}

/** Map a raw UserRow from the API to the PassengerRow shape used by the UI. */
function mapUserToPassenger(u: UserRow): PassengerRow {
  return {
    passengerId: u.id ?? u.userId ?? "",
    fullName: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim(),
    phone: u.phoneNumber ?? u.phone ?? "",
    email: u.email ?? "",
    isActive: u.isActive,
    isSuspended: !u.isActive,
    createdAt: u.createdAt ?? "",
    city: u.address?.city ?? "",
    walletBalance: 0,
    totalRides: 0,
    rating: 0,
    registeredAgo: "—",
    lastActivity: "—",
  };
}

/**
 * Tolerates the many shapes the backend might return:
 *  - raw array  [...]
 *  - { users: [...], total: N }
 *  - { items: [...], total: N }
 *  - { data: [...] }
 *  - { data: { users: [...], total: N } }
 *  - { data: { items: [...], total: N } }
 *
 * Note: apiFetch already unwraps { success, data } envelopes, so `raw`
 * is the inner `data` value (or the full payload if no envelope).
 */
function normalizePayload(raw: unknown): UsersPayload {
  // raw array
  if (Array.isArray(raw)) {
    return { users: raw as UserRow[], total: raw.length };
  }

  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;

    // { users: [...], total: N }
    if (Array.isArray(r.users)) {
      return {
        users: r.users as UserRow[],
        total: typeof r.total === "number" ? r.total : (r.users as unknown[]).length,
      };
    }

    // { items: [...], total: N }
    if (Array.isArray(r.items)) {
      return {
        users: r.items as UserRow[],
        total: typeof r.total === "number" ? r.total : (r.items as unknown[]).length,
      };
    }

    // { data: [...] }
    if (Array.isArray(r.data)) {
      return { users: r.data as UserRow[], total: (r.data as unknown[]).length };
    }

    // { data: { users/items: [...], total: N } }
    if (r.data && typeof r.data === "object") {
      const d = r.data as Record<string, unknown>;
      const list = Array.isArray(d.users) ? d.users : Array.isArray(d.items) ? d.items : null;
      if (list) {
        return {
          users: list as UserRow[],
          total: typeof d.total === "number" ? d.total : list.length,
        };
      }
    }
  }

  return { users: [], total: 0 };
}

/**
 * GET /api/admin/users?hasPassengerProfile=true&search=...&isActive=...
 *
 * Returns passengers mapped to the PassengerRow shape used by the UI.
 * Falls back to an empty list on any network/API error so the page
 * still renders.
 */
export async function listPassengers(params?: {
  search?: string;
  isActive?: boolean;
}): Promise<{ passengers: PassengerRow[]; total: number }> {
  const query: Record<string, string | boolean | undefined> = {};
  if (params?.search) query.search = params.search;
  if (params?.isActive !== undefined) query.isActive = params.isActive;

  try {
    const raw = await apiFetch<unknown>(API_ROUTES.adminUsers.list(), { query });
    const { users, total } = normalizePayload(raw);

    // Filter to passenger-profile users when the flag is present in the data.
    // If no user has the flag set, skip the filter (undocumented endpoint may
    // not include it) and show all returned users.
    const hasFlag = users.some((u) => u.hasPassengerProfile !== undefined);
    const filtered = hasFlag ? users.filter((u) => u.hasPassengerProfile) : users;

    return {
      passengers: filtered.map(mapUserToPassenger),
      total: hasFlag ? filtered.length : total,
    };
  } catch {
    // Endpoint may not exist yet — return empty gracefully
    return { passengers: [], total: 0 };
  }
}
