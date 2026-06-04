"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Ban,
  Calendar,
  KeyRound,
  Pencil,
  PowerOff,
  ShieldCheck,
  Star,
  Trash2,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { Avatar } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Combobox } from "@/shared/ui/combobox";
import { ConfirmModal } from "@/shared/ui/confirm-modal";
import { DataTable, PaginationFooter, type ColumnDef } from "@/shared/ui/data-table";
import { DropdownMenu } from "@/shared/ui/dropdown-menu";
import { Input } from "@/shared/ui/input";
import { Modal } from "@/shared/ui/modal";
import { PageHeader } from "@/shared/ui/page-header";
import { SearchField } from "@/shared/ui/search-field";
import { toast } from "@/shared/ui/toast";
import { StatCard } from "@/features/dashboard/presentation/components/stat-card";
import { formatXof } from "@/shared/lib/format";
import {
  usePassengersStore,
  type NewPassengerInput,
  type PassengerRow,
} from "./store";

const CITY_OPTIONS = [
  { value: "ALL", label: "Toutes villes" },
  { value: "Cotonou", label: "Cotonou" },
  { value: "Calavi", label: "Calavi" },
  { value: "Porto-Novo", label: "Porto-Novo" },
  { value: "Ouidah", label: "Ouidah" },
];

const STATUS_OPTIONS = [
  { value: "ALL", label: "Tous statuts" },
  { value: "ACTIVE", label: "Actifs uniquement" },
  { value: "SUSPENDED", label: "Suspendus uniquement" },
];

const PERIOD_OPTIONS = [
  { value: "ALL", label: "Toute période" },
  { value: "30D", label: "30 derniers jours" },
  { value: "90D", label: "90 derniers jours" },
  { value: "1Y", label: "12 derniers mois" },
];

function PassengerFormModal({
  open,
  mode,
  passenger,
  onClose,
}: {
  open: boolean;
  mode: "create" | "edit";
  passenger?: PassengerRow;
  onClose: () => void;
}) {
  const create = usePassengersStore((s) => s.create);
  const update = usePassengersStore((s) => s.update);
  const empty: NewPassengerInput = {
    fullName: "",
    phone: "+229 ",
    email: "",
    city: "Cotonou",
  };
  const [form, setForm] = useState<NewPassengerInput>(empty);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && passenger) {
      setForm({
        fullName: passenger.fullName,
        phone: passenger.phone,
        email: passenger.email,
        city: passenger.city,
      });
    } else {
      setForm(empty);
    }
  }, [open, mode, passenger]);

  function set<K extends keyof NewPassengerInput>(key: K, value: NewPassengerInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit() {
    if (!form.fullName || !form.phone) {
      toast({
        kind: "error",
        title: "Champs manquants",
        description: "Le nom et le téléphone sont obligatoires.",
      });
      return;
    }
    if (mode === "create") {
      create(form);
      toast({ kind: "success", title: "Compte passager créé", description: form.fullName });
    } else if (passenger) {
      update(passenger.passengerId, form);
      toast({ kind: "success", title: "Profil mis à jour", description: form.fullName });
    }
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "create" ? "Nouveau passager" : "Modifier le passager"}
      description={
        mode === "create"
          ? "Crée un compte test avec un wallet à 0 FCFA."
          : "Mise à jour propagée à l'app passager."
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSubmit}>
            {mode === "create" ? "Créer" : "Enregistrer"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Nom complet"
          required
          value={form.fullName}
          onChange={(e) => set("fullName", e.target.value)}
        />
        <Input
          label="Téléphone"
          required
          value={form.phone}
          onChange={(e) => set("phone", e.target.value)}
        />
        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          className="sm:col-span-2"
        />
        <Combobox
          label="Ville"
          options={CITY_OPTIONS.filter((o) => o.value !== "ALL")}
          value={form.city}
          onChange={(v) => set("city", v)}
        />
      </div>
    </Modal>
  );
}

type ConfirmAction = "suspend" | "reactivate" | "reset-password" | "delete";

