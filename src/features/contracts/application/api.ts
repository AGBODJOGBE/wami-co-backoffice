import "server-only";

import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import type {
  Contract,
  ContractAuditLog,
  ContractAuditLogsResult,
  ContractInstallment,
  ContractKpis,
  ContractStatus,
} from "../domain/contract";

// ─── Field mappings (API → domain) ───────────────────────────────────────────

const STATUT_MAP: Record<string, ContractStatus> = {
  ACTIF:      "ACTIVE",
  SUSPENDU:   "SUSPENDED", // driver bloqué pour impayés — statut distinct
  ROMPU:      "BROKEN",
  SOLDE:      "COMPLETED",
  TERMINE:    "TERMINATED",
  EN_ATTENTE: "PENDING",
  // passthrough for already-normalised values
  ACTIVE:      "ACTIVE",
  SUSPENDED:   "SUSPENDED",
  BROKEN:      "BROKEN",
  COMPLETED:   "COMPLETED",
  TERMINATED:  "TERMINATED",
  PENDING:     "PENDING",
};

// Backend uses French frequency values — keep as-is
const FREQ_MAP: Record<string, string> = {
  MENSUEL: "MENSUEL",
  HEBDOMADAIRE: "HEBDOMADAIRE",
  JOURNALIER: "JOURNALIER",
  // legacy English passthrough (just in case)
  MONTHLY: "MENSUEL",
  WEEKLY: "HEBDOMADAIRE",
  DAILY: "JOURNALIER",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeContract(raw: unknown): Contract {
  if (!raw || typeof raw !== "object") return raw as Contract;

  const r = raw as Record<string, unknown>;
  // Unwrap nested data if double-enveloped
  const c = (r.data && typeof r.data === "object" ? r.data : r) as Record<string, unknown>;

  // Map API field names → domain field names
  const contractId = (c.contractId ?? c.id ?? "") as string;
  const rawStatut = (c.statut ?? c.status ?? "PENDING") as string;
  const status: ContractStatus = STATUT_MAP[rawStatut] ?? "PENDING";
  const rawFreq = (c.frequenceEcheances ?? c.frequencePaiement ?? "MENSUEL") as string;
  const frequencePaiement = (FREQ_MAP[rawFreq] ?? "MENSUEL") as import("../domain/contract").PaymentFrequency;

  // Build minimal driver/vehicle stubs if the list doesn't embed them
  const driver = (c.driver && typeof c.driver === "object"
    ? c.driver
    : { driverId: (c.driverId ?? "") as string }
  ) as import("../domain/contract").ContractDriver;

  const vehicle = (c.vehicle && typeof c.vehicle === "object"
    ? c.vehicle
    : { vehicleId: (c.vehicleId ?? "") as string }
  ) as import("../domain/contract").ContractVehicle;

  return {
    contractId,
    status,
    driver,
    vehicle,
    prixAchat: (c.purchasePriceSnapshot ?? undefined) as number | undefined,
    dateDebut: (c.dateDebut ?? "") as string,
    dateFin: (c.dateFin ?? c.dateFinPrevue ?? null) as string | null,
    dureeMois: (c.dureeMois ?? 0) as number,
    montantTotal: (c.montantTotal ?? 0) as number,
    apport: (c.apport ?? 0) as number,
    tauxInteret: (c.marginPct ?? c.tauxInteret ?? 0) as number,
    frequencePaiement,
    montantMensuel: (c.montantMensuel ?? c.montantEcheance) as number | undefined,
    montantPaye: (c.montantPaye ?? undefined) as number | undefined,
    montantRestant: (c.montantRestant) as number | undefined,
    echeancesTotal: (c.echeancesTotal ?? c.nbEcheances) as number | undefined,
    echeancesPayees: (c.echeancesPayees ?? c.nbPaies) as number | undefined,
    nbImpayes: (c.nbImpayes ?? undefined) as number | undefined,
    createdAt: (c.createdAt ?? "") as string,
    updatedAt: (c.updatedAt ?? "") as string,
    breakReason: (c.brokenReason ?? c.breakReason ?? c.motifRupture ?? null) as string | null,
    montantCaution: (c.montantCaution ?? undefined) as number | undefined,
    cautionRestituee: (c.cautionRestituee ?? undefined) as boolean | undefined,
  };
}

function normalizeList(raw: unknown): { items: Contract[]; total: number; page: number; limit: number } {
  const empty = { items: [], total: 0, page: 1, limit: 20 };
  if (!raw || typeof raw !== "object") return empty;

  const r = raw as Record<string, unknown>;
  // { items, total, page, limit }
  if (Array.isArray(r.items)) {
    return {
      items: r.items.map(normalizeContract),
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
        items: d.items.map(normalizeContract),
        total: typeof d.total === "number" ? d.total : (d.items as unknown[]).length,
        page: typeof d.page === "number" ? d.page : 1,
        limit: typeof d.limit === "number" ? d.limit : 20,
      };
    }
  }
  return empty;
}

