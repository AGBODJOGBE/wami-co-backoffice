"use server";

import { revalidatePath } from "next/cache";
import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import { ApiError } from "@/shared/lib/api/types";
import type {
  Contract,
  CreateContractInput,
  DailyCollectionLine,
  DailyCollectionReport,
  InstallmentStatus,
  ManualPaymentMethod,
  PaymentSource,
} from "../domain/contract";
import { listContracts, getContractInstallments, listContractAuditLogs } from "./api";
import { listAdminDrivers } from "@/features/drivers/application/api";

export interface ActionResult<T = undefined> {
  ok: boolean;
  message: string;
  data?: T;
}

function fail<T = undefined>(error: unknown, fallback: string): ActionResult<T> {
  if (error instanceof ApiError) {
    return { ok: false, message: error.message || fallback };
  }
  return {
    ok: false,
    message: error instanceof Error ? error.message : fallback,
  };
}

// ─── Create ──────────────────────────────────────────────────────────────────

export async function createContractAction(
  input: CreateContractInput,
): Promise<ActionResult<Contract>> {
  try {
    const raw = await apiFetch<unknown>(API_ROUTES.adminContracts.create(), {
      method: "POST",
      body: input,
    });
    // Unwrap envelope
    const data =
      raw && typeof raw === "object" && "data" in (raw as Record<string, unknown>)
        ? (raw as Record<string, unknown>).data
        : raw;
    revalidatePath("/contracts");
    return {
      ok: true,
      message: "Contrat de location-vente créé avec succès.",
      data: data as Contract,
    };
  } catch (e) {
    return fail<Contract>(e, "Impossible de créer le contrat.");
  }
}

// ─── Manual payment ───────────────────────────────────────────────────────────

export interface ManualPaymentResult {
  contract: Contract;
  amount: number;
  imputedAmount: number;
  installmentsSettled: number;
  installmentsPartiallyPaid: number;
  contractCompleted: boolean;
}

/**
 * Enregistre un paiement manuel (cash / MoMo hors plateforme) contre la dette
 * d'un contrat. Le backend impute le montant sur les échéances ouvertes de la
 * plus ancienne à la plus récente via InstallmentLadderImputationService.
 *
 * `paymentMethod` et `reference` sont obligatoires depuis le Lot D §3bis :
 *   - ESPECES      → reference = numéro de reçu papier
 *   - MOBILE_MONEY → reference = numéro de transaction opérateur
 */
export async function recordManualPaymentAction(
  contractId: string,
  amount: number,
  paymentMethod: ManualPaymentMethod,
  reference: string,
): Promise<ActionResult<ManualPaymentResult>> {
  try {
    const raw = await apiFetch<unknown>(API_ROUTES.adminContracts.manualPayment(contractId), {
      method: "POST",
      body: { amount, paymentMethod, reference },
    });
    const data =
      raw && typeof raw === "object" && "data" in (raw as Record<string, unknown>)
        ? (raw as Record<string, unknown>).data
        : raw;
    revalidatePath("/contracts");
    revalidatePath(`/contracts/${contractId}`);
    return {
      ok: true,
      message: "Paiement manuel enregistré.",
      data: data as ManualPaymentResult,
    };
  } catch (e) {
    return fail<ManualPaymentResult>(e, "Impossible d'enregistrer le paiement.");
  }
}

// ─── Unblock driver ───────────────────────────────────────────────────────────

export async function unblockDriverAction(
  driverId: string,
  contractId: string,
): Promise<ActionResult> {
  try {
    await apiFetch<unknown>(API_ROUTES.adminContracts.unblockDriver(driverId), {
      method: "POST",
      body: { reason: "MANUAL_ADMIN" },
    });
    revalidatePath("/contracts");
    revalidatePath(`/contracts/${contractId}`);
    return { ok: true, message: "Chauffeur débloqué avec succès." };
  } catch (e) {
    return fail(e, "Impossible de débloquer le chauffeur.");
  }
}

// ─── Suspend ──────────────────────────────────────────────────────────────────