export function PassengersPage() {
  const passengers = usePassengersStore((s) => s.passengers);
  const suspend = usePassengersStore((s) => s.suspend);
  const reactivate = usePassengersStore((s) => s.reactivate);
  const remove = usePassengersStore((s) => s.remove);

  const [search, setSearch] = useState("");
  const [city, setCity] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [period, setPeriod] = useState("ALL");

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formTarget, setFormTarget] = useState<PassengerRow | undefined>(undefined);

  const [confirm, setConfirm] = useState<{
    open: boolean;
    action: ConfirmAction;
    target: PassengerRow | null;
  }>({ open: false, action: "suspend", target: null });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return passengers.filter((p) => {
      if (q) {
        const haystack = `${p.fullName} ${p.phone} ${p.email}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (city !== "ALL" && p.city !== city) return false;
      if (status === "ACTIVE" && p.isSuspended) return false;
      if (status === "SUSPENDED" && !p.isSuspended) return false;
      return true;
    });
  }, [passengers, search, city, status]);

  function openCreate() {
    setFormMode("create");
    setFormTarget(undefined);
    setFormOpen(true);
  }

  function openEdit(passenger: PassengerRow) {
    setFormMode("edit");
    setFormTarget(passenger);
    setFormOpen(true);
  }

  function openConfirm(action: ConfirmAction, target: PassengerRow) {
    setConfirm({ open: true, action, target });
  }

  function runConfirm() {
    if (!confirm.target) return;
    const { passengerId, fullName } = confirm.target;
    if (confirm.action === "suspend") {
      suspend(passengerId);
      toast({ kind: "warning", title: "Compte suspendu", description: fullName });
    } else if (confirm.action === "reactivate") {
      reactivate(passengerId);
      toast({ kind: "success", title: "Compte réactivé", description: fullName });
    } else if (confirm.action === "reset-password") {
      toast({
        kind: "info",
        title: "Mot de passe réinitialisé",
        description: `Un SMS a été envoyé à ${confirm.target.phone}.`,
      });
    } else if (confirm.action === "delete") {
      remove(passengerId);
      toast({ kind: "info", title: "Compte supprimé", description: fullName });
    }
    setConfirm((c) => ({ ...c, open: false, target: null }));
  }

  const totalWallet = passengers.reduce((sum, p) => sum + p.walletBalance, 0);
  const suspendedCount = passengers.filter((p) => p.isSuspended).length;

  const columns: ColumnDef<PassengerRow>[] = [
    {
      key: "passenger",
      header: "Client",
      sortAccessor: (row) => row.fullName.toLowerCase(),
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar name={row.fullName} />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-medium text-[color:var(--foreground)]">
              {row.fullName}
            </span>
            <span className="text-xs text-[color:var(--muted-foreground)]">
              {row.phone}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "city",
      header: "Ville",
      sortAccessor: (row) => row.city,
      filter: {
        accessor: (row) => row.city,
        def: {
          kind: "select",
          options: [
            { value: "Cotonou", label: "Cotonou" },
            { value: "Calavi", label: "Calavi" },
            { value: "Porto-Novo", label: "Porto-Novo" },
            { value: "Ouidah", label: "Ouidah" },
          ],
        },
      },
      render: (row) => (
        <span className="text-sm text-[color:var(--muted-foreground)]">{row.city}</span>
      ),
    },
    {
      key: "wallet",
      header: "Wallet",
      align: "right",
      sortAccessor: (row) => row.walletBalance,
      filter: {
        accessor: (row) => row.walletBalance,
        def: { kind: "number", unit: "FCFA" },
      },
      render: (row) => (
        <span className="font-mono text-sm text-[color:var(--foreground)]">
          {formatXof(row.walletBalance)}
        </span>
      ),
    },
    {
      key: "rides",
      header: "Courses",
      align: "right",
      sortAccessor: (row) => row.totalRides,
      filter: {
        accessor: (row) => row.totalRides,
        def: { kind: "number" },
      },
      render: (row) => (
        <div className="flex flex-col items-end leading-tight">
          <span className="text-sm font-medium text-[color:var(--foreground)]">
            {row.totalRides}
          </span>
          <span className="inline-flex items-center gap-0.5 text-xs text-[color:var(--muted-foreground)]">
            <Star className="size-3 fill-[color:var(--secondary)] text-[color:var(--secondary)]" />
            {row.rating.toFixed(1)}
          </span>
        </div>
      ),
    },
    {
      key: "rating",
      header: "Note",
      align: "right",
      sortAccessor: (row) => row.rating,
      filter: {
        accessor: (row) => row.rating,
        def: { kind: "number", unit: "★" },
      },
      render: (row) => (
        <span className="inline-flex items-center gap-1 text-sm text-[color:var(--foreground)]">
          <Star className="size-3.5 fill-[color:var(--secondary)] text-[color:var(--secondary)]" />
          {row.rating.toFixed(1)}
        </span>
      ),
    },
    {
      key: "lastActivity",
      header: "Dernière activité",
      sortAccessor: (row) => row.lastActivity,
      render: (row) => (
        <span className="text-xs text-[color:var(--muted-foreground)]">
          {row.lastActivity}
        </span>
      ),
    },
    {
      key: "status",
      header: "Statut",
      sortAccessor: (row) => (row.isSuspended ? 1 : 0),
      filter: {
        accessor: (row) => row.isSuspended,
        def: { kind: "boolean", trueLabel: "Suspendus", falseLabel: "Actifs" },
      },
      render: (row) =>
        row.isSuspended ? (
          <Badge tone="danger">Suspendu</Badge>
        ) : (
          <Badge tone="success">Actif</Badge>
        ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (row) => (
        <DropdownMenu
          groups={[
            {
              label: "Cas d'usage",
              items: [
                { label: "Modifier le profil", icon: Pencil, onSelect: () => openEdit(row) },
                {
                  label: "Réinitialiser le mot de passe",
                  icon: KeyRound,
                  onSelect: () => openConfirm("reset-password", row),
                },
                row.isSuspended
                  ? {
                      label: "Réactiver",
                      icon: ShieldCheck,
                      onSelect: () => openConfirm("reactivate", row),
                    }
                  : {
                      label: "Suspendre",
                      icon: PowerOff,
                      onSelect: () => openConfirm("suspend", row),
                      danger: true,
                    },
              ],
            },
            {
              items: [
                {
                  label: "Supprimer",
                  icon: Trash2,
                  onSelect: () => openConfirm("delete", row),
                  danger: true,
                },
              ],
            },
          ]}
        />
      ),
    },
  ];

  // Hide ESLint warning for unused period variable while keeping the filter UI
  void period;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Opérations VTC"
        title="Clients passagers"
        dataSource="mock"
        description="Recherche, fiche client, wallet, suspensions, reset password."
        actions={
          <>
            <Button variant="outline" size="sm">
              Exporter CSV
            </Button>
            <Button size="sm" onClick={openCreate}>
              <UserPlus className="size-4" />
              Inviter un test
            </Button>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total passagers"
          value={passengers.length.toLocaleString("fr-FR")}
          trend={{ value: "live", direction: "flat" }}
          helper="comptes en base"
          icon={Users}
          tone="primary"
        />
        <StatCard
          label="Actifs"
          value={String(passengers.length - suspendedCount)}
          trend={{ value: `${passengers.length} total`, direction: "flat" }}
          helper="non suspendus"
          icon={Calendar}
          tone="success"
        />
        <StatCard
          label="Wallet total"
          value={formatXof(totalWallet)}
          trend={{ value: "agrégé", direction: "flat" }}
          helper="solde main + bonus"
          icon={Wallet}
          tone="secondary"
        />
        <StatCard
          label="Comptes suspendus"
          value={String(suspendedCount)}
          trend={{ value: "à analyser", direction: "flat" }}
          helper="motifs : fraude, no-show"
          icon={Ban}
          tone="warning"
        />
      </section>

      <div className="flex flex-col gap-3 rounded-xl border border-[color:var(--border)] bg-white p-4 dark:bg-[color:var(--muted)]">
        <div className="flex flex-wrap items-center gap-3">
          <SearchField
            placeholder="Rechercher un nom, téléphone, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:flex-1 sm:min-w-72"
          />
          <Combobox
            options={CITY_OPTIONS}
            value={city}
            onChange={setCity}
            className="sm:w-44"
          />
          <Combobox
            options={STATUS_OPTIONS}
            value={status}
            onChange={setStatus}
            className="sm:w-48"
          />
          <Combobox
            options={PERIOD_OPTIONS}
            value={period}
            onChange={setPeriod}
            className="sm:w-48"
          />
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <DataTable
          rows={filtered}
          columns={columns}
          rowKey={(row) => row.passengerId}
          rowHref={(row) => `/vtc/passengers/${row.passengerId}`}
          defaultSort={{ key: "passenger", direction: "asc" }}
        />
        <PaginationFooter total={passengers.length} shown={filtered.length} />
      </Card>

      <PassengerFormModal
        open={formOpen}
        mode={formMode}
        passenger={formTarget}
        onClose={() => setFormOpen(false)}
      />

      <ConfirmModal
        open={confirm.open}
        onClose={() => setConfirm((c) => ({ ...c, open: false }))}
        onConfirm={runConfirm}
        title={
          {
            suspend: "Suspendre ce passager ?",
            reactivate: "Réactiver ce passager ?",
            "reset-password": "Réinitialiser le mot de passe ?",
            delete: "Supprimer définitivement ?",
          }[confirm.action]
        }
        description={
          confirm.target ? (
            <p>
              <span className="font-medium text-[color:var(--foreground)]">
                {confirm.target.fullName}
              </span>{" "}
              · {confirm.target.phone}
            </p>
          ) : null
        }
        confirmLabel={
          {
            suspend: "Suspendre",
            reactivate: "Réactiver",
            "reset-password": "Envoyer le SMS",
            delete: "Supprimer",
          }[confirm.action]
        }
        tone={
          confirm.action === "delete" || confirm.action === "suspend"
            ? "danger"
            : "primary"
        }
        withReason={
          confirm.action === "suspend"
            ? {
                label: "Motif",
                placeholder: "No-show, fraude, abus…",
                required: true,
              }
            : undefined
        }
      />
    </div>
  );
}
