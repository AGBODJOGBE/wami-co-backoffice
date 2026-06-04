"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Clock,
  Mail,
  Pencil,
  Phone,
  Plus,
  PowerOff,
  ShieldCheck,
  Trash2,
  Warehouse,
  XCircle,
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
import { Tabs } from "@/shared/ui/tabs";
import { toast } from "@/shared/ui/toast";
import { StatCard } from "@/features/dashboard/presentation/components/stat-card";
import {
  PARTNER_TYPE_LABELS,
  usePartnersStore,
  type NewPartnerInput,
  type PartnerRow,
  type PartnerType,
} from "./store";

const TYPE_FILTER = [
  { value: "ALL", label: "Tous types" },
  { value: "RESTAURANT", label: "Restaurant" },
  { value: "PHARMACY", label: "Pharmacie" },
  { value: "RETAIL", label: "Commerce" },
  { value: "ENTERPRISE", label: "Entreprise" },
];

const TYPE_FORM = TYPE_FILTER.filter((o) => o.value !== "ALL");

const CITY_FILTER = [
  { value: "ALL", label: "Toutes villes" },
  { value: "Cotonou", label: "Cotonou" },
  { value: "Calavi", label: "Calavi" },
  { value: "Porto-Novo", label: "Porto-Novo" },
  { value: "Ouidah", label: "Ouidah" },
];

const TYPE_TONE: Record<PartnerType, "warning" | "primary" | "info" | "neutral"> = {
  RESTAURANT: "warning",
  PHARMACY: "primary",
  RETAIL: "info",
  ENTERPRISE: "neutral",
};

