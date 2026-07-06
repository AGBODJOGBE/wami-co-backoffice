"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { ConfirmModal } from "@/shared/ui/confirm-modal";
import { Input } from "@/shared/ui/input";
import { Modal } from "@/shared/ui/modal";
import { Select } from "@/shared/ui/select";
import { Spinner } from "@/shared/ui/spinner";
import { toast } from "@/shared/ui/toast";
import {
  createPricingZoneAction,
  deletePricingZoneAction,
  updatePricingZoneAction,
} from "../application/pricing-zones-actions";
import {
  SERVICE_KEY_LABELS,
  SERVICE_KEY_OPTIONS,
} from "../domain/pricing-profile";
import {
  ZONE_TYPE_LABELS,
  ZONE_TYPE_OPTIONS,
  type CreatePricingZoneInput,
  type PatchPricingZoneInput,
  type PricingZone,
  type ZoneType,
} from "../domain/pricing-zone";

export interface PricingZonesSectionProps {
  zones: PricingZone[];
  error?: string;
}

export function PricingZonesSection({ zones, error }: PricingZonesSectionProps) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PricingZone | null>(null);
  const [serviceFilter, setServiceFilter] = useState("ALL");
  const [deleteTarget, setDeleteTarget] = useState<PricingZone | null>(null);
  const [deleting, startDelete] = useTransition();

  const filtered =
    serviceFilter === "ALL"
      ? zones
      : zones.filter((z) => z.serviceKey === serviceFilter);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(z: PricingZone) {
    setEditing(z);
    setModalOpen(true);
  }

  function runDelete() {
    if (!deleteTarget) return;
    startDelete(async () => {
      const r = await deletePricingZoneAction(deleteTarget.zoneId);
      if (r.ok) {
        toast({ kind: "success", title: "Zone supprimée" });
        setDeleteTarget(null);
      } else {
        toast({ kind: "error", title: "Erreur", description: r.message });
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <MapPin className="size-5 text-[color:var(--primary)]" />
          <div>
            <h2 className="text-base font-semibold text-[color:var(--foreground)]">
              Zones de tarification
            </h2>
            <p className="text-xs text-[color:var(--muted-foreground)]">
              {zones.filter((z) => z.isActive).length} active{zones.filter((z) => z.isActive).length !== 1 ? "s" : ""} sur {zones.length} zone{zones.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => startRefresh(() => router.refresh())}
            disabled={refreshing}
          >
            {refreshing ? <Spinner size="sm" /> : <RefreshCw className="size-4" />}
            Rafraîchir
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-4" />
            Nouvelle zone
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-[color:var(--danger)]/30 bg-[color:var(--danger)]/10 px-4 py-3 text-sm text-[color:var(--danger)]">
          {error}
        </div>
      )}

      {/* Service filter + toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { value: "ALL", label: "Tous les services" },
          ...SERVICE_KEY_OPTIONS,
        ].map(({ value, label }) => {
          const count =
            value === "ALL"
              ? zones.length
              : zones.filter((z) => z.serviceKey === value).length;
          const isSelected = serviceFilter === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setServiceFilter(value)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-all ${
                isSelected
                  ? "bg-[color:var(--primary)] text-white shadow-sm"
                  : "border border-[color:var(--border)] bg-[color:var(--background)] text-[color:var(--foreground)] hover:bg-[color:var(--muted)]"
              }`}
            >
              {label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  isSelected
                    ? "bg-white/20 text-white"
                    : "bg-[color:var(--muted)] text-[color:var(--muted-foreground)]"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[color:var(--border)] py-12 text-center">
          <MapPin className="size-8 text-[color:var(--muted-foreground)]" />
          <div>
            <p className="text-sm font-medium text-[color:var(--foreground)]">Aucune zone de tarification</p>
            <p className="mt-1 max-w-sm text-xs text-[color:var(--muted-foreground)]">
              Les zones sont utilisées par les composants PER_ZONE et DISTANCE_ZONE dans les profils.
            </p>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-4" />
            Créer une zone
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[color:var(--border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[color:var(--border)] bg-[color:var(--muted)]/40 text-left text-[11px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--border)]">
              {filtered.map((zone) => (
                <ZoneRow
                  key={zone.zoneId}
                  zone={zone}
                  onEdit={() => openEdit(zone)}
                  onDelete={() => setDeleteTarget(zone)}
                  onToggle={async () => {
                    const r = await updatePricingZoneAction(zone.zoneId, { isActive: !zone.isActive });
                    if (!r.ok) toast({ kind: "error", title: "Erreur", description: r.message });
                  }}
                />
              ))}
            </tbody>
          </table>
          <div className="border-t border-[color:var(--border)] bg-[color:var(--muted)]/20 px-4 py-2.5 text-xs text-[color:var(--muted-foreground)]">
            {filtered.length} zone{filtered.length > 1 ? "s" : ""}
            {serviceFilter !== "ALL"
              ? ` — ${SERVICE_KEY_LABELS[serviceFilter as keyof typeof SERVICE_KEY_LABELS] ?? serviceFilter}`
              : ""}
          </div>
        </div>
      )}

      <PricingZoneModal
        open={modalOpen}
        zone={editing}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
      />

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={runDelete}
        title="Supprimer cette zone ?"
        description={
          deleteTarget ? (
            <p>
              La zone <strong className="font-mono">{deleteTarget.code}</strong>{" "}
              ({deleteTarget.name}) sera supprimée définitivement.
            </p>
          ) : null
        }
        confirmLabel="Supprimer"
        tone="danger"
        isLoading={deleting}
      />
    </div>
  );
}

// ─── Row ───────────────────────────────────────────────────────────────────────

function ZoneRow({
  zone,
  onEdit,
  onDelete,
  onToggle,
}: {
  zone: PricingZone;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => Promise<void>;
}) {
  const [pending, start] = useTransition();

  function handleToggle() {
    start(async () => {
      await onToggle();
    });
  }

  return (
    <tr
      className={`transition-colors hover:bg-[color:var(--muted)]/30 ${pending ? "opacity-50" : ""}`}
    >
      <td className="px-4 py-3">
        <code className="rounded-md bg-[color:var(--muted)]/60 px-2 py-0.5 font-mono text-xs font-semibold text-[color:var(--foreground)]">
          {zone.code}
        </code>
      </td>
      <td className="px-4 py-3 text-sm text-[color:var(--foreground)]">{zone.name}</td>
      <td className="px-4 py-3">
        <Badge tone="info">
          {SERVICE_KEY_LABELS[zone.serviceKey as keyof typeof SERVICE_KEY_LABELS] ?? zone.serviceKey}
        </Badge>
      </td>
      <td className="px-4 py-3 text-sm text-[color:var(--muted-foreground)]">
        {ZONE_TYPE_LABELS[zone.type as ZoneType] ?? zone.type}
      </td>
      <td className="px-4 py-3">
        <Badge tone={zone.isActive ? "success" : "neutral"}>
          {zone.isActive ? "Active" : "Inactive"}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          {pending ? (
            <Spinner size="sm" />
          ) : (
            <>
              <button
                type="button"
                onClick={onEdit}
                className="rounded-lg p-1.5 text-[color:var(--muted-foreground)] transition-colors hover:bg-[color:var(--muted)] hover:text-[color:var(--foreground)]"
                title="Modifier"
              >
                <Pencil className="size-4" />
              </button>
              <button
                type="button"
                onClick={handleToggle}
                className="rounded-lg px-2 py-1 text-xs font-medium text-[color:var(--muted-foreground)] transition-colors hover:bg-[color:var(--muted)] hover:text-[color:var(--foreground)]"
              >
                {zone.isActive ? "Désactiver" : "Activer"}
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="rounded-lg p-1.5 text-[color:var(--muted-foreground)] transition-colors hover:bg-[color:var(--muted)] hover:text-[color:var(--danger)]"
                title="Supprimer"
              >
                <Trash2 className="size-4" />
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Zone Modal ────────────────────────────────────────────────────────────────

function PricingZoneModal({
  open,
  zone,
  onClose,
}: {
  open: boolean;
  zone: PricingZone | null;
  onClose: () => void;
}) {
  const isEdit = !!zone;
  const [form, setForm] = useState<CreatePricingZoneInput>({
    serviceKey: "RIDE",
    code: "",
    name: "",
    type: "CITY",
  });
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open) return;
    if (zone) {
      setForm({ serviceKey: zone.serviceKey, code: zone.code, name: zone.name, type: zone.type });
    } else {
      setForm({ serviceKey: "RIDE", code: "", name: "", type: "CITY" });
    }
  }, [open, zone]);

  function submit() {
    if (!form.code.trim() || !form.name.trim()) {
      toast({ kind: "error", title: "Champs requis", description: "Code et nom sont obligatoires." });
      return;
    }
    start(async () => {
      if (isEdit && zone) {
        const patch: PatchPricingZoneInput = { name: form.name, type: form.type };
        const r = await updatePricingZoneAction(zone.zoneId, patch);
        if (r.ok) {
          toast({ kind: "success", title: "Zone mise à jour" });
          onClose();
        } else {
          toast({ kind: "error", title: "Erreur", description: r.message });
        }
      } else {
        const r = await createPricingZoneAction(form);
        if (r.ok) {
          toast({ kind: "success", title: "Zone créée" });
          onClose();
        } else {
          toast({ kind: "error", title: "Erreur", description: r.message });
        }
      }
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={isEdit ? "Modifier la zone" : "Créer une zone de tarification"}
      description={
        isEdit
          ? "Le code est immuable après création."
          : "Le code sera automatiquement mis en majuscules et ne pourra plus être modifié."
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Annuler
          </Button>
          <Button onClick={submit} isLoading={pending}>
            {isEdit ? "Enregistrer" : "Créer la zone"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Select
          label="Service *"
          id="zone-service"
          options={SERVICE_KEY_OPTIONS}
          value={form.serviceKey}
          onChange={(e) => setForm((f) => ({ ...f, serviceKey: e.target.value }))}
          disabled={isEdit}
        />
        <Input
          label="Code *"
          value={form.code}
          onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
          placeholder="COTONOU_CENTRE"
          hint="Majuscules uniquement — immuable après création"
          disabled={isEdit}
          required
        />
        <Input
          label="Nom *"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Cotonou Centre"
          required
        />
        <Select
          label="Type *"
          id="zone-type"
          options={ZONE_TYPE_OPTIONS}
          value={form.type}
          onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as ZoneType }))}
        />
      </div>
    </Modal>
  );
}