function normalizeInstallment(raw: unknown): ContractInstallment {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    installmentId: (r.installmentId ?? r.id ?? "") as string,
    contractId: r.contractId as string | undefined,
    numero: (r.numero ?? 0) as number,
    montant: (r.montant ?? 0) as number,
    dateEcheance: (r.dateEcheance ?? "") as string,
    datePaiement: (r.datePaiement ?? null) as string | null,
    status: (r.statut ?? r.status ?? "EN_ATTENTE") as import("../domain/contract").InstallmentStatus,
    retardJours: r.retardJours as number | undefined,
    penalite: r.penalite as number | undefined,
  };
}

function normalizeInstallments(raw: unknown): ContractInstallment[] {
  if (Array.isArray(raw)) return raw.map(normalizeInstallment);
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    const list = r.installments ?? r.items ?? r.data;
    if (Array.isArray(list)) return list.map(normalizeInstallment);
    if (r.data && typeof r.data === "object") {
      const d = r.data as Record<string, unknown>;
      const inner = d.installments ?? d.items;
      if (Array.isArray(inner)) return inner.map(normalizeInstallment);
    }
  }
  return [];
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface ListContractsParams {
  page?: number;
  limit?: number;
  /** Valeurs acceptées par le backend : ACTIF | SUSPENDU | TERMINE | ROMPU */
  status?: ContractStatus | "";
  driverId?: string;
  vehicleId?: string;
}

// Frontend status → backend statut query param
const STATUS_TO_STATUT: Record<string, string> = {
  ACTIVE:     "ACTIF",
  BROKEN:     "ROMPU",
  TERMINATED: "TERMINE",
  // COMPLETED et PENDING non supportés comme filtre par le backend
};

export async function listContracts(
  params?: ListContractsParams,
): Promise<{ items: Contract[]; total: number; page: number; limit: number }> {
  const query: Record<string, string | number | undefined> = {
    page: params?.page ?? 1,
    limit: params?.limit ?? 20,
  };
  if (params?.status) {
    const mapped = STATUS_TO_STATUT[params.status];
    if (mapped) query.statut = mapped;
  }
  if (params?.driverId) query.driverId = params.driverId;
  if (params?.vehicleId) query.vehicleId = params.vehicleId;

  const raw = await apiFetch<unknown>(API_ROUTES.adminContracts.list(), { query });
  return normalizeList(raw);
}

export async function getContractKpis(): Promise<ContractKpis> {
  return apiFetch<ContractKpis>(API_ROUTES.adminContracts.kpis());
}

export interface ListAuditLogsParams {
  contractId?: string;
  driverId?: string;
  action?: string;
  page?: number;
  limit?: number;
}

export async function listContractAuditLogs(
  params?: ListAuditLogsParams,
): Promise<ContractAuditLogsResult> {
  const empty: ContractAuditLogsResult = { items: [], total: 0, page: 1, limit: 20 };
  const query: Record<string, string | number | undefined> = {
    page: params?.page ?? 1,
    limit: params?.limit ?? 20,
  };
  if (params?.contractId) query.contractId = params.contractId;
  if (params?.driverId) query.driverId = params.driverId;
  if (params?.action) query.action = params.action;

  const raw = await apiFetch<unknown>(API_ROUTES.adminContracts.auditLogs(), { query });
  if (!raw || typeof raw !== "object") return empty;
  const r = raw as Record<string, unknown>;
  if (Array.isArray(r.items)) {
    return {
      items: r.items as ContractAuditLog[],
      total: typeof r.total === "number" ? r.total : (r.items as unknown[]).length,
      page: typeof r.page === "number" ? r.page : 1,
      limit: typeof r.limit === "number" ? r.limit : 20,
    };
  }
  return empty;
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
