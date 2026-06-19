"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Car,
  Copy,
  Pencil,
  PowerOff,
  RefreshCw,
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
import { Combobox } from "@/shared/ui/combobox";
import { ConfirmModal } from "@/shared/ui/confirm-modal";
import { Spinner } from "@/shared/ui/spinner";
import { toast } from "@/shared/ui/toast";
import {
  activatePricingProfileAction,
  deactivatePricingProfileAction,
  type ActionResult,
} from "../application/pricing-profiles-actions";
import {
  COMPONENT_TYPE_LABELS,
  RIDE_VEHICLE_TEMPLATES,
  STRATEGY_LABELS,
  type CreatePricingProfileInput,
  type PricingComponent,
  type PricingProfile,
} from "../domain/pricing-profile";
import {
  RIDE_VEHICLE_LABELS,
  type RideVehicleType,
} from "../domain/ride-pricing";
import { PricingProfileModal } from "./pricing-profile-modal";

// ─── helpers ─────────────────────────────────────────────────────────────────

const VEHICLE_OPTIONS = (
  Object.keys(RIDE_VEHICLE_LABELS) as RideVehicleType[]
).map((v) => ({ value: v, label: RIDE_VEHICLE_LABELS[v] }));

function fmtFcfa(n: number) {
  return `${n.toLocaleString("fr-FR")} FCFA`;
}
function fmtPct(n: number) {
  return `${(n * 100).toFixed(1)} %`;
}
function notify(result: ActionResult<unknown>, successTitle: string) {
  if (result.ok) {
    toast({ kind: "success", title: successTitle, description: result.message });
  } else {
    toast({ kind: "error", title: "Échec", description: result.message });
  }
}

// ─── ComponentReadRow ─────────────────────────────────────────────────────────