export async function suspendContractAction(
  contractId: string,
  reason?: string,
): Promise<ActionResult> {
  try {
    await apiFetch<unknown>(API_ROUTES.adminContracts.suspend(contractId), {
      method: "POST",
      body: reason ? { reason } : {},
    });
    revalidatePath("/contracts");
    revalidatePath(`/contracts/${contractId}`);
    return { ok: true, message: "Contrat suspendu." };
  } catch (e) {
    return fail(e, "Impossible de suspendre le contrat.");
  }
}

// ─── Resume ───────────────────────────────────────────────────────────────────

export async function resumeContractAction(
  contractId: string,
  reason?: string,
): Promise<ActionResult> {
  try {
    await apiFetch<unknown>(API_ROUTES.adminContracts.resume(contractId), {
      method: "POST",
      body: reason ? { reason } : {},
    });
    revalidatePath("/contracts");
    revalidatePath(`/contracts/${contractId}`);
    return { ok: true, message: "Contrat repris — statut Actif. Les dates d'échéances ont été repositionnées." };
  } catch (e) {
    return fail(e, "Impossible de reprendre le contrat.");
  }
}

// ─── Rapport quotidien de collecte ───────────────────────────────────────────

/** Trie IMPAYEE → EN_RECOUVREMENT → PARTIELLEMENT_RECOUVREE → PAYEE → reste */
const STATUS_ORDER: Partial<Record<string, number>> = {
  IMPAYEE:                0,
  EN_RECOUVREMENT:        1,
  PARTIELLEMENT_RECOUVREE:2,
  PARTIELLE:              2,
  PAYEE:                  3,
  EN_ATTENTE:             4,
  ANNULEE:                5,
};

/**
 * Retourne toutes les échéances dont la date d'échéance correspond à `date`
 * (YYYY-MM-DD, interprété en timezone Africa/Porto-Novo UTC+1).
 *
 * Limitation workaround : sans endpoint backend dédié, cette action fait
 * N requêtes parallèles (une par contrat ACTIF/SUSPENDU). Ça fonctionne
 * pour des flottes < 500 contrats.
 */
