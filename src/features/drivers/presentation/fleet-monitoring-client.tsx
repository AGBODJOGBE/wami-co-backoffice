"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Bell,
  Car,
  CheckCircle2,
  ExternalLink,
  Search,
  Star,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Avatar } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { CanView } from "@/shared/ui/can-view";
import { Input } from "@/shared/ui/input";
import { Modal } from "@/shared/ui/modal";
import { Select } from "@/shared/ui/select";
import { toast } from "@/shared/ui/toast";
import { fullName, type AdminDriver } from "../domain/admin-driver";

// ─── Notification modal ───────────────────────────────────────────────────────

function NotifModal({
  open,
  driver,
  onClose,
}: {
  open: boolean;
  driver: AdminDriver | null;
  onClose: () => void;
}) {
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();

  function handleClose() {
    setMessage("");
    onClose();
  }

  function submit() {
    if (!message.trim() || message.trim().length < 5) {
      toast({ kind: "error", title: "Message trop court", description: "Minimum 5 caractères." });
      return;
    }
    start(async () => {
      // Simulation — brancher ici sur l'action de notification quand le backend l'expose
      await new Promise((r) => setTimeout(r, 800));
      toast({
        kind: "success",
        title: "Relance envoyée",
        description: `Notification envoyée à ${fullName(driver ?? {})} (${driver?.phoneNumber ?? ""}).`,
      });
      handleClose();
    });
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Envoyer une relance"
      description={driver ? `Notification push → ${fullName(driver)} · ${driver.phoneNumber}` : ""}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={pending}>Annuler</Button>
          <Button onClick={submit} isLoading={pending}>
            <Bell className="size-4" />
            Envoyer
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="rounded-lg bg-[color:var(--muted)]/40 px-3 py-2.5 text-sm">
          <p className="font-medium text-[color:var(--foreground)]">{fullName(driver ?? {})}</p>
          <p className="text-xs text-[color:var(--muted-foreground)]">{driver?.vehicle?.make} {driver?.vehicle?.model} · {driver?.vehicle?.licensePlate}</p>
        </div>
        <Input
          label="Message de relance *"
          placeholder="Bonjour, vous avez des courses disponibles dans votre zone…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          hint="Ce message sera envoyé en notification push sur l'app driver."
        />
      </div>
    </Modal>
  );
}

// ─── KPI card ────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const toneClass = {
    default: "text-[color:var(--primary)] bg-[color:var(--primary-soft)]",
    success: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30",
    warning: "text-amber-600 bg-amber-50 dark:bg-amber-950/30",
    danger: "text-[color:var(--danger)] bg-[color:var(--danger)]/10",
  }[tone];

  return (
    <div className="flex items-center gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--background)] p-4">
      <div className={`flex size-10 shrink-0 items-center justify-center rounded-full ${toneClass}`}>
        <Icon className="size-5" />
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-2xl font-bold text-[color:var(--foreground)]">{value}</span>
        <span className="text-xs text-[color:var(--muted-foreground)]">{label}</span>
      </div>
    </div>
  );
}

// ─── Status badge enrichi ─────────────────────────────────────────────────────

function StatusBadge({ driver }: { driver: AdminDriver }) {
  if (!driver.isApproved) return <Badge tone="warning">En attente</Badge>;
  if (driver.status === "SUSPENDED") return <Badge tone="danger">Suspendu</Badge>;
  if (driver.isOnline === true) {
    if (driver.status === "BUSY") return <Badge tone="info">En course</Badge>;
    return <Badge tone="success">En ligne</Badge>;
  }
  return <Badge tone="neutral">Hors ligne</Badge>;
}

// ─── Main component ───────────────────────────────────────────────────────────

type StatusFilter = "all" | "online" | "offline" | "suspended";

export interface FleetMonitoringClientProps {
  drivers: AdminDriver[];
  rideCountByDriverId: Map<string, number>;
}

