"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Download, Search, Users } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";
import { formatDate } from "@/shared/lib/format";
import { downloadCsv, timestampedFilename, type CsvColumn } from "@/shared/lib/csv";
import {
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_TONES,
  PAYMENT_FREQUENCY_LABELS,
  driverFullName,
  formatXof,
  type Contract,
  type ContractStatus,
} from "../domain/contract";

// ─── CSV ──────────────────────────────────────────────────────────────────────

const CSV_COLUMNS: CsvColumn<Contract>[] = [
  { key: "statut",       header: "Statut",            value: (r) => CONTRACT_STATUS_LABELS[r.status] },
  { key: "nom",          header: "Pilote",             value: (r) => driverFullName(r.driver) },
  { key: "telephone",    header: "Téléphone",          value: (r) => r.driver.phoneNumber ?? "" },
  { key: "vehicule",     header: "Véhicule",           value: (r) => [r.vehicle.make, r.vehicle.model].filter(Boolean).join(" ") },
  { key: "plaque",       header: "Plaque",             value: (r) => r.vehicle.licensePlate ?? "" },
  { key: "frequence",    header: "Fréquence",          value: (r) => PAYMENT_FREQUENCY_LABELS[r.frequencePaiement] },
  { key: "dateDebut",    header: "Début contrat",      value: (r) => formatDate(r.dateDebut) },
  { key: "montantTotal", header: "Montant total (FCFA)",value: (r) => r.montantTotal },
  { key: "paye",         header: "Payé (FCFA)",        value: (r) => r.montantPaye ?? 0 },
  { key: "restant",      header: "Restant (FCFA)",     value: (r) => r.montantRestant ?? 0 },
  { key: "impayes",      header: "Impayés",            value: (r) => r.nbImpayes ?? 0 },
  { key: "contractId",   header: "ID Contrat",         value: (r) => r.contractId },
  { key: "driverId",     header: "ID Pilote",          value: (r) => r.driver.driverId },
];

// ─── Filtres statut ───────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: ContractStatus | "ALL"; label: string }[] = [
  { value: "ALL",       label: "Tous" },
  { value: "ACTIVE",    label: "Actifs" },
  { value: "SUSPENDED", label: "Suspendus" },
];

// ─── Composant ────────────────────────────────────────────────────────────────

interface Props {
  contracts: Contract[];
  error?: string;
}

