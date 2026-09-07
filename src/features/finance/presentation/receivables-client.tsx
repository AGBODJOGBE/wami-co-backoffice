"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Search } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";
import { formatDate } from "@/shared/lib/format";
import { formatXof } from "@/features/contracts/domain/contract";
import type { ReceivablesOverviewItem, ReceivablesOverviewTotals } from "../domain/receivables";

interface Props {
  items:   ReceivablesOverviewItem[];
  totals:  ReceivablesOverviewTotals;
  total:   number;
  error?:  string;
}

export function ReceivablesClient({ items, totals, total, error }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.driverName.toLowerCase().includes(q) || i.driverId.includes(q));
  }, [items, search]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Vue créances"
        description="Montants dus par les pilotes : échéances contrat non encaissées + dettes de commission."
        eyebrow="Finance"
        dataSource="live"
      />

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Total créances", value: totals.totalReceivable, tone: "default" as const },
          { label: "Contrats (non encaissé)", value: totals.contractReceivable, tone: "warning" as const },
          { label: "Commissions dues", value: totals.commissionReceivable, tone: "danger" as const },
        ].map(({ label, value, tone }) => (
          <div
            key={label}
            className={`rounded-xl border px-4 py-3 ${
              tone === "danger"
                ? "border-[color:var(--danger)]/30 bg-[color:var(--danger)]/5"
                : tone === "warning"
                  ? "border-amber-500/30 bg-amber-500/5"
                  : "border-[color:var(--border)] bg-[color:var(--background)]"
            }`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">{label}</p>
            <p className={`mt-1 font-mono text-2xl font-bold ${
              tone === "danger" ? "text-[color:var(--danger)]" :
              tone === "warning" ? "text-amber-600 dark:text-amber-400" :
              "text-[color:var(--foreground)]"
            }`}>
              {formatXof(value)}
            </p>
            <p className="mt-0.5 text-[10px] text-[color:var(--muted-foreground)]">{total} pilote{total !== 1 ? "s" : ""} concerné{total !== 1 ? "s" : ""}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-[color:var(--danger)]/30 bg-[color:var(--danger)]/8 px-4 py-3 text-sm text-[color:var(--danger)]">
          <AlertTriangle className="size-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <Card className="p-0">
        {/* Toolbar */}
        <div className="flex items-center gap-3 bg-[color:var(--background)] px-4 py-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--muted-foreground)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nom ou ID pilote…"
              className="h-9 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] pl-9 pr-3 text-sm text-[color:var(--foreground)] outline-none focus:border-[color:var(--primary)] focus:ring-2 focus:ring-[color:var(--primary)]/20"
            />
          </div>
          {search && (
            <span className="text-xs text-[color:var(--muted-foreground)]">
              {filtered.length} résultat{filtered.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-[color:var(--muted-foreground)]">
            {error ? "Erreur de chargement." : items.length === 0 ? "Aucune créance en cours." : "Aucun résultat."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[color:var(--border)] bg-[color:var(--muted)]/30 text-left">
                  {(["Pilote", "Contrat (non encaissé)", "Commission due", "Total dû", "+ ancienne créance"] as const).map((h) => (
                    <th
                      key={h}
                      className={`whitespace-nowrap px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)] ${
                        ["Contrat (non encaissé)", "Commission due", "Total dû"].includes(h) ? "text-right" : ""
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border)]">
                {filtered.map((item) => (
                  <tr
                    key={item.driverId}
                    onClick={() => router.push(`/vtc/drivers/${item.driverId}`)}
                    className="cursor-pointer transition-colors hover:bg-[color:var(--muted)]/20"
                  >
                    <td className="px-4 py-3">
                      <div className="flex flex-col leading-tight">
                        <span className="font-medium text-[color:var(--foreground)]">{item.driverName || "—"}</span>
                        <span className="font-mono text-[10px] text-[color:var(--muted-foreground)]">{item.driverId}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono">
                      {item.contractReceivable > 0 ? (
                        <span className="font-semibold text-amber-600 dark:text-amber-400">{formatXof(item.contractReceivable)}</span>
                      ) : (
                        <span className="text-[color:var(--muted-foreground)]">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono">
                      {item.commissionReceivable > 0 ? (
                        <span className="font-semibold text-[color:var(--danger)]">{formatXof(item.commissionReceivable)}</span>
                      ) : (
                        <span className="text-[color:var(--muted-foreground)]">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-bold text-[color:var(--foreground)]">
                      {formatXof(item.totalReceivable)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-[color:var(--muted-foreground)]">
                      {item.oldestReceivableAt ? (
                        <Badge tone="warning">{formatDate(item.oldestReceivableAt)}</Badge>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[color:var(--border)] bg-[color:var(--muted)]/30">
                  <td className="px-4 py-3 text-xs font-bold text-[color:var(--foreground)]">
                    Total ({filtered.length})
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                    {formatXof(filtered.reduce((s, i) => s + i.contractReceivable, 0))}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-bold text-[color:var(--danger)]">
                    {formatXof(filtered.reduce((s, i) => s + i.commissionReceivable, 0))}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-bold text-[color:var(--foreground)]">
                    {formatXof(filtered.reduce((s, i) => s + i.totalReceivable, 0))}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
