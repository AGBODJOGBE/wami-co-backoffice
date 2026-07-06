"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Layers,
  Pencil,
  Plus,
  PowerOff,
  RefreshCw,
  Trash2,
  Zap,
} from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { ConfirmModal } from "@/shared/ui/confirm-modal";
import { Spinner } from "@/shared/ui/spinner";
import { toast } from "@/shared/ui/toast";
import {
  activatePricingProfileAction,
  deactivatePricingProfileAction,
  deletePricingProfileAction,
  type ActionResult,
} from "../application/pricing-profiles-actions";
import {
  COMPONENT_TYPE_LABELS,
  SERVICE_KEY_LABELS,
  SERVICE_KEY_OPTIONS,
  STRATEGY_LABELS,
  type PricingProfile,
  type ServiceKey,
} from "../domain/pricing-profile";
import { PricingProfileModal } from "./pricing-profile-modal";

function notify(result: ActionResult<unknown>, successTitle: string) {
  if (result.ok) {
    toast({ kind: "success", title: successTitle, description: result.message });
  } else {
    toast({ kind: "error", title: "Échec", description: result.message });
  }
}

export interface PricingProfilesSectionProps {
  profiles: PricingProfile[];
  error?: string;
}

const SERVICE_FILTERS = [
  { value: "ALL", label: "Tous" },
  ...SERVICE_KEY_OPTIONS,
];