export function ActiveContractDriversClient({ contracts, error }: Props) {
  const router = useRouter();
  const [search,    setSearch]    = useState("");
  const [statusFilter, setStatus] = useState<ContractStatus | "ALL">("ALL");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contracts.filter((c) => {
      if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
      if (!q) return true;
      const name  = driverFullName(c.driver).toLowerCase();
      const phone = (c.driver.phoneNumber ?? "").toLowerCase();
      const plate = (c.vehicle.licensePlate ?? "").toLowerCase();
      const make  = [c.vehicle.make, c.vehicle.model].filter(Boolean).join(" ").toLowerCase();
      return name.includes(q) || phone.includes(q) || plate.includes(q) || make.includes(q);
    });
  }, [contracts, search, statusFilter]);

  const activeCount    = contracts.filter((c) => c.status === "ACTIVE").length;
  const suspendedCount = contracts.filter((c) => c.status === "SUSPENDED").length;

  function exportCsv() {
    downloadCsv(timestampedFilename("pilotes-contrats-actifs"), CSV_COLUMNS, filtered);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pilotes en contrat"
        description="Pilotes ayant un contrat location-vente actif ou suspendu."
        eyebrow="Finance · Contrats"
        dataSource="live"
      />

      {/* ── KPIs ── */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
            Total
          </p>
          <p className="mt-1 font-mono text-2xl font-bold text-[color:var(--foreground)]">
            {contracts.length}
          </p>
          <p className="mt-0.5 text-[10px] text-[color:var(--muted-foreground)]">pilotes en contrat</p>
        </div>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
            Actifs
          </p>
          <p className="mt-1 font-mono text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {activeCount}
          </p>
          <p className="mt-0.5 text-[10px] text-[color:var(--muted-foreground)]">contrats en cours</p>
        </div>
        <div className="rounded-xl border border-[color:var(--danger)]/30 bg-[color:var(--danger)]/5 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
            Suspendus
          </p>
          <p className="mt-1 font-mono text-2xl font-bold text-[color:var(--danger)]">
            {suspendedCount}
          </p>
          <p className="mt-0.5 text-[10px] text-[color:var(--muted-foreground)]">pour impayés</p>
        </div>
      </div>

      {/* ── Erreur ── */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-[color:var(--danger)]/30 bg-[color:var(--danger)]/8 px-4 py-3 text-sm text-[color:var(--danger)]">
          <AlertTriangle className="size-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* ── Toolbar ── */}
      <Card className="p-0">
        <div className="flex flex-wrap items-center gap-3 bg-[color:var(--background)] px-4 py-3">
          {/* Recherche */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--muted-foreground)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nom, téléphone, plaque…"
              className="h-9 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] pl-9 pr-3 text-sm text-[color:var(--foreground)] outline-none focus:border-[color:var(--primary)] focus:ring-2 focus:ring-[color:var(--primary)]/20"
            />
          </div>

          {/* Filtre statut */}
          <div className="flex gap-1">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatus(opt.value)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  statusFilter === opt.value
                    ? "border-[color:var(--primary)] bg-[color:var(--primary)]/10 text-[color:var(--primary)]"
                    : "border-[color:var(--border)] bg-[color:var(--background)] text-[color:var(--muted-foreground)] hover:border-[color:var(--primary)]/40 hover:text-[color:var(--foreground)]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {search && (
              <span className="text-xs text-[color:var(--muted-foreground)]">
                {filtered.length} résultat{filtered.length !== 1 ? "s" : ""}
              </span>
            )}
            <Button variant="outline" onClick={exportCsv} disabled={filtered.length === 0}>
              <Download className="size-4" />
              CSV
            </Button>
          </div>
        </div>

        {/* ── Table ── */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-[color:var(--muted)]">
              <Users className="size-5 text-[color:var(--muted-foreground)]" />
            </div>
            <p className="text-sm font-medium text-[color:var(--foreground)]">Aucun pilote trouvé</p>
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-xs text-[color:var(--primary)] hover:underline"
              >
                Effacer la recherche
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[color:var(--border)] bg-[color:var(--muted)]/30 text-left">
                  {(["Pilote", "Véhicule", "Statut", "Fréquence", "Début", "Total", "Payé", "Restant", "Impayés"] as const).map((h) => (
                    <th
                      key={h}
                      className={`whitespace-nowrap px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)] ${
                        ["Total", "Payé", "Restant", "Impayés"].includes(h) ? "text-right" : ""
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border)]">
                {filtered.map((c) => {
                  const isSuspended = c.status === "SUSPENDED";
                  const pct = c.montantTotal > 0 && c.montantPaye != null
                    ? Math.round((c.montantPaye / c.montantTotal) * 100)
                    : null;

                  return (
                    <tr
                      key={c.contractId}
                      onClick={() => router.push(`/contracts/${c.contractId}`)}
                      className={`cursor-pointer transition-colors hover:bg-[color:var(--muted)]/20 ${
                        isSuspended ? "bg-[color:var(--danger)]/3" : ""
                      }`}
                    >
                      {/* Pilote */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col leading-tight">
                          <span className="font-medium text-[color:var(--foreground)]">
                            {driverFullName(c.driver)}
                          </span>
                          {c.driver.phoneNumber && (
                            <span className="font-mono text-[10px] text-[color:var(--muted-foreground)]">
                              {c.driver.phoneNumber}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Véhicule */}
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex flex-col leading-tight">
                          <span className="text-[color:var(--foreground)]">
                            {[c.vehicle.make, c.vehicle.model].filter(Boolean).join(" ") || "—"}
                          </span>
                          {c.vehicle.licensePlate && (
                            <span className="font-mono text-[10px] font-semibold text-[color:var(--muted-foreground)]">
                              {c.vehicle.licensePlate}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Statut */}
                      <td className="whitespace-nowrap px-4 py-3">
                        <Badge tone={CONTRACT_STATUS_TONES[c.status]}>
                          {CONTRACT_STATUS_LABELS[c.status]}
                        </Badge>
                      </td>

                      {/* Fréquence */}
                      <td className="whitespace-nowrap px-4 py-3 text-[color:var(--muted-foreground)]">
                        {PAYMENT_FREQUENCY_LABELS[c.frequencePaiement]}
                      </td>

                      {/* Début */}
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-[color:var(--muted-foreground)]">
                        {formatDate(c.dateDebut)}
                      </td>

                      {/* Total */}
                      <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-semibold text-[color:var(--foreground)]">
                        {formatXof(c.montantTotal)}
                      </td>

                      {/* Payé */}
                      <td className="whitespace-nowrap px-4 py-3 text-right font-mono">
                        <div className="flex flex-col items-end leading-tight">
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {c.montantPaye != null ? formatXof(c.montantPaye) : "—"}
                          </span>
                          {pct != null && (
                            <span className="text-[10px] text-[color:var(--muted-foreground)]">{pct}%</span>
                          )}
                        </div>
                      </td>

                      {/* Restant */}
                      <td className="whitespace-nowrap px-4 py-3 text-right font-mono">
                        <span className={c.montantRestant != null && c.montantRestant > 0 ? "font-semibold text-[color:var(--foreground)]" : "text-[color:var(--muted-foreground)]"}>
                          {c.montantRestant != null ? formatXof(c.montantRestant) : "—"}
                        </span>
                      </td>

                      {/* Impayés */}
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        {(c.nbImpayes ?? 0) > 0 ? (
                          <span className="font-semibold text-[color:var(--danger)]">
                            {c.nbImpayes}
                          </span>
                        ) : (
                          <span className="text-[color:var(--muted-foreground)]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Footer totaux */}
              <tfoot>
                <tr className="border-t-2 border-[color:var(--border)] bg-[color:var(--muted)]/30">
                  <td colSpan={5} className="px-4 py-3 text-xs font-bold text-[color:var(--foreground)]">
                    Total ({filtered.length} pilote{filtered.length !== 1 ? "s" : ""})
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-bold text-[color:var(--foreground)]">
                    {formatXof(filtered.reduce((s, c) => s + c.montantTotal, 0))}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {formatXof(filtered.reduce((s, c) => s + (c.montantPaye ?? 0), 0))}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-bold text-[color:var(--foreground)]">
                    {formatXof(filtered.reduce((s, c) => s + (c.montantRestant ?? 0), 0))}
                  </td>
                  <td className="px-4 py-3" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
