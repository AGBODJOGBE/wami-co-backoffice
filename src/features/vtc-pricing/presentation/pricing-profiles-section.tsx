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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
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
  STRATEGY_LABELS,
  type PricingProfile,
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

export function PricingProfilesSection({
  profiles,
  error,
}: PricingProfilesSectionProps) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();

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

  const sorted = [...profiles].sort((a, b) =>
    a.name.localeCompare(b.name, "fr"),
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers className="size-5 text-[color:var(--secondary)]" />
            <CardTitle>
              Profils de tarification ({profiles.length})
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
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
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              Nouveau profil
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {error ? (
          <p className="text-sm text-[color:var(--danger)]">{error}</p>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <AlertTriangle className="size-8 text-[color:var(--muted-foreground)]" />
            <p className="text-sm text-[color:var(--muted-foreground)]">
              Aucun profil de tarification.
            </p>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              Créer le premier profil
            </Button>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {sorted.map((profile) => (
              <ProfileRow
                key={profile.profileId}
                profile={profile}
                onEdit={() => setEditTarget(profile)}
                onDelete={() => setDeleteTarget(profile)}
                onActivate={() =>
                  setActionTarget({ profile, kind: "activate" })
                }
                onDeactivate={() =>
                  setActionTarget({ profile, kind: "deactivate" })
                }
              />
            ))}
          </ul>
        )}
      </CardContent>

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
        confirmLabel={
          actionTarget?.kind === "activate" ? "Activer" : "Désactiver"
        }
        tone="primary"
        isLoading={toggling}
      />
    </Card>
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

function ProfileRow({
  profile,
  onEdit,
  onDelete,
  onActivate,
  onDeactivate,
}: ProfileRowProps) {
  const components = profile.components ?? [];
  const componentSummary = components
    .slice(0, 3)
    .map((c) => COMPONENT_TYPE_LABELS[c.type])
    .join(", ");
  const extraComponents =
    components.length > 3 ? ` +${components.length - 3}` : "";

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex flex-col gap-1.5">
        {/* Name + badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-[color:var(--foreground)]">
            {profile.name}
          </span>
          {profile.isActive ? (
            <Badge tone="success">Actif</Badge>
          ) : (
            <Badge tone="danger">Inactif</Badge>
          )}
          <Badge tone="info">
            {SERVICE_KEY_LABELS[profile.serviceKey]}
          </Badge>
          {profile.vehicleType ? (
            <Badge tone="neutral">{profile.vehicleType}</Badge>
          ) : null}
          <Badge tone="neutral">{STRATEGY_LABELS[profile.strategy]}</Badge>
          <Badge tone="neutral">v{profile.version}</Badge>
        </div>

        {/* Description */}
        {profile.description ? (
          <p className="text-xs text-[color:var(--muted-foreground)]">
            {profile.description}
          </p>
        ) : null}

        {/* Rates + components */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[color:var(--muted-foreground)]">
          <span>
            Commission : {(profile.commissionRate * 100).toFixed(1)} % —
            Chauffeur : {(profile.driverShareRate * 100).toFixed(1)} %
          </span>
          {components.length > 0 ? (
            <span>
              Composantes : {componentSummary}
              {extraComponents}
            </span>
          ) : (
            <span className="italic">Aucune composante</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-shrink-0 items-center gap-2">
        {profile.isActive ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onDeactivate}
          >
            <PowerOff className="size-4" />
            Désactiver
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={onActivate}
          >
            <Zap className="size-4" />
            Activer
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onEdit}
          disabled={profile.isActive}
          title={
            profile.isActive
              ? "Désactivez d'abord le profil pour le modifier"
              : undefined
          }
        >
          <Pencil className="size-4" />
          Modifier
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onDelete}
          disabled={profile.isActive}
          title={
            profile.isActive
              ? "Désactivez d'abord le profil pour le supprimer"
              : undefined
          }
        >
          <Trash2 className="size-4" />
          Supprimer
        </Button>
      </div>
    </li>
  );
}
