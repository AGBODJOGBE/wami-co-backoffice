"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  CircleSlash,
  FileWarning,
  Pencil,
  PowerOff,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  UserX,
  XCircle,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Combobox } from "@/shared/ui/combobox";
import { ConfirmModal } from "@/shared/ui/confirm-modal";
import { SearchField } from "@/shared/ui/search-field";
import { Tabs } from "@/shared/ui/tabs";
import { toast } from "@/shared/ui/toast";
import { StatCard } from "@/features/dashboard/presentation/components/stat-card";
import { useDriversStore } from "../store";
import type { DriverRow } from "../domain/driver";
import { DriverFormModal } from "./driver-form-modal";
import { DriversTable } from "./drivers-table";
import { KycCard } from "./kyc-card";
import { RequestDocsModal } from "./request-docs-modal";

const CATEGORY_FILTER = [
  { value: "ALL", label: "Toutes catégories" },
  { value: "MOTO", label: "Moto" },
  { value: "TRICYCLE", label: "Tricycle" },
  { value: "STANDARD", label: "Standard" },
  { value: "PREMIUM", label: "Premium" },
  { value: "VIP", label: "VIP" },
];

const CITY_FILTER = [
  { value: "ALL", label: "Toutes villes" },
  { value: "Cotonou", label: "Cotonou" },
  { value: "Calavi", label: "Calavi" },
  { value: "Porto-Novo", label: "Porto-Novo" },
  { value: "Ouidah", label: "Ouidah" },
];

const ONLINE_FILTER = [
  { value: "ALL", label: "Tous (en ligne / hors ligne)" },
  { value: "ONLINE", label: "En ligne uniquement" },
  { value: "OFFLINE", label: "Hors ligne uniquement" },
];

type ConfirmAction = "approve" | "reject" | "suspend" | "reactivate" | "delete";

