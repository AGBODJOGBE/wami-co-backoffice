import "server-only";

import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import type {
  Contract,
  ContractInstallment,
  ContractStatus,
} from "../domain/contract";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeContract(raw: unknown): Contract {
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    // Unwrap nested data if double-enveloped
    const c = (r.data ?? r) as Record<string, unknown>;
    return c as unknown as Contract;
  }
  return raw as Contract;
}

function normalizeList(raw: unknown): { items: Contract[]; total: number; page: number; limit: number } {
  const empty = { items: [], total: 0, page: 1, limit: 20 };
  if (!raw || typeof raw !== "object") return empty;

  const r = raw as Record<string, unknown>;
  // { items, total, page, limit }
  if (Array.isArray(r.items)) {
    return {
      items: r.items as Contract[],
      total: typeof r.total === "number" ? r.total : (r.items as unknown[]).length,
      page: typeof r.page === "number" ? r.page : 1,
      limit: typeof r.limit === "number" ? r.limit : 20,
    };
  }
  // Wrapped in data: { data: { items, total } }
  if (r.data && typeof r.data === "object") {
    const d = r.data as Record<string, unknown>;
    if (Array.isArray(d.items)) {
      return {
        items: d.items as Contract[],
        total: typeof d.total === "number" ? d.total : (d.items as unknown[]).length,
        page: typeof d.page === "number" ? d.page : 1,
        limit: typeof d.limit === "number" ? d.limit : 20,
      };
    }
  }
  return empty;
}

function normalizeInstallments(raw: unknown): ContractInstallment[] {
  if (Array.isArray(raw)) return raw as ContractInstallment[];
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    const list = r.installments ?? r.items ?? r.data;
    if (Array.isArray(list)) return list as ContractInstallment[];
    if (r.data && typeof r.data === "object") {
      const d = r.data as Record<string, unknown>;
      const inner = d.installments ?? d.items;
      if (Array.isArray(inner)) return inner as ContractInstallment[];
    }
  }
  return [];
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface ListContractsParams {
  page?: number;
  limit?: number;
  status?: ContractStatus | "";
  driverId?: string;
  search?: string;
}

export async function listContracts(
  params?: ListContractsParams,
): Promise<{ items: Contract[]; total: number; page: number; limit: number }> {
  const query: Record<string, string | number | undefined> = {
    page: params?.page ?? 1,
    limit: params?.limit ?? 20,
  };
  if (params?.status) query.status = params.status;
  if (params?.driverId) query.driverId = params.driverId;
  if (params?.search) query.search = params.search;

  const raw = await apiFetch<unknown>(API_ROUTES.adminContracts.list(), { query });
  return normalizeList(raw);
}

export async function getContract(id: string): Promise<Contract> {
  const raw = await apiFetch<unknown>(API_ROUTES.adminContracts.detail(id));
  return normalizeContract(raw);
}

export async function getContractInstallments(
  id: string,
): Promise<ContractInstallment[]> {
  const raw = await apiFetch<unknown>(API_ROUTES.adminContracts.installments(id));
  return normalizeInstallments(raw);
}