export async function generateDailyCollectionReportAction(
  dateFrom: string,
  dateTo: string,
): Promise<ActionResult<DailyCollectionReport>> {
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  if (!DATE_RE.test(dateFrom) || !DATE_RE.test(dateTo)) {
    return { ok: false, message: "Format de date invalide. Utilisez YYYY-MM-DD." };
  }
  if (dateFrom > dateTo) {
    return { ok: false, message: "La date de début doit être antérieure ou égale à la date de fin." };
  }

  function toPortoNovoDate(isoStr: string): string {
    if (!isoStr) return "";
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Africa/Porto-Novo",
      }).format(new Date(isoStr));
    } catch {
      return (isoStr ?? "").slice(0, 10);
    }
  }

  try {
    const [contractsResult, driversResult] = await Promise.allSettled([
      listContracts({ limit: 500 }),
      listAdminDrivers(),
    ]);

    const allContracts =
      contractsResult.status === "fulfilled" ? contractsResult.value.items : [];
    const driversData =
      driversResult.status === "fulfilled" ? driversResult.value : { drivers: [], total: 0 };

    const driversMap = new Map<string, { name: string; phone: string }>();
    for (const d of driversData.drivers) {
      driversMap.set(d.driverId, {
        name: `${d.firstName ?? ""} ${d.lastName ?? ""}`.trim() || d.driverId,
        phone: d.phoneNumber ?? "",
      });
    }

    const activeContracts = allContracts.filter(
      (c) => c.status === "ACTIVE" || c.status === "SUSPENDED",
    );

    const installmentResults = await Promise.allSettled(
      activeContracts.map((c) => getContractInstallments(c.contractId)),
    );

    const lines: DailyCollectionLine[] = [];
    const byStatus: Partial<Record<InstallmentStatus, number>> = {};

    for (let i = 0; i < activeContracts.length; i++) {
      const contract = activeContracts[i];
      const res = installmentResults[i];
      if (res.status !== "fulfilled") continue;

      const driverFallback = {
        name: contract.driver.firstName
          ? `${contract.driver.firstName} ${contract.driver.lastName ?? ""}`.trim()
          : contract.driver.driverId,
        phone: contract.driver.phoneNumber ?? "",
      };
      const driverInfo = driversMap.get(contract.driver.driverId) ?? driverFallback;

      for (const inst of res.value) {
        const echeanceDate = toPortoNovoDate(inst.dateEcheance);
        if (echeanceDate < dateFrom || echeanceDate > dateTo) continue;

        const montantPaye     = inst.montantPaye    ?? 0;
        const montantRecouvre = inst.montantRecouvre ?? 0;
        const cashShortfall   = Math.max(0, montantPaye - montantRecouvre);

        byStatus[inst.status] = (byStatus[inst.status] ?? 0) + 1;

        lines.push({
          contractId:          contract.contractId,
          installmentId:       inst.installmentId,
          installmentNumero:   inst.numero,
          dateEcheance:        inst.dateEcheance,
          datePaiement:        inst.datePaiement,
          driverId:            contract.driver.driverId,
          driverName:          driverInfo.name,
          driverPhone:         driverInfo.phone,
          vehicleMake:         contract.vehicle.make,
          vehicleModel:        contract.vehicle.model,
          vehicleLicensePlate: contract.vehicle.licensePlate,
          montant:             inst.montant,
          montantPaye,
          montantRecouvre,
          cashShortfall,
          statut:              inst.status,
          retardJours:         inst.retardJours,
          paymentSource:       "INCONNU",
        });
      }
    }

    // ─── Phase 2 : résolution du mode de collecte via journal d'audit ──────────

    // EN_RECOUVREMENT = imputation auto à découvert, aucun cash confirmé → classifiable directement
    // PAYEE / PARTIELLEMENT_RECOUVREE / PARTIELLE → nécessitent une vérification audit
    const AUDIT_NEEDED = new Set<InstallmentStatus>(["PAYEE", "PARTIELLEMENT_RECOUVREE", "PARTIELLE"]);

    const contractsToCheck = new Set(
      lines.filter((l) => AUDIT_NEEDED.has(l.statut)).map((l) => l.contractId),
    );

    interface ManualRecord {
      ids: Set<string>;     // installmentIds trouvés dans details (précis)
      timestamps: number[]; // occurredAt en ms (pour fenêtre temporelle)
      fetched: boolean;     // true = appel réussi (même si 0 événements)
    }
    const manualMap = new Map<string, ManualRecord>();

    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

    if (contractsToCheck.size > 0) {
      await Promise.allSettled(
        Array.from(contractsToCheck).map(async (contractId) => {
          try {
            const logs = await listContractAuditLogs({
              contractId,
              action: "MANUAL_PAYMENT_RECORDED",
              limit: 200,
            });
            const ids        = new Set<string>();
            const timestamps: number[] = [];

            for (const log of logs.items) {
              timestamps.push(new Date(log.occurredAt).getTime());
              const d = log.details ?? {};
              // Gérer toutes les shapes possibles retournées par le backend
              for (const id of [
                d.installmentId,
                ...(Array.isArray(d.installmentIds)        ? d.installmentIds        : []),
                ...(Array.isArray(d.settledInstallmentIds) ? d.settledInstallmentIds : []),
                ...(Array.isArray(d.instalmentIds)         ? d.instalmentIds         : []),
              ]) {
                if (typeof id === "string" && id) ids.add(id);
              }
            }
            manualMap.set(contractId, { ids, timestamps, fetched: true });
          } catch {
            // graceful — paymentSource restera INCONNU pour ce contrat
          }
        }),
      );
    }

    // Résoudre paymentSource pour chaque ligne
    for (const line of lines) {
      const s = line.statut;

      if (s === "EN_ATTENTE" || s === "ANNULEE" || s === "IMPAYEE") {
        line.paymentSource = "INCONNU";
        continue;
      }

      if (s === "EN_RECOUVREMENT") {
        // Wallet débité (possiblement à découvert), aucun cash confirmé → automatique
        line.paymentSource = "AUTOMATIQUE";
        continue;
      }

      // PAYEE / PARTIELLEMENT_RECOUVREE / PARTIELLE
      const rec = manualMap.get(line.contractId);

      if (!rec) {
        // Appel audit échoué → indéterminable
        line.paymentSource = "INCONNU";
        continue;
      }

      if (rec.timestamps.length === 0) {
        // Appel réussi, zéro paiement manuel pour ce contrat → automatique confirmé
        line.paymentSource = "AUTOMATIQUE";
        continue;
      }

      // Le contrat a eu des paiements manuels — chercher lequel correspond à cette échéance

      if (rec.ids.size > 0) {
        // Correspondance précise par installmentId (si le backend l'inclut dans details)
        line.paymentSource = rec.ids.has(line.installmentId) ? "MANUEL" : "AUTOMATIQUE";
        continue;
      }

      // Heuristique temporelle : comparer occurredAt des paiements manuels
      // avec datePaiement (prioritaire) ou dateEcheance (fallback) ± 3 jours
      const refIso = line.datePaiement ?? line.dateEcheance;
      const refTs  = new Date(refIso).getTime();
      const nearbyManual = rec.timestamps.some((ts) => Math.abs(ts - refTs) <= THREE_DAYS_MS);

      if (nearbyManual) {
        line.paymentSource = "MANUEL";
      } else {
        // Des paiements manuels existent pour ce contrat mais aucun proche de cette échéance.
        // On ne peut pas affirmer "Automatique" sans risquer un faux positif → INCONNU.
        line.paymentSource = "INCONNU";
      }
    }

    // Tri : par date d'échéance d'abord, puis par priorité de statut
    lines.sort((a, b) => {
      const dateCmp = a.dateEcheance.localeCompare(b.dateEcheance);
      if (dateCmp !== 0) return dateCmp;
      return (STATUS_ORDER[a.statut] ?? 9) - (STATUS_ORDER[b.statut] ?? 9);
    });

    const totalDue           = lines.reduce((s, l) => s + l.montant,          0);
    const totalImputed       = lines.reduce((s, l) => s + l.montantPaye,       0);
    const totalCashCollected = lines.reduce((s, l) => s + l.montantRecouvre,   0);
    const totalCashShortfall = lines.reduce((s, l) => s + l.cashShortfall,     0);

    const rangeLabel = dateFrom === dateTo ? dateFrom : `${dateFrom} → ${dateTo}`;
    return {
      ok: true,
      message: `${lines.length} échéance${lines.length !== 1 ? "s" : ""} sur ${rangeLabel} (${activeContracts.length} contrats scannés).`,
      data: {
        dateFrom,
        dateTo,
        contractsScanned: activeContracts.length,
        totalLines: lines.length,
        totalDue,
        totalImputed,
        totalCashCollected,
        totalCashShortfall,
        byStatus,
        lines,
      },
    };
  } catch (e) {
    return fail(e, "Impossible de générer le rapport quotidien.");
  }
}

