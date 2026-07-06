"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Car,
  Copy,
  Pencil,
  Plus,
  PowerOff,
  RefreshCw,
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

const VEHICLE_ORDER: RideVehicleType[] = [
  "MOTO", "TRICYCLE", "ECO", "STANDARD", "CONFORT", "VIP", "VAN",
];

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
    <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)]/30 px-3 py-2.5 text-xs">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="font-semibold text-[color:var(--foreground)]">{c.label}</span>
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
            <span className="ml-2 opacity-60">
              (si {c.condition.field} {c.condition.operator} {String(c.condition.value)})
            </span>
          )}
        </p>
      )}

      {c.tiers && c.tiers.length > 0 && (
        <table className="mt-2 w-full border-collapse text-[11px]">
          <thead>
            <tr className="text-[color:var(--muted-foreground)]">
              <th className="pb-1 text-left font-normal">Tranche</th>
              <th className="pb-1 text-right font-normal">Prix / km</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--border)]">
            {c.tiers.map((t, i) => (
              <tr key={i}>
                <td className="py-0.5 text-[color:var(--foreground)]">
                  {i === 0 ? "0" : String(c.tiers![i - 1].upTo)} → {t.upTo ?? "∞"} km
                </td>
                <td className="py-0.5 text-right font-semibold text-[color:var(--foreground)]">
                  {fmtFcfa(t.pricePerKm)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {c.zones && c.zones.length > 0 && (
        <table className="mt-2 w-full text-[11px]">
          <thead>
            <tr className="text-[color:var(--muted-foreground)]">
              <th className="pb-1 text-left font-normal">Zone (km)</th>
              <th className="pb-1 text-right font-normal">Prix</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--border)]">
            {c.zones.map((z, i) => (
              <tr key={i}>
                <td className="py-0.5 text-[color:var(--foreground)]">
                  {z.from} → {z.to ?? "∞"} km
                </td>
                <td className="py-0.5 text-right font-semibold text-[color:var(--foreground)]">
                  {fmtFcfa(z.price)}
                  {z.perKmBeyond ? ` + ${fmtFcfa(z.perKmBeyond)}/km` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {c.packages && c.packages.length > 0 && (
        <table className="mt-2 w-full text-[11px]">
          <thead>
            <tr className="text-[color:var(--muted-foreground)]">
              <th className="pb-1 text-left font-normal">Durée</th>
              <th className="pb-1 text-right font-normal">Prix</th>
              <th className="pb-1 text-right font-normal">Km inclus</th>
              <th className="pb-1 text-right font-normal">Km supp.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--border)]">
            {c.packages.map((p, i) => (
              <tr key={i}>
                <td className="py-0.5 text-[color:var(--foreground)]">{p.durationMinutes} min</td>
                <td className="py-0.5 text-right font-semibold text-[color:var(--foreground)]">{fmtFcfa(p.price)}</td>
                <td className="py-0.5 text-right text-[color:var(--foreground)]">{p.includedKm} km</td>
                <td className="py-0.5 text-right text-[color:var(--foreground)]">{fmtFcfa(p.extraKmRate)}/km</td>
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

function ProfilePanel({ profile, isActive, onEdit, onActivate, onDeactivate }: ProfilePanelProps) {
  const components = profile.components ?? [];

  return (
    <div
      className={`flex flex-col gap-4 rounded-xl border p-4 transition-colors ${
        isActive
          ? "border-[color:var(--primary)]/40 bg-[color:var(--muted)]/20"
          : "border-[color:var(--border)] bg-[color:var(--background)]"
      }`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            {isActive && (
              <span className="inline-block size-2 rounded-full bg-[color:var(--primary)]" />
            )}
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
            <p className="text-xs text-[color:var(--muted-foreground)]">{profile.description}</p>
          )}
          {profile.commissionRate != null && (
            <div className="flex flex-wrap gap-4 text-xs text-[color:var(--muted-foreground)]">
              <span>
                Commission :{" "}
                <strong className="text-[color:var(--foreground)]">
                  {fmtPct(profile.commissionRate)}
                </strong>
              </span>
              <span>
                Part chauffeur :{" "}
                <strong className="text-[color:var(--foreground)]">
                  {fmtPct(profile.driverShareRate)}
                </strong>
              </span>
              {profile.noShowFee > 0 && (
                <span>
                  No-show :{" "}
                  <strong className="text-[color:var(--foreground)]">
                    {fmtFcfa(profile.noShowFee)} après {profile.noShowMinutes} min
                  </strong>
                </span>
              )}
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
        <p className="text-xs italic text-[color:var(--muted-foreground)]">Aucune composante tarifaire.</p>
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

export function RidePricingProfileEditor({ profiles, error }: RidePricingProfileEditorProps) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [selectedVehicle, setSelectedVehicle] = useState<RideVehicleType>("MOTO");

  // Modal states
  const [editTarget, setEditTarget] = useState<PricingProfile | null>(null);
  const [copySource, setCopySource] = useState<PricingProfile | null>(null);
  const [createTemplate, setCreateTemplate] = useState<CreatePricingProfileInput | null>(null);
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

  // All RIDE profiles, selected vehicle profiles
  const allRideProfiles = profiles.filter((p) => p.serviceKey === "RIDE");
  const vehicleProfiles = allRideProfiles.filter(
    (p) => (p.vehicleType ?? "").toUpperCase() === selectedVehicle,
  );
  const activeProfile = vehicleProfiles.find((p) => p.isActive) ?? null;
  const inactiveProfiles = vehicleProfiles
    .filter((p) => !p.isActive)
    .sort((a, b) => b.version - a.version);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Car className="size-5 text-[color:var(--primary)]" />
          <h2 className="text-base font-semibold text-[color:var(--foreground)]">
            Grille tarifaire VTC
          </h2>
          <span className="text-sm text-[color:var(--muted-foreground)]">
            ({allRideProfiles.length} profil{allRideProfiles.length !== 1 ? "s" : ""})
          </span>
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
            Nouveau profil
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-[color:var(--danger)]/30 bg-[color:var(--danger)]/10 px-4 py-3 text-sm text-[color:var(--danger)]">
          {error}
        </div>
      )}

      {/* Vehicle selector + KPI stats */}
      <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--background)] p-4">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
          Catégorie de véhicule
        </p>
        <div className="flex flex-wrap gap-2">
          {VEHICLE_ORDER.map((v) => {
            const vProfiles = allRideProfiles.filter(
              (p) => (p.vehicleType ?? "").toUpperCase() === v,
            );
            const hasActive = vProfiles.some((p) => p.isActive);
            const isSelected = selectedVehicle === v;
            return (
              <button
                key={v}
                type="button"
                onClick={() => setSelectedVehicle(v)}
                className={`flex flex-shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                  isSelected
                    ? "bg-[color:var(--primary)] text-white shadow-sm"
                    : "border border-[color:var(--border)] bg-[color:var(--background)] text-[color:var(--foreground)] hover:bg-[color:var(--muted)]"
                }`}
              >
                {RIDE_VEHICLE_LABELS[v]}
                {!hasActive && (
                  <span className="inline-block size-1.5 flex-shrink-0 rounded-full bg-[color:var(--danger)]" />
                )}
              </button>
            );
          })}
        </div>

        {/* KPI mini-stats */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: "Statut",
              value: activeProfile ? "Actif" : "Aucun actif",
              alert: !activeProfile,
            },
            {
              label: "Commission",
              value: activeProfile ? fmtPct(activeProfile.commissionRate) : "—",
            },
            {
              label: "Part chauffeur",
              value: activeProfile ? fmtPct(activeProfile.driverShareRate) : "—",
            },
            { label: "Versions", value: String(vehicleProfiles.length) },
          ].map(({ label, value, alert }) => (
            <div
              key={label}
              className="rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)]/40 px-3 py-2.5"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
                {label}
              </p>
              <p
                className={`mt-0.5 text-sm font-bold ${
                  alert
                    ? "text-[color:var(--danger)]"
                    : "text-[color:var(--foreground)]"
                }`}
              >
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Active profile */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[color:var(--foreground)]">
            Tarif actif —{" "}
            <span className="text-[color:var(--primary)]">
              {RIDE_VEHICLE_LABELS[selectedVehicle]}
            </span>
          </h3>
          {activeProfile && (
            <Button variant="outline" size="sm" onClick={() => openNewVersion(activeProfile)}>
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
            onActivate={() => setToggleTarget({ profile: activeProfile, kind: "activate" })}
            onDeactivate={() => setToggleTarget({ profile: activeProfile, kind: "deactivate" })}
          />
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[color:var(--border)] py-12 text-center">
            <AlertTriangle className="size-8 text-[color:var(--muted-foreground)]" />
            <div>
              <p className="text-sm font-medium text-[color:var(--foreground)]">
                Aucun tarif actif
              </p>
              <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
                Aucun profil actif pour {RIDE_VEHICLE_LABELS[selectedVehicle]}.
              </p>
            </div>
            <Button size="sm" onClick={openCreate}>
              <Plus className="size-4" />
              Créer un tarif
            </Button>
          </div>
        )}
      </div>

      {/* Inactive versions */}
      {inactiveProfiles.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-[color:var(--muted-foreground)]">
            Versions archivées ({inactiveProfiles.length})
          </h3>
          {inactiveProfiles.map((profile) => (
            <ProfilePanel
              key={profile.profileId}
              profile={profile}
              isActive={false}
              onEdit={() => openEdit(profile)}
              onActivate={() => setToggleTarget({ profile, kind: "activate" })}
              onDeactivate={() => setToggleTarget({ profile, kind: "deactivate" })}
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
                  <strong>{toggleTarget.profile.name}</strong> deviendra le tarif
                  actif pour {RIDE_VEHICLE_LABELS[selectedVehicle]}. L&apos;ancien
                  tarif actif sera automatiquement désactivé.
                </>
              ) : (
                <>
                  <strong>{toggleTarget.profile.name}</strong> sera désactivé.
                  Aucun tarif ne s&apos;appliquera jusqu&apos;à activation
                  d&apos;un autre profil.
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