export function FleetMonitoringClient({ drivers, rideCountByDriverId }: FleetMonitoringClientProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [notifTarget, setNotifTarget] = useState<AdminDriver | null>(null);

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => ({
    total: drivers.length,
    online: drivers.filter((d) => d.isOnline === true).length,
    suspended: drivers.filter((d) => d.status === "SUSPENDED").length,
    noVehicle: drivers.filter((d) => !d.vehicle).length,
  }), [drivers]);

  // ── Filtrage ─────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = drivers;

    if (statusFilter === "online") list = list.filter((d) => d.isOnline === true);
    if (statusFilter === "offline") list = list.filter((d) => d.isOnline !== true && d.status !== "SUSPENDED");
    if (statusFilter === "suspended") list = list.filter((d) => d.status === "SUSPENDED");

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (d) =>
          fullName(d).toLowerCase().includes(q) ||
          d.phoneNumber.toLowerCase().includes(q) ||
          (d.vehicle?.licensePlate ?? "").toLowerCase().includes(q) ||
          (d.vehicle?.make ?? "").toLowerCase().includes(q),
      );
    }

    return list;
  }, [drivers, statusFilter, search]);

  const statusOptions = [
    { value: "all", label: "Tous les statuts" },
    { value: "online", label: "En ligne" },
    { value: "offline", label: "Hors ligne" },
    { value: "suspended", label: "Suspendu" },
  ];

  return (
    <div className="flex flex-col gap-6">

      {/* ── KPIs ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard icon={Users} label="Pilotes approuvés" value={kpis.total} />
        <KpiCard icon={Wifi} label="En ligne maintenant" value={kpis.online} tone="success" />
        <KpiCard icon={AlertTriangle} label="Suspendus" value={kpis.suspended} tone="danger" />
        <KpiCard icon={Car} label="Sans véhicule" value={kpis.noVehicle} tone="warning" />
      </div>

      {/* ── Filtres ───────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <div className="min-w-[220px] flex-1">
          <Input
            type="search"
            placeholder="Nom, téléphone, immatriculation…"
            leftIcon={<Search className="size-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          id="status-filter"
          options={statusOptions}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
        />
      </div>

      {/* ── Résultat ─────────────────────────────────────────────────────── */}
      <p className="text-xs text-[color:var(--muted-foreground)]">
        {filtered.length} pilote{filtered.length > 1 ? "s" : ""} affiché{filtered.length > 1 ? "s" : ""}
        {filtered.length !== drivers.length ? ` sur ${drivers.length}` : ""}
      </p>

      {/* ── Tableau ───────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[color:var(--border)] py-12 text-center">
          <Activity className="size-10 text-[color:var(--muted-foreground)]" />
          <p className="text-sm text-[color:var(--muted-foreground)]">Aucun pilote correspondant aux filtres sélectionnés.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--background)]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[color:var(--border)] bg-[color:var(--muted)]/40">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">Pilote</th>
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)] md:table-cell">Véhicule</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">Statut</th>
                  <th className="hidden px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)] sm:table-cell">Courses</th>
                  <th className="hidden px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)] lg:table-cell">Note</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border)]">
                {filtered.map((driver) => {
                  const rides = rideCountByDriverId.get(driver.driverId) ?? driver.totalRides;
                  const isSuspended = driver.status === "SUSPENDED";
                  return (
                    <tr
                      key={driver.driverId}
                      className={`transition-colors hover:bg-[color:var(--muted)]/20 ${isSuspended ? "opacity-60" : ""}`}
                    >
                      {/* Pilote */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <Avatar name={fullName(driver)} />
                            {driver.isOnline === true && (
                              <span className="absolute -bottom-0.5 -right-0.5 flex size-3">
                                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                                <span className="relative inline-flex size-3 rounded-full border-2 border-[color:var(--background)] bg-emerald-500" />
                              </span>
                            )}
                          </div>
                          <div className="flex flex-col leading-tight">
                            <span className="font-medium text-[color:var(--foreground)]">{fullName(driver)}</span>
                            <span className="font-mono text-[11px] text-[color:var(--muted-foreground)]">{driver.phoneNumber}</span>
                          </div>
                        </div>
                      </td>

                      {/* Véhicule (colonne masquée sur mobile) */}
                      <td className="hidden px-4 py-3 md:table-cell">
                        {driver.vehicle ? (
                          <div className="flex flex-col leading-tight">
                            <span className="text-xs font-medium text-[color:var(--foreground)]">
                              {driver.vehicle.make} {driver.vehicle.model}
                            </span>
                            <span className="font-mono text-[11px] uppercase text-[color:var(--muted-foreground)]">
                              {driver.vehicle.licensePlate}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-[color:var(--muted-foreground)]">—</span>
                        )}
                      </td>

                      {/* Statut */}
                      <td className="px-4 py-3">
                        <StatusBadge driver={driver} />
                      </td>

                      {/* Courses */}
                      <td className="hidden px-4 py-3 text-center sm:table-cell">
                        <span className="tabular-nums text-sm font-semibold text-[color:var(--foreground)]">
                          {rides}
                        </span>
                      </td>

                      {/* Note */}
                      <td className="hidden px-4 py-3 lg:table-cell">
                        <span className="flex items-center justify-center gap-1 text-sm">
                          <Star className="size-3.5 fill-amber-400 text-amber-400" />
                          <span className="tabular-nums font-medium">{driver.rating.toFixed(1)}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <CanView permission="notification.send">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setNotifTarget(driver)}
                              title="Envoyer une relance"
                            >
                              <Bell className="size-3.5" />
                              Relancer
                            </Button>
                          </CanView>
                          <Link href={`/vtc/drivers/${driver.driverId}`}>
                            <Button variant="ghost" size="sm" title="Voir le profil complet">
                              <ExternalLink className="size-3.5" />
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modal relance ─────────────────────────────────────────────────── */}
      <NotifModal
        open={!!notifTarget}
        driver={notifTarget}
        onClose={() => setNotifTarget(null)}
      />
    </div>
  );
}
