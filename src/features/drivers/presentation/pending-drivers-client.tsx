"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  EyeOff,
  RefreshCw,
  ShieldCheck,
  ShieldX,
} from "lucide-react";
import { Avatar } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import {
  DataTable,
  PaginationFooter,
  type ColumnDef,
} from "@/shared/ui/data-table";
import { SearchField } from "@/shared/ui/search-field";
import { Spinner } from "@/shared/ui/spinner";
import { downloadCsv, timestampedFilename } from "@/shared/lib/csv";
import { formatDate } from "@/shared/lib/format";
import { StatCard } from "@/features/dashboard/presentation/components/stat-card";
import {
  relativeTime,
  ADMIN_DRIVER_STATUS_META,
  type PendingDriver,
} from "../domain/admin-driver";
import { CanView } from "@/shared/ui/can-view";
import {
  DriverInlineActionButton,
  SuspendDriverModal,
  type DriverTarget,
} from "./driver-action-modals";

const API_URL = "/api/pending-hidden";

async function fetchHiddenFromServer(): Promise<Set<string>> {
  try {
    const res = await fetch(API_URL, { cache: "no-store" });
    if (!res.ok) return new Set();
    const data = (await res.json()) as { hiddenIds: string[] };
    return new Set(data.hiddenIds);
  } catch {
    return new Set();
  }
}

async function saveHiddenToServer(ids: Set<string>): Promise<void> {
  try {
    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hiddenIds: [...ids] }),
    });
    // Notifie les autres composants dans le même onglet
    window.dispatchEvent(new CustomEvent("foryou:pending-hidden-changed"));
  } catch {
    // best-effort
  }
}

export interface PendingDriversClientProps {
  drivers: PendingDriver[];
  total: number;
}

