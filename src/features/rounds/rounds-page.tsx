"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Ban,
  CheckCircle2,
  MapPin,
  Package,
  Plus,
  Route as RouteIcon,
  TimerOff,
  Trash2,
} from "lucide-react";
import { Avatar } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Combobox } from "@/shared/ui/combobox";
import { ConfirmModal } from "@/shared/ui/confirm-modal";
import { DropdownMenu } from "@/shared/ui/dropdown-menu";
import { Input } from "@/shared/ui/input";
import { Modal } from "@/shared/ui/modal";
import { PageHeader } from "@/shared/ui/page-header";
import { SearchField } from "@/shared/ui/search-field";
import { Tabs } from "@/shared/ui/tabs";
import { toast } from "@/shared/ui/toast";
import { cn } from "@/shared/lib/cn";
import { StatCard } from "@/features/dashboard/presentation/components/stat-card";
import { useDriversStore } from "@/features/drivers/store";
import {
  useRoundsStore,
  type NewRoundInput,
  type Round,
  type StopStatus,
} from "./store";

const STOP_STATUS_DOT: Record<StopStatus, string> = {
  DONE: "bg-emerald-500",
  IN_PROGRESS: "bg-[color:var(--primary)] ring-4 ring-[color:var(--primary-soft)] animate-pulse",
  NEXT: "bg-[color:var(--secondary)]",
  PENDING: "bg-[color:var(--border)] dark:bg-white/15",
  FAILED: "bg-red-500",
};

const STOP_STATUS_LABEL: Record<StopStatus, string> = {
  DONE: "Effectué",
  IN_PROGRESS: "En cours",
  NEXT: "Suivant",
  PENDING: "À faire",
  FAILED: "Échec",
};

const ZONE_FILTER = [
  { value: "ALL", label: "Toutes zones" },
  { value: "Cotonou", label: "Cotonou" },
  { value: "Calavi", label: "Calavi" },
  { value: "Porto-Novo", label: "Porto-Novo" },
  { value: "INTERCITY", label: "Inter-villes" },
];

function PlanRoundModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const create = useRoundsStore((s) => s.create);
  const drivers = useDriversStore((s) => s.drivers);

  const empty: NewRoundInput = {
    driverName: "",
    vehicle: "",
    zone: "Cotonou",
    startedAt: "12:00",
    expectedEndAt: "14:00",
    totalKm: 0,
    stops: [
      { label: "Pickup", address: "" },
      { label: "Drop 1", address: "" },
    ],
  };
  const [form, setForm] = useState<NewRoundInput>(empty);

  useEffect(() => {
    if (open) setForm(empty);
  }, [open]);

  const driverOptions = useMemo(
    () =>
      drivers
        .filter((d) => d.status === "APPROVED")
        .map((d) => ({
          value: d.fullName,
          label: d.fullName,
          description: `${d.vehicle} · ${d.plate}`,
        })),
    [drivers],
  );

  function set<K extends keyof NewRoundInput>(key: K, value: NewRoundInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updateStop(index: number, partial: Partial<NewRoundInput["stops"][number]>) {
    setForm((f) => ({
      ...f,
      stops: f.stops.map((s, i) => (i === index ? { ...s, ...partial } : s)),
    }));
  }

  function addStop() {
    setForm((f) => ({
      ...f,
      stops: [...f.stops, { label: `Drop ${f.stops.length}`, address: "" }],
    }));
  }

  function removeStop(index: number) {
    setForm((f) => ({
      ...f,
      stops: f.stops.filter((_, i) => i !== index),
    }));
  }

  function handleSubmit() {
    if (!form.driverName || !form.zone || form.stops.some((s) => !s.address)) {
      toast({
        kind: "error",
        title: "Champs manquants",
        description: "Driver, zone et adresse de chaque stop sont requis.",
      });
      return;
    }
    const driver = drivers.find((d) => d.fullName === form.driverName);
    create({
      ...form,
      vehicle: driver ? `${driver.vehicle} · ${driver.plate}` : form.vehicle,
    });
    toast({
      kind: "success",
      title: "Tournée planifiée",
      description: `${form.driverName} · ${form.zone}`,
    });
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Planifier une tournée multi-stops"
      description="Le driver verra cette tournée dans son app à l'heure prévue."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSubmit}>Planifier</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Combobox
          label="Driver assigné"
          options={driverOptions}
          value={form.driverName}
          onChange={(v) => set("driverName", v)}
          searchPlaceholder="Rechercher un driver…"
          required
          className="sm:col-span-2"
        />
        <Combobox
          label="Zone"
          options={ZONE_FILTER.filter((z) => z.value !== "ALL")}
          value={form.zone}
          onChange={(v) => set("zone", v)}
        />
        <Input
          label="Distance totale (km)"
          type="number"
          step={0.1}
          value={form.totalKm}
          onChange={(e) => set("totalKm", Number(e.target.value))}
        />
        <Input
          label="Heure de départ"
          type="time"
          value={form.startedAt}
          onChange={(e) => set("startedAt", e.target.value)}
        />
        <Input
          label="Heure de fin estimée"
          type="time"
          value={form.expectedEndAt}
          onChange={(e) => set("expectedEndAt", e.target.value)}
        />
      </div>

      <div className="mt-5 border-t border-[color:var(--border)] pt-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-[color:var(--foreground)]">
            Stops ({form.stops.length})
          </p>
          <Button variant="outline" size="sm" onClick={addStop}>
            <Plus className="size-3.5" />
            Ajouter un stop
          </Button>
        </div>
        <ul className="flex flex-col gap-3">
          {form.stops.map((stop, index) => (
            <li
              key={index}
              className="flex flex-wrap items-end gap-2 rounded-lg border border-[color:var(--border)] p-3"
            >
              <Input
                label="Type"
                value={stop.label}
                onChange={(e) => updateStop(index, { label: e.target.value })}
                className="w-28"
              />
              <Input
                label="Adresse"
                value={stop.address}
                onChange={(e) => updateStop(index, { address: e.target.value })}
                placeholder="Pharmacie Étoile Rouge"
                className="flex-1 min-w-48"
              />
              {form.stops.length > 1 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeStop(index)}
                  aria-label="Retirer ce stop"
                >
                  <Trash2 className="size-4 text-[color:var(--danger)]" />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}

function RoundCard({
  round,
  onAction,
}: {
  round: Round;
  onAction: (action: "complete" | "cancel" | "delete", round: Round) => void;
}) {
  const completedStops = round.stops.filter((s) => s.status === "DONE").length;
  const totalStops = round.stops.length;
  const progress = (completedStops / totalStops) * 100;

  const headerTone = {
    ACTIVE: <Badge tone="primary">En cours</Badge>,
    COMPLETED: <Badge tone="success">Terminée</Badge>,
    DELAYED: <Badge tone="danger">En retard</Badge>,
    PLANNED: <Badge tone="neutral">Planifiée</Badge>,
    CANCELLED: <Badge tone="danger">Annulée</Badge>,
  }[round.status];

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-xl bg-[color:var(--primary-soft)] text-[color:var(--primary)]">
            <RouteIcon className="size-6" />
          </span>
          <div className="flex flex-col leading-tight">
            <p className="font-mono text-xs font-semibold text-[color:var(--primary)]">
              {round.roundNumber}
            </p>
            <p className="text-base font-semibold text-[color:var(--foreground)]">
              {round.zone}
            </p>
            <p className="text-xs text-[color:var(--muted-foreground)]">
              {round.startedAt} → {round.expectedEndAt} · {round.totalKm.toFixed(1)} km
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {headerTone}
          <DropdownMenu
            groups={[
              {
                label: "Cas d'usage",
                items: [
                  {
                    label: "Marquer comme terminée",
                    icon: CheckCircle2,
                    onSelect: () => onAction("complete", round),
                    disabled:
                      round.status === "COMPLETED" || round.status === "CANCELLED",
                  },
                  {
                    label: "Annuler la tournée",
                    icon: Ban,
                    onSelect: () => onAction("cancel", round),
                    danger: true,
                    disabled:
                      round.status === "COMPLETED" || round.status === "CANCELLED",
                  },
                ],
              },
              {
                items: [
                  {
                    label: "Supprimer",
                    icon: Trash2,
                    onSelect: () => onAction("delete", round),
                    danger: true,
                  },
                ],
              },
            ]}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-lg bg-[color:var(--muted)] p-3">
        <Avatar name={round.driverName} className="size-8 text-xs" />
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="text-sm font-medium text-[color:var(--foreground)]">
            {round.driverName}
          </span>
          <span className="truncate text-xs text-[color:var(--muted-foreground)]">
            {round.vehicle}
          </span>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
            Avancement
          </p>
          <p className="font-mono text-sm font-semibold text-[color:var(--foreground)]">
            {completedStops} / {totalStops}
          </p>
        </div>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--muted)]">
        <div
          className="h-full rounded-full bg-[color:var(--primary)] transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <ol className="mt-4 flex flex-col">
        {round.stops.map((stop, index) => {
          const isLast = index === round.stops.length - 1;
          return (
            <li key={`${stop.label}-${index}`} className="relative flex gap-3 pb-4 last:pb-0">
              {!isLast ? (
                <span
                  className="absolute left-[7px] top-3 h-full w-px bg-[color:var(--border)]"
                  aria-hidden
                />
              ) : null}
              <span
                className={cn(
                  "relative mt-1 size-3.5 shrink-0 rounded-full",
                  STOP_STATUS_DOT[stop.status],
                )}
              />
              <div className="flex flex-1 items-center justify-between gap-2">
                <div className="flex flex-col leading-tight">
                  <span className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
                    {stop.label} · {STOP_STATUS_LABEL[stop.status]}
                  </span>
                  <span className="text-sm text-[color:var(--foreground)]">
                    <MapPin className="mr-1 inline size-3 align-text-bottom text-[color:var(--muted-foreground)]" />
                    {stop.address}
                  </span>
                </div>
                {stop.eta ? (
                  <span className="shrink-0 rounded-full bg-[color:var(--muted)] px-2 py-0.5 text-[10px] font-medium text-[color:var(--muted-foreground)]">
                    {stop.eta}
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

export function RoundsPage() {
  const rounds = useRoundsStore((s) => s.rounds);
  const cancel = useRoundsStore((s) => s.cancel);
  const markCompleted = useRoundsStore((s) => s.markCompleted);
  const remove = useRoundsStore((s) => s.remove);

  const [search, setSearch] = useState("");
  const [zone, setZone] = useState("ALL");

  const [planOpen, setPlanOpen] = useState(false);

  const [confirm, setConfirm] = useState<{
    open: boolean;
    action: "complete" | "cancel" | "delete";
    target: Round | null;
  }>({ open: false, action: "complete", target: null });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rounds.filter((r) => {
      if (q) {
        const haystack = `${r.roundNumber} ${r.driverName} ${r.zone}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (zone !== "ALL") {
        if (zone === "INTERCITY" && !r.zone.includes("→")) return false;
        if (zone !== "INTERCITY" && !r.zone.toLowerCase().includes(zone.toLowerCase()))
          return false;
      }
      return true;
    });
  }, [rounds, search, zone]);

  const active = filtered.filter((r) => r.status === "ACTIVE");
  const delayed = filtered.filter((r) => r.status === "DELAYED");
  const planned = filtered.filter((r) => r.status === "PLANNED");
  const completed = filtered.filter((r) => r.status === "COMPLETED");
  const cancelled = filtered.filter((r) => r.status === "CANCELLED");

  function handleAction(action: "complete" | "cancel" | "delete", target: Round) {
    setConfirm({ open: true, action, target });
  }

  function runConfirm() {
    if (!confirm.target) return;
    const t = confirm.target;
    if (confirm.action === "complete") {
      markCompleted(t.roundId);
      toast({ kind: "success", title: "Tournée terminée", description: t.roundNumber });
    } else if (confirm.action === "cancel") {
      cancel(t.roundId);
      toast({ kind: "warning", title: "Tournée annulée", description: t.roundNumber });
    } else if (confirm.action === "delete") {
      remove(t.roundId);
      toast({ kind: "info", title: "Tournée supprimée", description: t.roundNumber });
    }
    setConfirm((c) => ({ ...c, open: false, target: null }));
  }

  function gridFor(rows: Round[]) {
    if (rows.length === 0) {
      return (
        <div className="rounded-xl border border-dashed border-[color:var(--border)] p-12 text-center text-sm text-[color:var(--muted-foreground)]">
          Aucune tournée à afficher.
        </div>
      );
    }
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {rows.map((round) => (
          <RoundCard key={round.roundId} round={round} onAction={handleAction} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Opérations livraison"
        title="Tournées multi-stops"
        dataSource="mock"
        description="Tournées de plusieurs colis groupés par driver, avec timeline et progression."
        actions={
          <>
            <Button variant="outline" size="sm">
              Carte temps réel
            </Button>
            <Button size="sm" onClick={() => setPlanOpen(true)}>
              <Plus className="size-4" />
              Planifier une tournée
            </Button>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Tournées du jour"
          value={String(rounds.length)}
          trend={{ value: "live", direction: "flat" }}
          helper={`dont ${active.length} actives`}
          icon={RouteIcon}
          tone="primary"
        />
        <StatCard
          label="Stops moyens / tournée"
          value={
            rounds.length > 0
              ? (
                  rounds.reduce((s, r) => s + r.stops.length, 0) / rounds.length
                ).toFixed(1)
              : "0"
          }
          trend={{ value: "agrégé", direction: "flat" }}
          helper="optimisation +8 % vs solo"
          icon={Package}
          tone="success"
        />
        <StatCard
          label="Tournées terminées"
          value={String(completed.length)}
          trend={{ value: "+5 ce matin", direction: "up" }}
          helper="durée moy. 1 h 47"
          icon={CheckCircle2}
          tone="primary"
        />
        <StatCard
          label="En retard"
          value={String(delayed.length)}
          trend={{ value: "à relancer", direction: "flat" }}
          helper="moy. +18 min"
          icon={TimerOff}
          tone="warning"
        />
      </section>

      <div className="flex flex-col gap-3 rounded-xl border border-[color:var(--border)] bg-white p-4 dark:bg-[color:var(--muted)]">
        <div className="flex flex-wrap items-center gap-3">
          <SearchField
            placeholder="Rechercher un FY-RND-…, driver, zone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:flex-1 sm:min-w-72"
          />
          <Combobox
            options={ZONE_FILTER}
            value={zone}
            onChange={setZone}
            className="sm:w-44"
          />
        </div>
      </div>

      <Tabs
        defaultValue="active"
        tabs={[
          {
            value: "active",
            label: "En cours",
            badge: { count: active.length, tone: "primary" },
            content: gridFor(active),
          },
          {
            value: "delayed",
            label: "En retard",
            badge: { count: delayed.length, tone: "danger" },
            content: gridFor(delayed),
          },
          {
            value: "planned",
            label: "Planifiées",
            badge: { count: planned.length, tone: "neutral" },
            content: gridFor(planned),
          },
          {
            value: "completed",
            label: "Terminées",
            content: gridFor(completed),
          },
          {
            value: "cancelled",
            label: "Annulées",
            badge: { count: cancelled.length, tone: "danger" },
            content: gridFor(cancelled),
          },
        ]}
      />

      <PlanRoundModal open={planOpen} onClose={() => setPlanOpen(false)} />

      <ConfirmModal
        open={confirm.open}
        onClose={() => setConfirm((c) => ({ ...c, open: false }))}
        onConfirm={runConfirm}
        title={
          confirm.action === "complete"
            ? "Marquer comme terminée ?"
            : confirm.action === "cancel"
              ? "Annuler cette tournée ?"
              : "Supprimer cette tournée ?"
        }
        description={
          confirm.target ? (
            <p>
              <span className="font-mono text-xs">{confirm.target.roundNumber}</span> ·{" "}
              {confirm.target.driverName}
            </p>
          ) : null
        }
        confirmLabel={
          confirm.action === "complete"
            ? "Terminer"
            : confirm.action === "cancel"
              ? "Annuler la tournée"
              : "Supprimer"
        }
        tone={confirm.action === "complete" ? "primary" : "danger"}
        withReason={
          confirm.action === "cancel"
            ? { label: "Motif d'annulation", required: true }
            : undefined
        }
      />
    </div>
  );
}
