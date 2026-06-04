"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  Mail,
  Pencil,
  Phone,
  PowerOff,
  ShieldCheck,
  Trash2,
  Warehouse,
} from "lucide-react";
import { Avatar } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Combobox } from "@/shared/ui/combobox";
import { ConfirmModal } from "@/shared/ui/confirm-modal";
import {
  DetailHeader,
  DetailNotFound,
  InfoGrid,
} from "@/shared/ui/detail-header";
import { DropdownMenu } from "@/shared/ui/dropdown-menu";
import { Input } from "@/shared/ui/input";
import { Modal } from "@/shared/ui/modal";
import { Tabs } from "@/shared/ui/tabs";
import { toast } from "@/shared/ui/toast";
import { mockDeliveryOrders } from "@/features/delivery/domain/mock";
import { DELIVERY_STATUS_META, PARCEL_TYPE_META } from "@/features/delivery/domain/delivery";
import { formatXof } from "@/shared/lib/format";
import {
  PARTNER_TYPE_LABELS,
  usePartnersStore,
  type PartnerRow,
  type PartnerType,
} from "./store";

const TYPE_TONE: Record<PartnerType, "warning" | "primary" | "info" | "neutral"> = {
  RESTAURANT: "warning",
  PHARMACY: "primary",
  RETAIL: "info",
  ENTERPRISE: "neutral",
};

type ConfirmAction = "approve" | "suspend" | "reactivate" | "delete";

const TYPE_OPTIONS = [
  { value: "RESTAURANT", label: "Restaurant" },
  { value: "PHARMACY", label: "Pharmacie" },
  { value: "RETAIL", label: "Commerce" },
  { value: "ENTERPRISE", label: "Entreprise" },
];

const CITY_OPTIONS = [
  { value: "Cotonou", label: "Cotonou" },
  { value: "Calavi", label: "Calavi" },
  { value: "Porto-Novo", label: "Porto-Novo" },
  { value: "Ouidah", label: "Ouidah" },
];

function PartnerEditModal({
  open,
  partner,
  onClose,
}: {
  open: boolean;
  partner: PartnerRow;
  onClose: () => void;
}) {
  const update = usePartnersStore((s) => s.update);
  const [form, setForm] = useState({
    name: partner.name,
    type: partner.type,
    city: partner.city,
    contactName: partner.contactName,
    contactPhone: partner.contactPhone,
    contactEmail: partner.contactEmail,
    warehouseCount: partner.warehouseCount,
  });

  function handleSubmit() {
    update(partner.partnerId, form);
    toast({ kind: "success", title: "Partenaire mis à jour", description: form.name });
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Modifier le partenaire"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSubmit}>Enregistrer</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Nom"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="sm:col-span-2"
        />
        <Combobox
          label="Type"
          options={TYPE_OPTIONS}
          value={form.type}
          onChange={(v) => setForm((f) => ({ ...f, type: v as PartnerType }))}
        />
        <Combobox
          label="Ville"
          options={CITY_OPTIONS}
          value={form.city}
          onChange={(v) => setForm((f) => ({ ...f, city: v }))}
        />
        <Input
          label="Contact"
          value={form.contactName}
          onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
        />
        <Input
          label="Téléphone"
          value={form.contactPhone}
          onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
        />
        <Input
          label="Email"
          type="email"
          value={form.contactEmail}
          onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
          className="sm:col-span-2"
        />
        <Input
          label="Nombre d'entrepôts"
          type="number"
          min={1}
          value={form.warehouseCount}
          onChange={(e) =>
            setForm((f) => ({ ...f, warehouseCount: Number(e.target.value) }))
          }
        />
      </div>
    </Modal>
  );
}