export function PricingProfilesSection({ profiles, error }: PricingProfilesSectionProps) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [serviceFilter, setServiceFilter] = useState("ALL");

  // Modal states
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PricingProfile | null>(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<PricingProfile | null>(null);
  const [deleting, startDelete] = useTransition();

  // Activate / deactivate
  const [actionTarget, setActionTarget] = useState<{
    profile: PricingProfile;
    kind: "activate" | "deactivate";
  } | null>(null);
  const [toggling, startToggle] = useTransition();

  function runDelete() {
    if (!deleteTarget) return;
    startDelete(async () => {
      const r = await deletePricingProfileAction(deleteTarget.profileId);
      notify(r, "Profil supprimé");
      if (r.ok) setDeleteTarget(null);
    });
  }

  function runToggle() {
    if (!actionTarget) return;
    const { profile, kind } = actionTarget;
    startToggle(async () => {
      const r =
        kind === "activate"
          ? await activatePricingProfileAction(profile.profileId)
          : await deactivatePricingProfileAction(profile.profileId);
      notify(r, kind === "activate" ? "Profil activé" : "Profil désactivé");
      if (r.ok) setActionTarget(null);
    });
  }

  const activeCount = profiles.filter((p) => p.isActive).length;

  const sorted = [...profiles]
    .filter((p) => serviceFilter === "ALL" || p.serviceKey === serviceFilter)
    .sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      return a.name.localeCompare(b.name, "fr");
    });

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Layers className="size-5 text-[color:var(--primary)]" />
          <div>
            <h2 className="text-base font-semibold text-[color:var(--foreground)]">
              Profils de tarification
            </h2>
            <p className="text-xs text-[color:var(--muted-foreground)]">
              {activeCount} actif{activeCount !== 1 ? "s" : ""} sur {profiles.length} profil{profiles.length !== 1 ? "s" : ""}
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
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Nouveau profil
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-[color:var(--danger)]/30 bg-[color:var(--danger)]/10 px-4 py-3 text-sm text-[color:var(--danger)]">
          {error}
        </div>
      )}

      {/* Service filter chips */}
      <div className="flex flex-wrap items-center gap-2">
        {SERVICE_FILTERS.map(({ value, label }) => {
          const count =
            value === "ALL"
              ? profiles.length
              : profiles.filter((p) => p.serviceKey === value).length;
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

      {/* Profile list */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[color:var(--border)] py-12 text-center">
          <AlertTriangle className="size-8 text-[color:var(--muted-foreground)]" />
          <div>
            <p className="text-sm font-medium text-[color:var(--foreground)]">
              {serviceFilter === "ALL"
                ? "Aucun profil de tarification"
                : `Aucun profil pour ${SERVICE_KEY_LABELS[serviceFilter as ServiceKey] ?? serviceFilter}`}
            </p>
            <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
              Les profils définissent les règles tarifaires par service et catégorie de véhicule.
            </p>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Créer le premier profil
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((profile) => (
            <ProfileRow
              key={profile.profileId}
              profile={profile}
              onEdit={() => setEditTarget(profile)}
              onDelete={() => setDeleteTarget(profile)}
              onActivate={() => setActionTarget({ profile, kind: "activate" })}
              onDeactivate={() => setActionTarget({ profile, kind: "deactivate" })}
            />
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      <PricingProfileModal
        open={createOpen || !!editTarget}
        profile={editTarget}
        onClose={() => {
          setCreateOpen(false);
          setEditTarget(null);
        }}
      />

      {/* Delete confirm */}
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={runDelete}
        title="Supprimer ce profil ?"
        description={
          deleteTarget ? (
            <p>
              <strong>{deleteTarget.name}</strong> — version v
              {deleteTarget.version}. Cette action est irréversible.
            </p>
          ) : null
        }
        confirmLabel="Supprimer"
        tone="danger"
        isLoading={deleting}
      />

      {/* Activate / Deactivate confirm */}
      <ConfirmModal
        open={!!actionTarget}
        onClose={() => setActionTarget(null)}
        onConfirm={runToggle}
        title={
          actionTarget?.kind === "activate"
            ? "Activer ce profil ?"
            : "Désactiver ce profil ?"
        }
        description={
          actionTarget ? (
            <p>
              {actionTarget.kind === "activate" ? (
                <>
                  <strong>{actionTarget.profile.name}</strong> deviendra le
                  profil actif pour ce service/véhicule.
                </>
              ) : (
                <>
                  <strong>{actionTarget.profile.name}</strong> sera désactivé et
                  ne s&apos;appliquera plus aux nouvelles courses.
                </>
              )}
            </p>
          ) : null
        }
        confirmLabel={actionTarget?.kind === "activate" ? "Activer" : "Désactiver"}
        tone="primary"
        isLoading={toggling}
      />
    </div>
  );
}

// ─── ProfileRow ─────────────────────────────────────────────────────────────

interface ProfileRowProps {
  profile: PricingProfile;
  onEdit: () => void;
  onDelete: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
}

function ProfileRow({ profile, onEdit, onDelete, onActivate, onDeactivate }: ProfileRowProps) {
  const components = profile.components ?? [];
  const componentSummary = components
    .slice(0, 3)
    .map((c) => COMPONENT_TYPE_LABELS[c.type])
    .join(", ");
  const extraComponents = components.length > 3 ? ` +${components.length - 3}` : "";

  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        profile.isActive
          ? "border-[color:var(--primary)]/30 bg-[color:var(--muted)]/20"
          : "border-[color:var(--border)] bg-[color:var(--background)]"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        {/* Info */}
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            {profile.isActive && (
              <span className="inline-block size-2 rounded-full bg-[color:var(--primary)]" />
            )}
            <span className="text-sm font-semibold text-[color:var(--foreground)]">
              {profile.name}
            </span>
            {profile.isActive ? (
              <Badge tone="success">Actif</Badge>
            ) : (
              <Badge tone="neutral">Inactif</Badge>
            )}
            <Badge tone="info">{SERVICE_KEY_LABELS[profile.serviceKey]}</Badge>
            {profile.vehicleType && (
              <Badge tone="neutral">{profile.vehicleType}</Badge>
            )}
            <Badge tone="neutral">{STRATEGY_LABELS[profile.strategy]}</Badge>
            <Badge tone="neutral">v{profile.version}</Badge>
          </div>

          {profile.description && (
            <p className="text-xs text-[color:var(--muted-foreground)]">
              {profile.description}
            </p>
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[color:var(--muted-foreground)]">
            <span>
              Commission :{" "}
              <strong className="text-[color:var(--foreground)]">
                {(profile.commissionRate * 100).toFixed(1)} %
              </strong>{" "}
              — Chauffeur :{" "}
              <strong className="text-[color:var(--foreground)]">
                {(profile.driverShareRate * 100).toFixed(1)} %
              </strong>
            </span>
            {components.length > 0 ? (
              <span>
                {componentSummary}
                {extraComponents}
              </span>
            ) : (
              <span className="italic">Aucune composante</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
          {profile.isActive ? (
            <Button variant="outline" size="sm" onClick={onDeactivate}>
              <PowerOff className="size-4" />
              Désactiver
            </Button>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={onActivate}>
                <Zap className="size-4" />
                Activer
              </Button>
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Pencil className="size-4" />
                Modifier
              </Button>
              <button
                type="button"
                onClick={onDelete}
                className="rounded-lg p-2 text-[color:var(--muted-foreground)] transition-colors hover:bg-[color:var(--muted)] hover:text-[color:var(--danger)]"
                title="Supprimer"
              >
                <Trash2 className="size-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