// ─── Break / résiliation ─────────────────────────────────────────────────────

/**
 * Résilie un contrat puis force le désassignement du véhicule en best-effort.
 *
 * Pourquoi le best-effort ? Le backend (BreakContractUseCase) sauvegarde
 * le contrat comme ROMPU AVANT d'appeler unassignVehicle. Si l'unassign
 * échoue côté backend (statut inattendu, etc.), le contrat reste ROMPU mais
 * le véhicule reste ASSIGNED. On corrige ça en appelant explicitement
 * POST /api/vehicles/admin/:vehicleId/unassign après la résiliation réussie.
 */
export async function breakContractAction(
  contractId: string,
  reason: string,
  vehicleId?: string,
): Promise<ActionResult> {
  try {
    await apiFetch<unknown>(API_ROUTES.adminContracts.break(contractId), {
      method: "POST",
      body: { reason },
    });

    // Best-effort : libère le véhicule même si le backend a échoué en interne.
    // On ignore l'erreur si le véhicule est déjà libéré (idempotent).
    if (vehicleId) {
      try {
        await apiFetch<unknown>(API_ROUTES.vehicles.unassign(vehicleId), {
          method: "POST",
        });
      } catch {
        // Silencieux — le véhicule est peut-être déjà AVAILABLE, c'est OK.
      }
    }

    revalidatePath("/contracts");
    revalidatePath(`/contracts/${contractId}`);
    revalidatePath("/vtc/vehicles");
    return { ok: true, message: "Contrat résilié. Véhicule remis à disposition." };
  } catch (e) {
    return fail(e, "Impossible de résilier le contrat.");
  }
}