export function PartnerDetailPage({ partnerId }: { partnerId: string }) {
  const router = useRouter();
  const partner = usePartnersStore((s) =>
    s.partners.find((p) => p.partnerId === partnerId),
  );
  const approve = usePartnersStore((s) => s.approve);
  const suspend = usePartnersStore((s) => s.suspend);
  const reactivate = usePartnersStore((s) => s.reactivate);
  const remove = usePartnersStore((s) => s.remove);

  const [editOpen, setEditOpen] = useState(false);
  const [confirm, setConfirm] = useState<{
    open: boolean;
    action: ConfirmAction;
  }>({ open: false, action: "approve" });

  const partnerOrders = useMemo(() => {
    if (!partner) return [];
    const lower = partner.name.toLowerCase();
    return mockDeliveryOrders.filter((o) =>
      o.pickupAddress.toLowerCase().includes(lower),
    );
  }, [partner]);

  if (!partner) {
    return (
      <DetailNotFound
        backHref="/delivery/partners"
        backLabel="Retour aux partenaires"
        message="Partenaire introuvable."
      />
    );
  }

  function runConfirm(reason?: string) {
    if (!partner) return;
    if (confirm.action === "approve") {
      approve(partner.partnerId);
      toast({ kind: "success", title: "Partenaire approuvé", description: partner.name });
    } else if (confirm.action === "suspend") {
      suspend(partner.partnerId);
      toast({
        kind: "warning",
        title: "Partenaire suspendu",
        description: reason ?? partner.name,
      });
    } else if (confirm.action === "reactivate") {
      reactivate(partner.partnerId);
      toast({ kind: "success", title: "Partenaire réactivé", description: partner.name });
    } else if (confirm.action === "delete") {
      remove(partner.partnerId);
      toast({ kind: "info", title: "Partenaire supprimé", description: partner.name });
      router.push("/delivery/partners");
      return;
    }
    setConfirm({ open: false, action: confirm.action });
  }

  const headerActions = (
    <DropdownMenu
      trigger={<Button size="sm">Actions</Button>}
      groups={[
        {
          label: "Cas d'usage",
          items: [
            { label: "Modifier", icon: Pencil, onSelect: () => setEditOpen(true) },
            partner.status === "PENDING"
              ? {
                  label: "Approuver",
                  icon: ShieldCheck,
                  onSelect: () => setConfirm({ open: true, action: "approve" }),
                }
              : partner.status === "SUSPENDED"
                ? {
                    label: "Réactiver",
                    icon: ShieldCheck,
                    onSelect: () => setConfirm({ open: true, action: "reactivate" }),
                  }
                : {
                    label: "Suspendre",
                    icon: PowerOff,
                    onSelect: () => setConfirm({ open: true, action: "suspend" }),
                    danger: true,
                  },
          ],
        },
        {
          items: [
            {
              label: "Supprimer",
              icon: Trash2,
              onSelect: () => setConfirm({ open: true, action: "delete" }),
              danger: true,
            },
          ],
        },
      ]}
    />
  );

  const statusBadge =
    partner.status === "APPROVED" ? (
      <Badge tone="success">Approuvé</Badge>
    ) : partner.status === "PENDING" ? (
      <Badge tone="warning">En attente</Badge>
    ) : (
      <Badge tone="danger">Suspendu</Badge>
    );

  return (
    <div className="flex flex-col gap-6">
      <DetailHeader
        backHref="/delivery/partners"
        backLabel="Retour aux partenaires"
        eyebrow={`Partenaire · ${PARTNER_TYPE_LABELS[partner.type]}`}
        title={partner.name}
        subtitle={
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span>{partner.city}</span>
            <span>· Inscrit {partner.joinedAgo}</span>
          </div>
        }
        avatar={<Avatar name={partner.name} className="size-16 text-lg" />}
        status={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={TYPE_TONE[partner.type]}>
              {PARTNER_TYPE_LABELS[partner.type]}
            </Badge>
            {statusBadge}
          </div>
        }
        actions={headerActions}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="flex flex-col gap-1 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
            Volume mensuel
          </p>
          <p className="text-2xl font-semibold text-[color:var(--foreground)]">
            {partner.ordersThisMonth.toLocaleString("fr-FR")}
          </p>
          <p className="text-xs text-[color:var(--muted-foreground)]">
            commandes ce mois-ci
          </p>
        </Card>
        <Card className="flex flex-col gap-1 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
            Entrepôts mappés
          </p>
          <p className="text-2xl font-semibold text-[color:var(--foreground)]">
            {partner.warehouseCount}
          </p>
          <p className="text-xs text-[color:var(--muted-foreground)]">
            points de pickup
          </p>
        </Card>
        <Card className="flex flex-col gap-1 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
            Statut compte
          </p>
          {statusBadge}
        </Card>
        <Card className="flex flex-col gap-1 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
            Inscription
          </p>
          <p className="inline-flex items-center gap-1 text-base font-medium text-[color:var(--foreground)]">
            <Calendar className="size-4" />
            {partner.joinedAgo}
          </p>
        </Card>
      </section>

      <Tabs
        defaultValue="overview"
        tabs={[
          {
            value: "overview",
            label: "Vue d'ensemble",
            content: (
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="p-5">
                  <h3 className="mb-4 text-base font-semibold text-[color:var(--foreground)]">
                    Identité
                  </h3>
                  <InfoGrid
                    rows={[
                      { label: "Nom légal", value: partner.name },
                      { label: "Type", value: PARTNER_TYPE_LABELS[partner.type] },
                      { label: "Ville", value: partner.city },
                      { label: "Inscrit", value: partner.joinedAgo },
                      {
                        label: "Partner ID",
                        value: <span className="font-mono text-xs">{partner.partnerId}</span>,
                      },
                    ]}
                  />
                </Card>
                <Card className="p-5">
                  <h3 className="mb-4 text-base font-semibold text-[color:var(--foreground)]">
                    Contact principal
                  </h3>
                  <InfoGrid
                    rows={[
                      { label: "Nom", value: partner.contactName },
                      {
                        label: "Téléphone",
                        value: (
                          <span className="inline-flex items-center gap-1.5 font-mono">
                            <Phone className="size-3" />
                            {partner.contactPhone}
                          </span>
                        ),
                      },
                      {
                        label: "Email",
                        value: (
                          <span className="inline-flex items-center gap-1.5 font-mono">
                            <Mail className="size-3" />
                            {partner.contactEmail}
                          </span>
                        ),
                      },
                    ]}
                    columns={1}
                  />
                </Card>
              </div>
            ),
          },
          {
            value: "warehouses",
            label: "Entrepôts",
            badge: { count: partner.warehouseCount, tone: "primary" },
            content: (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: partner.warehouseCount }, (_, i) => (
                  <Card key={i} className="flex items-start gap-3 p-4">
                    <span className="flex size-10 items-center justify-center rounded-lg bg-[color:var(--primary-soft)] text-[color:var(--primary)]">
                      <Warehouse className="size-5" />
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[color:var(--foreground)]">
                        {partner.name} — Entrepôt {i + 1}
                      </p>
                      <p className="text-xs text-[color:var(--muted-foreground)]">
                        {partner.city} · adresse à compléter via le backend
                      </p>
                      <Badge tone="primary" className="mt-2">
                        {PARTNER_TYPE_LABELS[partner.type]}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            ),
          },
          {
            value: "orders",
            label: "Commandes",
            badge: partnerOrders.length
              ? { count: partnerOrders.length, tone: "primary" }
              : undefined,
            content:
              partnerOrders.length === 0 ? (
                <Card className="p-12 text-center text-sm text-[color:var(--muted-foreground)]">
                  Aucune commande récente associée à ce partenaire dans la session.
                </Card>
              ) : (
                <Card className="overflow-hidden p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-y border-[color:var(--border)] text-left text-xs uppercase tracking-wide text-[color:var(--muted-foreground)]">
                        <th className="px-5 py-2.5 font-medium">Commande</th>
                        <th className="px-5 py-2.5 font-medium">Colis</th>
                        <th className="px-5 py-2.5 font-medium">Trajet</th>
                        <th className="px-5 py-2.5 text-right font-medium">Prix</th>
                        <th className="px-5 py-2.5 font-medium">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {partnerOrders.map((order) => {
                        const ometa = DELIVERY_STATUS_META[order.status];
                        const pmeta = PARCEL_TYPE_META[order.parcelType];
                        return (
                          <tr
                            key={order.orderId}
                            className="cursor-pointer border-b border-[color:var(--border)] last:border-b-0 hover:bg-[color:var(--muted)]/40"
                            onClick={() =>
                              router.push(`/delivery/orders/${order.orderId}`)
                            }
                          >
                            <td className="px-5 py-3">
                              <p className="font-mono text-xs font-semibold text-[color:var(--primary)]">
                                {order.orderNumber}
                              </p>
                              <p className="inline-flex items-center gap-1 text-xs text-[color:var(--muted-foreground)]">
                                <Clock className="size-3" />
                                {order.ago}
                              </p>
                            </td>
                            <td className="px-5 py-3">
                              <span className="inline-flex items-center gap-1.5 text-sm">
                                <span aria-hidden>{pmeta.emoji}</span>
                                {pmeta.label}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-xs text-[color:var(--muted-foreground)]">
                              → {order.dropoffAddress}
                            </td>
                            <td className="px-5 py-3 text-right font-mono text-sm">
                              {formatXof(order.finalPrice ?? order.estimatedPrice)}
                            </td>
                            <td className="px-5 py-3">
                              <Badge tone={ometa.tone}>{ometa.label}</Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </Card>
              ),
          },
        ]}
      />

      <PartnerEditModal
        open={editOpen}
        partner={partner}
        onClose={() => setEditOpen(false)}
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
        description={<p className="font-medium">{partner.name}</p>}
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