export function PendingDriversClient({
  drivers,
  total,
}: PendingDriversClientProps) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [search, setSearch] = useState("");
  const [suspendTarget, setSuspendTarget] = useState<DriverTarget | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [showHidden, setShowHidden] = useState(false);

  // Charge l'état partagé depuis le serveur au montage
  useEffect(() => {
    void fetchHiddenFromServer().then(setHiddenIds);
  }, []);

  function toggleHide(driverId: string) {
    setHiddenIds((prev) => {
      const next = new Set(prev);
      if (next.has(driverId)) {
        next.delete(driverId);
      } else {
        next.add(driverId);
      }
      void saveHiddenToServer(next);
      return next;
    });
  }

  const visible = useMemo(
    () => drivers.filter((d) => !hiddenIds.has(d.driverId)),
    [drivers, hiddenIds],
  );

  const hiddenDrivers = useMemo(
    () => drivers.filter((d) => hiddenIds.has(d.driverId)),
    [drivers, hiddenIds],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return visible;
    return visible.filter((d) =>
      `${d.firstName ?? ""} ${d.lastName ?? ""} ${d.phoneNumber ?? ""} ${d.driverId} ${d.userId} ${d.category}`
        .toLowerCase()
        .includes(q),
    );
  }, [visible, search]);

  function buildHref(d: PendingDriver) {
    const sp = new URLSearchParams({
      userId: d.userId,
      category: d.category,
      isDocumentsVerified: String(d.isDocumentsVerified),
      createdAt: d.createdAt,
      status: d.status ?? "PENDING",
    });
    return `/vtc/drivers/${d.driverId}?${sp.toString()}`;
  }

  const docsVerified = visible.filter((d) => d.isDocumentsVerified).length;
  const docsMissing = visible.length - docsVerified;
  const oldest = visible.reduce<PendingDriver | null>((acc, d) => {
    if (!acc) return d;
    return new Date(d.createdAt) < new Date(acc.createdAt) ? d : acc;
  }, null);

  const columns: ColumnDef<PendingDriver>[] = [
    {
      key: "driver",
      header: "Pilote",
      sortAccessor: (row) =>
        `${row.lastName ?? ""} ${row.firstName ?? row.driverId}`,
      render: (row) => {
        const name = `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim();
        const displayName = name || `Pilote #${row.driverId.slice(0, 8)}`;
        return (
          <div className="flex items-center gap-3">
            <Avatar name={displayName} />
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-medium text-[color:var(--foreground)]">
                {displayName}
              </span>
              {row.phoneNumber ? (
                <a
                  href={`tel:${row.phoneNumber}`}
                  className="font-mono text-[10px] text-[color:var(--primary)] hover:underline"
                  data-no-row-click
                >
                  {row.phoneNumber}
                </a>
              ) : (
                <span
                  className="font-mono text-[10px] text-[color:var(--muted-foreground)]"
                  title={row.driverId}
                >
                  {row.driverId.slice(0, 18)}…
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: "category",
      header: "Catégorie",
      sortAccessor: (row) => row.category,
      render: (row) => <Badge tone="primary">{row.category}</Badge>,
    },
    {
      key: "documents",
      header: "Documents / Statut",
      sortAccessor: (row) => (row.isDocumentsVerified ? 1 : 0),
      render: (row) => {
        const statusMeta = row.status ? ADMIN_DRIVER_STATUS_META[row.status] : null;
        return (
          <div className="flex flex-col gap-1">
            {row.isDocumentsVerified ? (
              <Badge tone="success">Vérifiés</Badge>
            ) : (
              <Badge tone="warning">Non vérifiés</Badge>
            )}
            {statusMeta && row.status !== "PENDING" && (
              <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
            )}
          </div>
        );
      },
    },
    {
      key: "createdAt",
      header: "Inscrit",
      sortAccessor: (row) => new Date(row.createdAt).getTime(),
      render: (row) => (
        <div className="flex flex-col leading-tight">
          <span className="text-sm text-[color:var(--foreground)]">
            {relativeTime(row.createdAt)}
          </span>
          <span className="text-[10px] text-[color:var(--muted-foreground)]">
            {formatDate(row.createdAt)}
          </span>
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <CanView permission="driver.approve">
            <DriverInlineActionButton
              driverId={row.driverId}
              action="approve"
              label="Approuver"
              variant="primary"
              size="sm"
            />
          </CanView>
          {row.status === "SUSPENDED" ? (
            <CanView permission="driver.suspend">
              <DriverInlineActionButton
                driverId={row.driverId}
                action="reactivate"
                label="Réactiver"
                variant="outline"
                size="sm"
              />
            </CanView>
          ) : (
            <CanView permission="driver.suspend">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const name = `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim();
                  setSuspendTarget({
                    driverId: row.driverId,
                    label: name || `Pilote #${row.driverId.slice(0, 8)}`,
                  });
                }}
              >
                Suspendre
              </Button>
            </CanView>
          )}
          <button
            data-no-row-click
            title="Masquer ce pilote"
            onClick={() => toggleHide(row.driverId)}
            className="flex size-8 items-center justify-center rounded-lg text-[color:var(--muted-foreground)] transition-colors hover:bg-[color:var(--muted)] hover:text-[color:var(--foreground)]"
          >
            <EyeOff className="size-4" />
          </button>
        </div>
      ),
    },
  ];

  const hiddenColumns: ColumnDef<PendingDriver>[] = [
    {
      key: "driver",
      header: "Pilote",
      sortAccessor: (row) => `${row.lastName ?? ""} ${row.firstName ?? ""}`,
      render: (row) => {
        const name = `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim();
        const displayName = name || `Pilote #${row.driverId.slice(0, 8)}`;
        return (
          <div className="flex items-center gap-3">
            <Avatar name={displayName} />
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-medium text-[color:var(--muted-foreground)]">
                {displayName}
              </span>
              {row.phoneNumber && (
                <span className="font-mono text-[10px] text-[color:var(--muted-foreground)]">
                  {row.phoneNumber}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: "category",
      header: "Catégorie",
      sortAccessor: (row) => row.category,
      render: (row) => <Badge tone="neutral">{row.category}</Badge>,
    },
    {
      key: "createdAt",
      header: "Inscrit",
      sortAccessor: (row) => new Date(row.createdAt).getTime(),
      render: (row) => (
        <span className="text-xs text-[color:var(--muted-foreground)]">
          {formatDate(row.createdAt)}
        </span>
      ),
    },
    {
      key: "reveal",
      header: "",
      align: "right",
      render: (row) => (
        <button
          data-no-row-click
          title="Afficher ce pilote"
          onClick={() => toggleHide(row.driverId)}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-[color:var(--muted-foreground)] transition-colors hover:bg-[color:var(--muted)] hover:text-[color:var(--foreground)]"
        >
          <Eye className="size-3.5" />
          Révéler
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="En attente"
          value={String(visible.length)}
          trend={{ value: "à valider", direction: "flat" }}
          helper={`${docsVerified} docs OK · ${docsMissing} en attente`}
          icon={Clock}
          tone="warning"
        />
        <StatCard
          label="Documents vérifiés"
          value={String(docsVerified)}
          trend={{ value: "prêts à approuver", direction: "flat" }}
          helper="docs valides chez le backoffice"
          icon={ShieldCheck}
          tone="success"
        />
        <StatCard
          label="Docs manquants"
          value={String(docsMissing)}
          trend={{ value: "à relancer", direction: "flat" }}
          helper="approbation bloquée"
          icon={ShieldX}
          tone="warning"
        />
        <StatCard
          label="Plus ancienne demande"
          value={oldest ? relativeTime(oldest.createdAt) : "—"}
          trend={{ value: oldest ? oldest.category : "", direction: "flat" }}
          helper="à traiter en priorité"
          icon={AlertTriangle}
          tone="primary"
        />
      </section>

      <div className="flex flex-col gap-3 rounded-xl border border-[color:var(--border)] bg-white p-4 dark:bg-[color:var(--muted)]">
        <div className="flex flex-wrap items-center gap-3">
          <SearchField
            placeholder="Rechercher par nom, téléphone, catégorie…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:flex-1 sm:min-w-72"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => startRefresh(() => router.refresh())}
            disabled={refreshing}
          >
            {refreshing ? (
              <Spinner size="sm" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Rafraîchir
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              downloadCsv(
                timestampedFilename("pilotes-en-attente"),
                [
                  { key: "firstName", header: "Prénom", value: (r) => r.firstName ?? "" },
                  { key: "lastName", header: "Nom", value: (r) => r.lastName ?? "" },
                  { key: "phoneNumber", header: "Téléphone", value: (r) => r.phoneNumber ?? "" },
                  { key: "category", header: "Catégorie", value: (r) => r.category },
                  { key: "docs", header: "Docs vérifiés", value: (r) => (r.isDocumentsVerified ? "oui" : "non") },
                  { key: "createdAt", header: "Inscrit le", value: (r) => r.createdAt },
                  { key: "driverId", header: "Pilote ID", value: (r) => r.driverId },
                ],
                filtered,
              )
            }
          >
            <Download className="size-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {visible.length === 0 && hiddenDrivers.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
          <CheckCircle2 className="size-10 text-[color:var(--success)]" />
          <p className="text-sm font-medium text-[color:var(--foreground)]">
            Aucun pilote en attente
          </p>
          <p className="text-xs text-[color:var(--muted-foreground)]">
            Tous les dossiers ont été traités. Reviens plus tard ou rafraîchis
            la page.
          </p>
        </Card>
      ) : visible.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
          <EyeOff className="size-10 text-[color:var(--muted-foreground)]" />
          <p className="text-sm font-medium text-[color:var(--foreground)]">
            Tous les pilotes sont masqués
          </p>
          <p className="text-xs text-[color:var(--muted-foreground)]">
            {hiddenDrivers.length} pilote{hiddenDrivers.length > 1 ? "s" : ""} masqué{hiddenDrivers.length > 1 ? "s" : ""} — révèle-les ci-dessous.
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <DataTable
            rows={filtered}
            columns={columns}
            rowKey={(row) => row.driverId}
            rowHref={buildHref}
            defaultSort={{ key: "createdAt", direction: "asc" }}
          />
          <PaginationFooter total={total} shown={filtered.length} />
        </Card>
      )}

      {/* ── Pilotes masqués ─────────────────────────────────────────────────── */}
      {hiddenDrivers.length > 0 && (
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setShowHidden((v) => !v)}
            className="flex items-center gap-2 self-start rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm text-[color:var(--muted-foreground)] transition-colors hover:border-[color:var(--primary)]/40 hover:text-[color:var(--foreground)]"
          >
            <EyeOff className="size-4" />
            <span>
              {hiddenDrivers.length} pilote{hiddenDrivers.length > 1 ? "s" : ""} masqué{hiddenDrivers.length > 1 ? "s" : ""}
            </span>
            <span className="ml-1 text-xs opacity-60">
              {showHidden ? "▲ Réduire" : "▼ Afficher"}
            </span>
          </button>

          {showHidden && (
            <Card className="overflow-hidden border-dashed p-0 opacity-70">
              <DataTable
                rows={hiddenDrivers}
                columns={hiddenColumns}
                rowKey={(row) => row.driverId}
                defaultSort={{ key: "createdAt", direction: "asc" }}
              />
            </Card>
          )}
        </div>
      )}

      <SuspendDriverModal
        open={!!suspendTarget}
        target={suspendTarget}
        onClose={() => setSuspendTarget(null)}
      />
    </div>
  );
}