export function DriversPage() {
  const drivers = useDriversStore((s) => s.drivers);
  const approve = useDriversStore((s) => s.approve);
  const reject = useDriversStore((s) => s.reject);
  const suspend = useDriversStore((s) => s.suspend);
  const reactivate = useDriversStore((s) => s.reactivate);
  const remove = useDriversStore((s) => s.remove);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [city, setCity] = useState("ALL");
  const [online, setOnline] = useState("ALL");

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formTarget, setFormTarget] = useState<DriverRow | undefined>(undefined);

  const [docsOpen, setDocsOpen] = useState(false);
  const [docsTarget, setDocsTarget] = useState<DriverRow | null>(null);

  const [confirm, setConfirm] = useState<{
    open: boolean;
    action: ConfirmAction;
    target: DriverRow | null;
  }>({ open: false, action: "approve", target: null });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return drivers.filter((d) => {
      if (q) {
        const haystack = `${d.fullName} ${d.phone} ${d.email} ${d.plate}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (category !== "ALL" && d.category !== category) return false;
      if (city !== "ALL" && d.city !== city) return false;
      if (online === "ONLINE" && !d.isOnline) return false;
      if (online === "OFFLINE" && d.isOnline) return false;
      return true;
    });
  }, [drivers, search, category, city, online]);

  const pending = filtered.filter((d) => d.status === "PENDING");
  const approved = filtered.filter((d) => d.status === "APPROVED");
  const suspended = filtered.filter((d) => d.status === "SUSPENDED");
  const rejected = filtered.filter((d) => d.status === "REJECTED");

  function openCreate() {
    setFormMode("create");
    setFormTarget(undefined);
    setFormOpen(true);
  }

  function openEdit(driver: DriverRow) {
    setFormMode("edit");
    setFormTarget(driver);
    setFormOpen(true);
  }

  function openDocs(driver: DriverRow) {
    setDocsTarget(driver);
    setDocsOpen(true);
  }

  function openConfirm(action: ConfirmAction, target: DriverRow) {
    setConfirm({ open: true, action, target });
  }

  function runConfirm() {
    if (!confirm.target) return;
    const { driverId, fullName } = confirm.target;
    if (confirm.action === "approve") {
      approve(driverId);
      toast({ kind: "success", title: "Driver approuvé", description: fullName });
    } else if (confirm.action === "reject") {
      reject(driverId);
      toast({ kind: "info", title: "Candidature rejetée", description: fullName });
    } else if (confirm.action === "suspend") {
      suspend(driverId);
      toast({ kind: "warning", title: "Driver suspendu", description: fullName });
    } else if (confirm.action === "reactivate") {
      reactivate(driverId);
      toast({ kind: "success", title: "Driver réactivé", description: fullName });
    } else if (confirm.action === "delete") {
      remove(driverId);
      toast({ kind: "info", title: "Driver supprimé", description: fullName });
    }
    setConfirm({ open: false, action: confirm.action, target: null });
  }

  function actionsFor(driver: DriverRow) {
    switch (driver.status) {
      case "PENDING":
        return [
          {
            label: "Cas d'usage",
            items: [
              {
                label: "Approuver KYC",
                icon: ShieldCheck,
                onSelect: () => openConfirm("approve", driver),
                disabled: driver.missingDocuments.length > 0,
              },
              {
                label: "Demander des pièces",
                icon: FileWarning,
                onSelect: () => openDocs(driver),
              },
              {
                label: "Rejeter la candidature",
                icon: XCircle,
                onSelect: () => openConfirm("reject", driver),
                danger: true,
              },
            ],
          },
          {
            items: [
              { label: "Modifier", icon: Pencil, onSelect: () => openEdit(driver) },
              {
                label: "Supprimer",
                icon: Trash2,
                onSelect: () => openConfirm("delete", driver),
                danger: true,
              },
            ],
          },
        ];
      case "APPROVED":
        return [
          {
            label: "Cas d'usage",
            items: [
              { label: "Modifier", icon: Pencil, onSelect: () => openEdit(driver) },
              {
                label: "Suspendre",
                icon: PowerOff,
                onSelect: () => openConfirm("suspend", driver),
                danger: true,
              },
            ],
          },
          {
            items: [
              {
                label: "Supprimer",
                icon: Trash2,
                onSelect: () => openConfirm("delete", driver),
                danger: true,
              },
            ],
          },
        ];
      case "SUSPENDED":
        return [
          {
            label: "Cas d'usage",
            items: [
              {
                label: "Réactiver",
                icon: ShieldCheck,
                onSelect: () => openConfirm("reactivate", driver),
              },
              { label: "Modifier", icon: Pencil, onSelect: () => openEdit(driver) },
            ],
          },
          {
            items: [
              {
                label: "Supprimer",
                icon: Trash2,
                onSelect: () => openConfirm("delete", driver),
                danger: true,
              },
            ],
          },
        ];
      case "REJECTED":
      default:
        return [
          {
            items: [
              { label: "Modifier", icon: Pencil, onSelect: () => openEdit(driver) },
              {
                label: "Supprimer",
                icon: Trash2,
                onSelect: () => openConfirm("delete", driver),
                danger: true,
              },
            ],
          },
        ];
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed border-[color:var(--border)] bg-[color:var(--muted)]/30 px-3 py-2 text-xs text-[color:var(--muted-foreground)]">
        <span>
          Cette section utilise des données simulées — l&apos;API admin
          n&apos;expose pas encore la liste complète ni le détail driver.
        </span>
        <Button size="sm" onClick={openCreate} variant="outline">
          <UserPlus className="size-4" />
          Inviter (démo)
        </Button>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Drivers actifs"
          value={String(approved.length)}
          trend={{ value: "live", direction: "flat" }}
          helper={`dont ${approved.filter((d) => d.isOnline).length} en ligne`}
          icon={UserCheck}
          tone="success"
        />
        <StatCard
          label="En attente KYC"
          value={String(pending.length)}
          trend={{ value: "à traiter", direction: "flat" }}
          helper="moy. 14 h d'attente"
          icon={ShieldAlert}
          tone="warning"
        />
        <StatCard
          label="Suspendus"
          value={String(suspended.length)}
          trend={{ value: "stable", direction: "flat" }}
          helper="motifs : fraude, no-show"
          icon={UserX}
          tone="warning"
        />
        <StatCard
          label="Rejetés"
          value={String(rejected.length)}
          trend={{ value: "archive", direction: "flat" }}
          helper="candidatures non retenues"
          icon={CircleSlash}
          tone="primary"
        />
      </section>

      <div className="flex flex-col gap-3 rounded-xl border border-[color:var(--border)] bg-white p-4 dark:bg-[color:var(--muted)]">
        <div className="flex flex-wrap items-center gap-3">
          <SearchField
            placeholder="Rechercher un driver, plaque, téléphone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:flex-1 sm:min-w-72"
          />
          <Combobox
            options={CATEGORY_FILTER}
            value={category}
            onChange={setCategory}
            className="sm:w-44"
          />
          <Combobox
            options={CITY_FILTER}
            value={city}
            onChange={setCity}
            className="sm:w-44"
          />
          <Combobox
            options={ONLINE_FILTER}
            value={online}
            onChange={setOnline}
            className="sm:w-56"
          />
        </div>
      </div>

      <Tabs
        defaultValue="all"
        tabs={[
          {
            value: "all",
            label: "Tous",
            content: (
              <DriversTable
                rows={filtered}
                total={filtered.length}
                actions={actionsFor}
              />
            ),
          },
          {
            value: "pending",
            label: "En attente KYC",
            badge: { count: pending.length, tone: "warning" },
            content:
              pending.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[color:var(--border)] p-12 text-center text-sm text-[color:var(--muted-foreground)]">
                  Aucun driver en attente.
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                  {pending.map((driver) => (
                    <KycCard
                      key={driver.driverId}
                      driver={driver}
                      onApprove={() => openConfirm("approve", driver)}
                      onRequestDocs={() => openDocs(driver)}
                      onReject={() => openConfirm("reject", driver)}
                    />
                  ))}
                </div>
              ),
          },
          {
            value: "approved",
            label: "Approuvés",
            badge: { count: approved.length, tone: "success" },
            content: (
              <DriversTable
                rows={approved}
                total={approved.length}
                actions={actionsFor}
              />
            ),
          },
          {
            value: "suspended",
            label: "Suspendus",
            badge: { count: suspended.length, tone: "danger" },
            content: (
              <DriversTable
                rows={suspended}
                total={suspended.length}
                actions={actionsFor}
              />
            ),
          },
          {
            value: "rejected",
            label: "Rejetés",
            badge: { count: rejected.length, tone: "neutral" },
            content: (
              <DriversTable
                rows={rejected}
                total={rejected.length}
                actions={actionsFor}
              />
            ),
          },
        ]}
      />

      <DriverFormModal
        open={formOpen}
        mode={formMode}
        driver={formTarget}
        onClose={() => setFormOpen(false)}
      />

      <RequestDocsModal
        open={docsOpen}
        driver={docsTarget}
        onClose={() => setDocsOpen(false)}
      />

      <ConfirmModal
        open={confirm.open}
        onClose={() => setConfirm((c) => ({ ...c, open: false }))}
        onConfirm={runConfirm}
        title={
          {
            approve: "Approuver le driver ?",
            reject: "Rejeter la candidature ?",
            suspend: "Suspendre le driver ?",
            reactivate: "Réactiver le driver ?",
            delete: "Supprimer le driver ?",
          }[confirm.action]
        }
        description={
          confirm.target ? (
            <p>
              <span className="font-medium text-[color:var(--foreground)]">
                {confirm.target.fullName}
              </span>{" "}
              ·{" "}
              <span className="font-mono text-xs">{confirm.target.plate}</span>
            </p>
          ) : null
        }
        confirmLabel={
          {
            approve: "Approuver",
            reject: "Rejeter",
            suspend: "Suspendre",
            reactivate: "Réactiver",
            delete: "Supprimer définitivement",
          }[confirm.action]
        }
        tone={
          confirm.action === "delete" ||
          confirm.action === "suspend" ||
          confirm.action === "reject"
            ? "danger"
            : "primary"
        }
        withReason={
          confirm.action === "suspend"
            ? {
                label: "Motif de la suspension",
                placeholder: "No-show, fraude, infraction…",
                required: true,
              }
            : confirm.action === "reject"
              ? {
                  label: "Motif du rejet",
                  placeholder: "Pièces non valides, antécédents…",
                  required: true,
                }
              : undefined
        }
      />
    </div>
  );
}