function ComponentReadRow({ c }: { c: PricingComponent }) {
  return (
    <div className="rounded-md border border-[color:var(--border)] bg-[color:var(--muted)]/40 px-3 py-2 text-xs">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="font-medium text-[color:var(--foreground)]">{c.label}</span>
        <Badge tone="neutral">{COMPONENT_TYPE_LABELS[c.type]}</Badge>
      </div>

      {c.value !== undefined && (
        <p className="text-[color:var(--muted-foreground)]">
          Montant : <strong className="text-[color:var(--foreground)]">{fmtFcfa(c.value)}</strong>
        </p>
      )}
      {c.rate !== undefined && (
        <p className="text-[color:var(--muted-foreground)]">
          {c.type === "PERCENTAGE_FEE" ? "Taux" : "Multiplicateur"} :{" "}
          <strong className="text-[color:var(--foreground)]">
            {c.type === "PERCENTAGE_FEE" ? fmtPct(c.rate) : `×${c.rate}`}
          </strong>
          {c.condition && (
            <span className="ml-2 text-[color:var(--muted-foreground)]">
              (si {c.condition.field} {c.condition.operator} {String(c.condition.value)})
            </span>
          )}
        </p>
      )}

      {c.tiers && c.tiers.length > 0 && (
        <table className="mt-1 w-full">
          <thead>
            <tr className="text-[color:var(--muted-foreground)]">
              <th className="text-left font-normal">Tranche</th>
              <th className="text-right font-normal">Prix / km</th>
            </tr>
          </thead>
          <tbody>
            {c.tiers.map((t, i) => (
              <tr key={i}>
                <td className="text-[color:var(--foreground)]">
                  {i === 0 ? `0` : String(c.tiers![i - 1].upTo)} → {t.upTo ?? "∞"} km
                </td>
                <td className="text-right font-medium text-[color:var(--foreground)]">
                  {fmtFcfa(t.pricePerKm)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {c.zones && c.zones.length > 0 && (
        <table className="mt-1 w-full">
          <thead>
            <tr className="text-[color:var(--muted-foreground)]">
              <th className="text-left font-normal">Zone (km)</th>
              <th className="text-right font-normal">Prix</th>
            </tr>
          </thead>
          <tbody>
            {c.zones.map((z, i) => (
              <tr key={i}>
                <td className="text-[color:var(--foreground)]">
                  {z.from} → {z.to ?? "∞"} km
                </td>
                <td className="text-right font-medium text-[color:var(--foreground)]">
                  {fmtFcfa(z.price)}
                  {z.perKmBeyond ? ` + ${fmtFcfa(z.perKmBeyond)}/km` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {c.packages && c.packages.length > 0 && (
        <table className="mt-1 w-full">
          <thead>
            <tr className="text-[color:var(--muted-foreground)]">
              <th className="text-left font-normal">Durée</th>
              <th className="text-right font-normal">Prix</th>
              <th className="text-right font-normal">Km inclus</th>
              <th className="text-right font-normal">Km supp.</th>
            </tr>
          </thead>
          <tbody>
            {c.packages.map((p, i) => (
              <tr key={i}>
                <td className="text-[color:var(--foreground)]">{p.durationMinutes} min</td>
                <td className="text-right font-medium text-[color:var(--foreground)]">{fmtFcfa(p.price)}</td>
                <td className="text-right text-[color:var(--foreground)]">{p.includedKm} km</td>
                <td className="text-right text-[color:var(--foreground)]">{fmtFcfa(p.extraKmRate)}/km</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── ProfilePanel ─────────────────────────────────────────────────────────────

interface ProfilePanelProps {
  profile: PricingProfile;
  isActive: boolean;
  onEdit: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
}

function ProfilePanel({
  profile,
  isActive,
  onEdit,
  onActivate,
  onDeactivate,
}: ProfilePanelProps) {
  const components = profile.components ?? [];

  return (
    <div
      className={`flex flex-col gap-4 rounded-lg border p-4 ${
        isActive
          ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-900/10"
          : "border-[color:var(--border)] bg-[color:var(--background)]"
      }`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-[color:var(--foreground)]">
              {profile.name}
            </span>
            {isActive ? (
              <Badge tone="success">Actif</Badge>
            ) : (
              <Badge tone="neutral">Inactif</Badge>
            )}
            <Badge tone="neutral">{STRATEGY_LABELS[profile.strategy]}</Badge>
            <Badge tone="neutral">v{profile.version}</Badge>
          </div>
          {profile.description && (
            <p className="text-xs text-[color:var(--muted-foreground)]">
              {profile.description}
            </p>
          )}
          {profile.commissionRate != null && (
            <div className="flex gap-4 text-xs text-[color:var(--muted-foreground)]">
              <span>
                Commission :{" "}
                <strong className="text-[color:var(--foreground)]">
                  {fmtPct(profile.commissionRate)}
                </strong>
              </span>
              <span>
                Chauffeur :{" "}
                <strong className="text-[color:var(--foreground)]">
                  {fmtPct(profile.driverShareRate)}
                </strong>
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-shrink-0 items-center gap-2">
          {isActive ? (
            <Button variant="outline" size="sm" onClick={onDeactivate}>
              <PowerOff className="size-4" />
              Désactiver
            </Button>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Pencil className="size-4" />
                Modifier
              </Button>
              <Button variant="outline" size="sm" onClick={onActivate}>
                <Zap className="size-4" />
                Activer
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Components */}
      {components.length === 0 ? (
        <p className="text-xs italic text-[color:var(--muted-foreground)]">
          Aucune composante tarifaire.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-[color:var(--muted-foreground)]">
            Composantes ({components.length})
          </p>
          {components.map((c, i) => (
            <ComponentReadRow key={`${c.key}-${i}`} c={c} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── RidePricingProfileEditor ─────────────────────────────────────────────────

export interface RidePricingProfileEditorProps {
  profiles: PricingProfile[];
  error?: string;
}

export function RidePricingProfileEditor({
  profiles,
  error,
}: RidePricingProfileEditorProps) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [selectedVehicle, setSelectedVehicle] =
    useState<RideVehicleType>("MOTO");

  // Modal states
  const [editTarget, setEditTarget] = useState<PricingProfile | null>(null);
  const [copySource, setCopySource] = useState<PricingProfile | null>(null);
  const [createTemplate, setCreateTemplate] =
    useState<CreatePricingProfileInput | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Activate / deactivate confirm
  const [toggleTarget, setToggleTarget] = useState<{
    profile: PricingProfile;
    kind: "activate" | "deactivate";
  } | null>(null);
  const [toggling, startToggle] = useTransition();

  function openEdit(profile: PricingProfile) {
    setEditTarget(profile);
    setCopySource(null);
    setModalOpen(true);
  }

  function openNewVersion(source: PricingProfile) {
    setEditTarget(null);
    setCopySource(source);
    setModalOpen(true);
  }

  function openCreate() {
    setEditTarget(null);
    setCopySource(null);
    setCreateTemplate(RIDE_VEHICLE_TEMPLATES[selectedVehicle] ?? null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditTarget(null);
    setCopySource(null);
    setCreateTemplate(null);
  }

  function runToggle() {
    if (!toggleTarget) return;
    const { profile, kind } = toggleTarget;
    startToggle(async () => {
      const r =
        kind === "activate"
          ? await activatePricingProfileAction(profile.profileId)
          : await deactivatePricingProfileAction(profile.profileId);
      notify(r, kind === "activate" ? "Profil activé" : "Profil désactivé");
      if (r.ok) setToggleTarget(null);
    });
  }

  // Filter RIDE profiles for the selected vehicle
  const vehicleProfiles = profiles.filter(
    (p) =>
      p.serviceKey === "RIDE" &&
      (p.vehicleType ?? "").toUpperCase() === selectedVehicle,
  );

  const activeProfile =
    vehicleProfiles.find((p) => p.isActive) ?? null;
  const inactiveProfiles = vehicleProfiles
    .filter((p) => !p.isActive)
    .sort((a, b) => b.version - a.version);

  return (
    <div className="flex flex-col gap-6">
      {/* Toolbar */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Car className="size-5 text-[color:var(--secondary)]" />
              <CardTitle>Grille tarifaire par véhicule</CardTitle>
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
                Nouveau profil
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Combobox
            label="Catégorie de véhicule"
            options={VEHICLE_OPTIONS}
            value={selectedVehicle}
            onChange={(v) => setSelectedVehicle(v as RideVehicleType)}
          />
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-md border border-[color:var(--danger)]/30 bg-[color:var(--danger)]/10 px-3 py-2 text-sm text-[color:var(--danger)]">
          {error}
        </div>
      )}

      {/* Active profile */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[color:var(--foreground)]">
            Tarif actif — {RIDE_VEHICLE_LABELS[selectedVehicle]}
          </h3>
          {activeProfile && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => openNewVersion(activeProfile)}
            >
              <Copy className="size-4" />
              Nouvelle version
            </Button>
          )}
        </div>

        {activeProfile ? (
          <ProfilePanel
            profile={activeProfile}
            isActive
            onEdit={() => openEdit(activeProfile)}
            onActivate={() =>
              setToggleTarget({ profile: activeProfile, kind: "activate" })
            }
            onDeactivate={() =>
              setToggleTarget({ profile: activeProfile, kind: "deactivate" })
            }
          />
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-[color:var(--border)] py-10 text-center">
            <AlertTriangle className="size-8 text-[color:var(--muted-foreground)]" />
            <p className="text-sm text-[color:var(--muted-foreground)]">
              Aucun tarif actif pour {RIDE_VEHICLE_LABELS[selectedVehicle]}.
            </p>
            <Button size="sm" onClick={openCreate}>
              Créer un tarif
            </Button>
          </div>
        )}
      </div>

      {/* Inactive versions */}
      {inactiveProfiles.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-[color:var(--foreground)]">
            Versions inactives ({inactiveProfiles.length})
          </h3>
          {inactiveProfiles.map((profile) => (
            <ProfilePanel
              key={profile.profileId}
              profile={profile}
              isActive={false}
              onEdit={() => openEdit(profile)}
              onActivate={() =>
                setToggleTarget({ profile, kind: "activate" })
              }
              onDeactivate={() =>
                setToggleTarget({ profile, kind: "deactivate" })
              }
            />
          ))}
        </div>
      )}

      {/* Create / Edit / Copy modal */}
      <PricingProfileModal
        open={modalOpen}
        profile={editTarget}
        copyFrom={copySource}
        template={createTemplate}
        onClose={closeModal}
      />

      {/* Activate / Deactivate confirm */}
      <ConfirmModal
        open={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        onConfirm={runToggle}
        title={
          toggleTarget?.kind === "activate"
            ? "Activer ce profil ?"
            : "Désactiver ce profil ?"
        }
        description={
          toggleTarget ? (
            <p>
              {toggleTarget.kind === "activate" ? (
                <>
                  <strong>{toggleTarget.profile.name}</strong> deviendra le
                  tarif actif pour {RIDE_VEHICLE_LABELS[selectedVehicle]}.
                  L&apos;ancien tarif actif sera automatiquement désactivé.
                </>
              ) : (
                <>
                  <strong>{toggleTarget.profile.name}</strong> sera désactivé.
                  Aucun tarif ne s&apos;appliquera jusqu&apos;à activation d&apos;un autre profil.
                </>
              )}
            </p>
          ) : null
        }
        confirmLabel={toggleTarget?.kind === "activate" ? "Activer" : "Désactiver"}
        tone="primary"
        isLoading={toggling}
      />
    </div>
  );
}