function PartnerFormModal({
  open,
  mode,
  partner,
  onClose,
}: {
  open: boolean;
  mode: "create" | "edit";
  partner?: PartnerRow;
  onClose: () => void;
}) {
  const create = usePartnersStore((s) => s.create);
  const update = usePartnersStore((s) => s.update);
  const empty: NewPartnerInput = {
    name: "",
    type: "RESTAURANT",
    city: "Cotonou",
    contactName: "",
    contactPhone: "+229 ",
    contactEmail: "",
    warehouseCount: 1,
  };
  const [form, setForm] = useState<NewPartnerInput>(empty);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && partner) {
      setForm({
        name: partner.name,
        type: partner.type,
        city: partner.city,
        contactName: partner.contactName,
        contactPhone: partner.contactPhone,
        contactEmail: partner.contactEmail,
        warehouseCount: partner.warehouseCount,
      });
    } else {
      setForm(empty);
    }
  }, [open, mode, partner]);

  function set<K extends keyof NewPartnerInput>(key: K, value: NewPartnerInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit() {
    if (!form.name || !form.contactName || !form.contactPhone) {
      toast({
        kind: "error",
        title: "Champs manquants",
        description: "Nom, contact et téléphone sont obligatoires.",
      });
      return;
    }
    if (mode === "create") {
      create(form);
      toast({
        kind: "success",
        title: "Partenaire ajouté",
        description: `${form.name} attend l'approbation.`,
      });
    } else if (partner) {
      update(partner.partnerId, form);
      toast({ kind: "success", title: "Partenaire mis à jour", description: form.name });
    }
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={mode === "create" ? "Nouveau partenaire" : "Modifier le partenaire"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSubmit}>
            {mode === "create" ? "Ajouter" : "Enregistrer"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Nom du partenaire"
          required
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Restaurant Le Médicis"
          className="sm:col-span-2"
        />
        <Combobox
          label="Type"
          options={TYPE_FORM}
          value={form.type}
          onChange={(v) => set("type", v as PartnerType)}
          required
        />
        <Combobox
          label="Ville"
          options={CITY_FILTER.filter((o) => o.value !== "ALL")}
          value={form.city}
          onChange={(v) => set("city", v)}
        />
        <Input
          label="Contact"
          required
          value={form.contactName}
          onChange={(e) => set("contactName", e.target.value)}
          placeholder="Chef Akplogan"
        />
        <Input
          label="Téléphone"
          required
          value={form.contactPhone}
          onChange={(e) => set("contactPhone", e.target.value)}
        />
        <Input
          label="Email"
          type="email"
          value={form.contactEmail}
          onChange={(e) => set("contactEmail", e.target.value)}
          className="sm:col-span-2"
        />
        <Input
          label="Nombre d'entrepôts / points de pickup"
          type="number"
          min={1}
          value={form.warehouseCount}
          onChange={(e) => set("warehouseCount", Number(e.target.value))}
        />
      </div>
    </Modal>
  );
}

type ConfirmAction = "approve" | "suspend" | "reactivate" | "delete";

export function PartnersPage() {
  const partners = usePartnersStore((s) => s.partners);
  const approve = usePartnersStore((s) => s.approve);
  const suspend = usePartnersStore((s) => s.suspend);
  const reactivate = usePartnersStore((s) => s.reactivate);
  const remove = usePartnersStore((s) => s.remove);

  const [search, setSearch] = useState("");
  const [type, setType] = useState("ALL");
  const [city, setCity] = useState("ALL");

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formTarget, setFormTarget] = useState<PartnerRow | undefined>(undefined);

  const [confirm, setConfirm] = useState<{
    open: boolean;
    action: ConfirmAction;
    target: PartnerRow | null;
  }>({ open: false, action: "approve", target: null });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return partners.filter((p) => {
      if (q) {
        const haystack = `${p.name} ${p.contactName} ${p.contactPhone} ${p.contactEmail}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (type !== "ALL" && p.type !== type) return false;
      if (city !== "ALL" && p.city !== city) return false;
      return true;
    });
  }, [partners, search, type, city]);

  const pending = filtered.filter((p) => p.status === "PENDING");
  const approved = filtered.filter((p) => p.status === "APPROVED");
  const suspended = filtered.filter((p) => p.status === "SUSPENDED");

  function openCreate() {
    setFormMode("create");
    setFormTarget(undefined);
    setFormOpen(true);
  }

  function openEdit(p: PartnerRow) {
    setFormMode("edit");
    setFormTarget(p);
    setFormOpen(true);
  }

  function runConfirm() {
    if (!confirm.target) return;
    const p = confirm.target;
    if (confirm.action === "approve") {
      approve(p.partnerId);
      toast({ kind: "success", title: "Partenaire approuvé", description: p.name });
    } else if (confirm.action === "suspend") {
      suspend(p.partnerId);
      toast({ kind: "warning", title: "Partenaire suspendu", description: p.name });
    } else if (confirm.action === "reactivate") {
      reactivate(p.partnerId);
      toast({ kind: "success", title: "Partenaire réactivé", description: p.name });
    } else if (confirm.action === "delete") {
      remove(p.partnerId);
      toast({ kind: "info", title: "Partenaire supprimé", description: p.name });
    }
    setConfirm((c) => ({ ...c, open: false, target: null }));
  }

  const columns: ColumnDef<PartnerRow>[] = [
    {
      key: "partner",
      header: "Partenaire",
      sortAccessor: (row) => row.name.toLowerCase(),
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar name={row.name} />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-medium text-[color:var(--foreground)]">
              {row.name}
            </span>
            <span className="text-xs text-[color:var(--muted-foreground)]">
              {row.city}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortAccessor: (row) => row.type,
      filter: {
        accessor: (row) => row.type,
        def: {
          kind: "select",
          options: [
            { value: "RESTAURANT", label: "Restaurant" },
            { value: "PHARMACY", label: "Pharmacie" },
            { value: "RETAIL", label: "Commerce" },
            { value: "ENTERPRISE", label: "Entreprise" },
          ],
        },
      },
      render: (row) => (
        <Badge tone={TYPE_TONE[row.type]}>{PARTNER_TYPE_LABELS[row.type]}</Badge>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      sortAccessor: (row) => row.contactName.toLowerCase(),
      render: (row) => (
        <div className="flex flex-col gap-0.5 leading-tight">
          <span className="text-sm text-[color:var(--foreground)]">
            {row.contactName}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-[color:var(--muted-foreground)]">
            <Phone className="size-3" />
            {row.contactPhone}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-[color:var(--muted-foreground)]">
            <Mail className="size-3" />
            {row.contactEmail}
          </span>
        </div>
      ),
    },
    {
      key: "warehouses",
      header: "Entrepôts",
      align: "right",
      sortAccessor: (row) => row.warehouseCount,
      filter: {
        accessor: (row) => row.warehouseCount,
        def: { kind: "number" },
      },
      render: (row) => (
        <span className="inline-flex items-center gap-1 text-sm text-[color:var(--foreground)]">
          <Warehouse className="size-3.5 text-[color:var(--muted-foreground)]" />
          {row.warehouseCount}
        </span>
      ),
    },
    {
      key: "volume",
      header: "Volume / mois",
      align: "right",
      sortAccessor: (row) => row.ordersThisMonth,
      filter: {
        accessor: (row) => row.ordersThisMonth,
        def: { kind: "number", unit: "cmd/mois" },
      },
      render: (row) => (
        <div className="flex flex-col items-end leading-tight">
          <span className="font-mono text-sm font-semibold text-[color:var(--foreground)]">
            {row.ordersThisMonth.toLocaleString("fr-FR")}
          </span>
          <span className="text-xs text-[color:var(--muted-foreground)]">commandes</span>
        </div>
      ),
    },
    {
      key: "joined",
      header: "Inscription",
      sortAccessor: (row) => row.joinedAgo,
      render: (row) => (
        <span className="inline-flex items-center gap-1 text-xs text-[color:var(--muted-foreground)]">
          <Clock className="size-3" />
          {row.joinedAgo}
        </span>
      ),
    },
    {
      key: "status",
      header: "Statut",
      sortAccessor: (row) => row.status,
      filter: {
        accessor: (row) => row.status,
        def: {
          kind: "select",
          options: [
            { value: "PENDING", label: "En attente" },
            { value: "APPROVED", label: "Approuvé" },
            { value: "SUSPENDED", label: "Suspendu" },
          ],
        },
      },
      render: (row) => {
        const tone =
          row.status === "APPROVED"
            ? "success"
            : row.status === "PENDING"
              ? "warning"
              : "danger";
        const label =
          row.status === "APPROVED"
            ? "Approuvé"
            : row.status === "PENDING"
              ? "En attente"
              : "Suspendu";
        return <Badge tone={tone}>{label}</Badge>;
      },
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
                row.status === "PENDING"
                  ? {
                      label: "Approuver",
                      icon: ShieldCheck,
                      onSelect: () =>
                        setConfirm({ open: true, action: "approve", target: row }),
                    }
                  : row.status === "SUSPENDED"
                    ? {
                        label: "Réactiver",
                        icon: ShieldCheck,
                        onSelect: () =>
                          setConfirm({
                            open: true,
                            action: "reactivate",
                            target: row,
                          }),
                      }
                    : {
                        label: "Suspendre",
                        icon: PowerOff,
                        onSelect: () =>
                          setConfirm({ open: true, action: "suspend", target: row }),
                        danger: true,
                      },
                { label: "Modifier", icon: Pencil, onSelect: () => openEdit(row) },
                row.status === "PENDING"
                  ? {
                      label: "Rejeter",
                      icon: XCircle,
                      onSelect: () =>
                        setConfirm({ open: true, action: "delete", target: row }),
                      danger: true,
                    }
                  : { label: "—", onSelect: () => {}, disabled: true },
              ],
            },
            {
              items: [
                {
                  label: "Supprimer",
                  icon: Trash2,
                  onSelect: () =>
                    setConfirm({ open: true, action: "delete", target: row }),
                  danger: true,
                },
              ],
            },
          ]}
        />
      ),
    },
  ];

  function tableFor(rows: PartnerRow[]) {
    return (
      <Card className="overflow-hidden p-0">
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(r) => r.partnerId}
          rowHref={(r) => `/delivery/partners/${r.partnerId}`}
          defaultSort={{ key: "partner", direction: "asc" }}
        />
        <PaginationFooter total={partners.length} shown={rows.length} />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Référentiel livraison"
        title="Partenaires & entrepôts"
        dataSource="mock"
        description="Restaurants, pharmacies, commerces — points de pickup récurrents."
        actions={
          <>
            <Button variant="outline" size="sm">
              Exporter CSV
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="size-4" />
              Nouveau partenaire
            </Button>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Partenaires actifs"
          value={String(approved.length)}
          trend={{ value: "live", direction: "flat" }}
          helper="approuvés"
          icon={Building2}
          tone="primary"
        />
        <StatCard
          label="Entrepôts mappés"
          value={String(partners.reduce((s, p) => s + p.warehouseCount, 0))}
          trend={{ value: "agrégé", direction: "flat" }}
          helper="référentiel adresses"
          icon={Warehouse}
          tone="secondary"
        />
        <StatCard
          label="En attente d'approbation"
          value={String(pending.length)}
          trend={{ value: "à traiter", direction: "flat" }}
          helper="moy. 2 j de délai"
          icon={Clock}
          tone="warning"
        />
        <StatCard
          label="Onboarding réussis"
          value="87 %"
          trend={{ value: "+3 pt", direction: "up" }}
          helper="≥ 1 commande dans le mois"
          icon={CheckCircle2}
          tone="success"
        />
      </section>

      <div className="flex flex-col gap-3 rounded-xl border border-[color:var(--border)] bg-white p-4 dark:bg-[color:var(--muted)]">
        <div className="flex flex-wrap items-center gap-3">
          <SearchField
            placeholder="Rechercher un partenaire, contact, ville…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:flex-1 sm:min-w-72"
          />
          <Combobox
            options={TYPE_FILTER}
            value={type}
            onChange={setType}
            className="sm:w-44"
          />
          <Combobox
            options={CITY_FILTER}
            value={city}
            onChange={setCity}
            className="sm:w-44"
          />
        </div>
      </div>

      <Tabs
        defaultValue="all"
        tabs={[
          { value: "all", label: "Tous", content: tableFor(filtered) },
          {
            value: "pending",
            label: "En attente",
            badge: { count: pending.length, tone: "warning" },
            content: tableFor(pending),
          },
          {
            value: "approved",
            label: "Approuvés",
            badge: { count: approved.length, tone: "success" },
            content: tableFor(approved),
          },
          {
            value: "suspended",
            label: "Suspendus",
            badge: { count: suspended.length, tone: "danger" },
            content: tableFor(suspended),
          },
        ]}
      />

      <PartnerFormModal
        open={formOpen}
        mode={formMode}
        partner={formTarget}
        onClose={() => setFormOpen(false)}
      />

      <ConfirmModal
        open={confirm.open}
        onClose={() => setConfirm((c) => ({ ...c, open: false }))}
        onConfirm={runConfirm}
        title={
          {
            approve: "Approuver ce partenaire ?",
            suspend: "Suspendre ce partenaire ?",
            reactivate: "Réactiver ce partenaire ?",
            delete: "Supprimer ce partenaire ?",
          }[confirm.action]
        }
        description={
          confirm.target ? (
            <p className="font-medium text-[color:var(--foreground)]">
              {confirm.target.name}
            </p>
          ) : null
        }
        confirmLabel={
          {
            approve: "Approuver",
            suspend: "Suspendre",
            reactivate: "Réactiver",
            delete: "Supprimer définitivement",
          }[confirm.action]
        }
        tone={
          confirm.action === "delete" || confirm.action === "suspend"
            ? "danger"
            : "primary"
        }
        withReason={
          confirm.action === "suspend"
            ? { label: "Motif", required: true }
            : undefined
        }
      />
    </div>
  );
}
