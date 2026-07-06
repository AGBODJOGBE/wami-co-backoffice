"use client";

import { useEffect, useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Modal } from "@/shared/ui/modal";
import { Select } from "@/shared/ui/select";
import { Spinner } from "@/shared/ui/spinner";
import { toast } from "@/shared/ui/toast";
import {
  createPricingProfileAction,
  updatePricingProfileAction,
  type ActionResult,
} from "../application/pricing-profiles-actions";
import {
  COMPONENT_TYPE_LABELS,
  COMPONENT_TYPE_OPTIONS,
  SERVICE_KEY_OPTIONS,
  STRATEGY_OPTIONS,
  defaultComponent,
  type CreatePricingProfileInput,
  type KmTier,
  type PricingComponent,
  type PricingComponentType,
  type PricingProfile,
  type TimedPackageOption,
  type ZoneRate,
} from "../domain/pricing-profile";

// ─── Form helpers ──────────────────────────────────────────────────────────────

function templateToForm(t: CreatePricingProfileInput): CreatePricingProfileInput {
  return { ...t, components: t.components.map((c) => ({ ...c })) };
}

function notify(result: ActionResult<unknown>, successTitle: string) {
  if (result.ok) toast({ kind: "success", title: successTitle, description: result.message });
  else           toast({ kind: "error",   title: "Échec",       description: result.message });
}

function defaultForm(): CreatePricingProfileInput {
  return {
    serviceKey:     "RIDE",
    vehicleType:    null,
    name:           "",
    description:    null,
    strategy:       "PER_KM",
    components:     [],
    commissionRate:  0.2,
    driverShareRate: 0.8,
    noShowMinutes:   5,
    noShowFee:       0,
  };
}

function profileToForm(p: PricingProfile): CreatePricingProfileInput {
  return {
    serviceKey:      p.serviceKey,
    vehicleType:     p.vehicleType,
    name:            p.name,
    description:     p.description,
    strategy:        p.strategy,
    components:      p.components ?? [],
    commissionRate:  p.commissionRate,
    driverShareRate: p.driverShareRate,
    noShowMinutes:   p.noShowMinutes ?? 5,
    noShowFee:       p.noShowFee    ?? 0,
  };
}

// ─── Props ─────────────────────────────────────────────────────────────────────

export interface PricingProfileModalProps {
  open:      boolean;
  profile:   PricingProfile | null;
  copyFrom?: PricingProfile | null;
  template?: CreatePricingProfileInput | null;
  onClose:   () => void;
}

// ─── Modal ─────────────────────────────────────────────────────────────────────

export function PricingProfileModal({
  open, profile, copyFrom, template, onClose,
}: PricingProfileModalProps) {
  const [form, setForm] = useState<CreatePricingProfileInput>(defaultForm());
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open) return;
    if (profile)        setForm(profileToForm(profile));
    else if (copyFrom)  setForm(profileToForm(copyFrom));
    else if (template)  setForm(templateToForm(template));
    else                setForm(defaultForm());
  }, [open, profile, copyFrom, template]);

  function set<K extends keyof CreatePricingProfileInput>(k: K, v: CreatePricingProfileInput[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function setCommission(value: number) {
    const c = Math.min(1, Math.max(0, value));
    setForm((f) => ({ ...f, commissionRate: c, driverShareRate: +(1 - c).toFixed(4) }));
  }

  // ─── Component helpers ──────────────────────────────────────────────────────

  function addComponent() {
    set("components", [...form.components, defaultComponent()]);
  }

  function removeComponent(i: number) {
    set("components", form.components.filter((_, idx) => idx !== i));
  }

  function updateComponent(i: number, patch: Partial<PricingComponent>) {
    const next = [...form.components];
    next[i] = { ...next[i], ...patch };
    set("components", next);
  }

  function changeComponentType(i: number, type: PricingComponentType) {
    updateComponent(i, {
      type,
      value: undefined, rate: undefined, rateFromContext: undefined,
      threshold: undefined, freeUnits: undefined, minimum: undefined,
      tiers: undefined, zones: undefined, packages: undefined,
      condition: undefined,
    });
  }

  // Tier helpers
  function addTier(ci: number) {
    const tiers: KmTier[] = [...(form.components[ci].tiers ?? []), { upTo: null, pricePerKm: 0 }];
    updateComponent(ci, { tiers });
  }
  function updateTier(ci: number, ti: number, patch: Partial<KmTier>) {
    const tiers = [...(form.components[ci].tiers ?? [])];
    tiers[ti] = { ...tiers[ti], ...patch };
    updateComponent(ci, { tiers });
  }
  function removeTier(ci: number, ti: number) {
    updateComponent(ci, { tiers: (form.components[ci].tiers ?? []).filter((_, i) => i !== ti) });
  }

  // Zone helpers
  function addZone(ci: number) {
    const zones: ZoneRate[] = [...(form.components[ci].zones ?? []), { from: "", to: null, price: 0 }];
    updateComponent(ci, { zones });
  }
  function updateZone(ci: number, zi: number, patch: Partial<ZoneRate>) {
    const zones = [...(form.components[ci].zones ?? [])];
    zones[zi] = { ...zones[zi], ...patch };
    updateComponent(ci, { zones });
  }
  function removeZone(ci: number, zi: number) {
    updateComponent(ci, { zones: (form.components[ci].zones ?? []).filter((_, i) => i !== zi) });
  }

  // Package helpers (TIMED_PACKAGE)
  function addPackage(ci: number) {
    const packages: TimedPackageOption[] = [
      ...(form.components[ci].packages ?? []),
      { durationMinutes: 30, price: 0, includedKm: 0, extraKmRate: 0 },
    ];
    updateComponent(ci, { packages });
  }
  function updatePackage(ci: number, pi: number, patch: Partial<TimedPackageOption>) {
    const packages = [...(form.components[ci].packages ?? [])];
    packages[pi] = { ...packages[pi], ...patch };
    updateComponent(ci, { packages });
  }
  function removePackage(ci: number, pi: number) {
    updateComponent(ci, { packages: (form.components[ci].packages ?? []).filter((_, i) => i !== pi) });
  }

  // ─── Submit ─────────────────────────────────────────────────────────────────

  function submit() {
    if (!form.name.trim()) {
      toast({ kind: "error", title: "Nom requis", description: "Donnez un nom au profil." });
      return;
    }
    const sum = form.commissionRate + form.driverShareRate;
    if (Math.abs(sum - 1) > 0.001) {
      toast({
        kind: "error",
        title: "Taux invalides",
        description: `commissionRate + driverShareRate doit être = 1 (actuellement ${sum.toFixed(4)}).`,
      });
      return;
    }
    start(async () => {
      const r = profile
        ? await updatePricingProfileAction(profile.profileId, form)
        : await createPricingProfileAction(form);
      notify(r, profile ? "Profil mis à jour" : "Profil créé");
      if (r.ok) onClose();
    });
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={
        profile   ? "Modifier le profil"
        : copyFrom ? "Nouvelle version du profil"
        : "Créer un profil"
      }
      description={
        profile   ? "Modifiez les composantes du profil inactif."
        : copyFrom ? `Copie de "${copyFrom.name}" — une nouvelle version sera créée.`
        : template ? `Profil pré-rempli depuis le template ${template.vehicleType ?? template.serviceKey}.`
        : "Définissez la stratégie de tarification et ses composantes."
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>Annuler</Button>
          <Button onClick={submit} isLoading={pending}>
            {pending ? "Enregistrement…" : profile ? "Enregistrer" : "Créer le profil"}
          </Button>
        </>
      }
    >
      <div className="relative flex flex-col gap-5">
        {pending && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-[color:var(--background)]/70 backdrop-blur-sm">
            <Spinner size="lg" label="Enregistrement…" />
          </div>
        )}

        <fieldset disabled={pending} className="flex flex-col gap-5">
          {/* ── Basic info ─────────────────────────────────────────────────── */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Service *"
              id="pp-service-key"
              options={SERVICE_KEY_OPTIONS}
              value={form.serviceKey}
              onChange={(e) => set("serviceKey", e.target.value as CreatePricingProfileInput["serviceKey"])}
            />
            <Select
              label="Stratégie *"
              id="pp-strategy"
              options={STRATEGY_OPTIONS}
              value={form.strategy}
              onChange={(e) => set("strategy", e.target.value as CreatePricingProfileInput["strategy"])}
            />
            <Input
              label="Nom *"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Tarif standard VTC Cotonou"
              required
            />
            <Input
              label="Type de véhicule"
              value={form.vehicleType ?? ""}
              onChange={(e) => set("vehicleType", e.target.value.trim() || null)}
              placeholder="STANDARD, PREMIUM…"
              hint="Laisser vide pour tous les types"
            />
          </div>

          <Input
            label="Description"
            value={form.description ?? ""}
            onChange={(e) => set("description", e.target.value.trim() || null)}
            placeholder="Description optionnelle du profil"
          />

          {/* ── Rates ──────────────────────────────────────────────────────── */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Taux de commission (0 → 1) *"
              type="number" step="0.01" min={0} max={1}
              value={form.commissionRate}
              onChange={(e) => setCommission(Number(e.target.value))}
              hint={`Plateforme : ${(form.commissionRate * 100).toFixed(1)} %`}
              required
            />
            <Input
              label="Part chauffeur (0 → 1) *"
              type="number" step="0.01" min={0} max={1}
              value={form.driverShareRate}
              onChange={(e) => set("driverShareRate", Math.min(1, Math.max(0, Number(e.target.value))))}
              hint={`Chauffeur : ${(form.driverShareRate * 100).toFixed(1)} % — somme = ${(form.commissionRate + form.driverShareRate).toFixed(4)}`}
              required
            />
          </div>

          {/* ── No-show ────────────────────────────────────────────────────── */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Délai no-show (minutes) *"
              type="number" step="1" min={1}
              value={form.noShowMinutes}
              onChange={(e) => set("noShowMinutes", Math.max(1, Number(e.target.value)))}
              hint="Délai avant facturation du no-show"
              required
            />
            <Input
              label="Frais no-show (FCFA centimes) *"
              type="number" step="1" min={0}
              value={form.noShowFee}
              onChange={(e) => set("noShowFee", Math.max(0, Number(e.target.value)))}
              hint={`${(form.noShowFee / 100).toFixed(0)} FCFA — 0 = pas de frais`}
              required
            />
          </div>

          {/* ── Components ─────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[color:var(--foreground)]">
                Composantes ({form.components.length})
              </span>
              <Button variant="outline" size="sm" onClick={addComponent}>
                <Plus className="size-4" />
                Ajouter composante
              </Button>
            </div>

            {form.components.length === 0 ? (
              <p className="text-xs italic text-[color:var(--muted-foreground)]">
                Aucune composante — ajoutez des éléments de tarification.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {form.components.map((comp, i) => (
                  <ComponentEditor
                    key={i}
                    index={i}
                    comp={comp}
                    onTypeChange={(t) => changeComponentType(i, t)}
                    onUpdate={(patch) => updateComponent(i, patch)}
                    onRemove={() => removeComponent(i)}
                    onAddTier={() => addTier(i)}
                    onUpdateTier={(ti, p) => updateTier(i, ti, p)}
                    onRemoveTier={(ti) => removeTier(i, ti)}
                    onAddZone={() => addZone(i)}
                    onUpdateZone={(zi, p) => updateZone(i, zi, p)}
                    onRemoveZone={(zi) => removeZone(i, zi)}
                    onAddPackage={() => addPackage(i)}
                    onUpdatePackage={(pi, p) => updatePackage(i, pi, p)}
                    onRemovePackage={(pi) => removePackage(i, pi)}
                  />
                ))}
              </ul>
            )}
          </div>
        </fieldset>
      </div>
    </Modal>
  );
}

// ─── ComponentEditor ──────────────────────────────────────────────────────────

interface ComponentEditorProps {
  index: number;
  comp: PricingComponent;
  onTypeChange: (t: PricingComponentType) => void;
  onUpdate: (patch: Partial<PricingComponent>) => void;
  onRemove: () => void;
  onAddTier: () => void;
  onUpdateTier: (ti: number, patch: Partial<KmTier>) => void;
  onRemoveTier: (ti: number) => void;
  onAddZone: () => void;
  onUpdateZone: (zi: number, patch: Partial<ZoneRate>) => void;
  onRemoveZone: (zi: number) => void;
  onAddPackage: () => void;
  onUpdatePackage: (pi: number, patch: Partial<TimedPackageOption>) => void;
  onRemovePackage: (pi: number) => void;
}

const CONDITION_OPERATOR_OPTIONS = [
  { value: "eq",  label: "= (égal)"         },
  { value: "gt",  label: "> (supérieur)"     },
  { value: "lt",  label: "< (inférieur)"     },
  { value: "gte", label: "≥ (sup. ou égal)"  },
  { value: "lte", label: "≤ (inf. ou égal)"  },
];

function ComponentEditor({
  index, comp, onTypeChange, onUpdate, onRemove,
  onAddTier, onUpdateTier, onRemoveTier,
  onAddZone, onUpdateZone, onRemoveZone,
  onAddPackage, onUpdatePackage, onRemovePackage,
}: ComponentEditorProps) {
  const typeLabel = COMPONENT_TYPE_LABELS[comp.type];

  const hasValue        = ["FLAT_FEE", "MINIMUM_FARE", "PER_MINUTE", "PER_UNIT", "FIXED_SURCHARGE"].includes(comp.type);
  const hasRate         = ["MULTIPLIER", "PERCENTAGE_FEE", "COD_FEE", "INSURANCE_FEE"].includes(comp.type);
  const hasMinimum      = comp.type === "COD_FEE" || comp.type === "INSURANCE_FEE";
  const hasRateFromCtx  = comp.type === "MULTIPLIER";
  const hasTiers        = comp.type === "PER_KM_TIER";
  const hasZones        = comp.type === "PER_ZONE" || comp.type === "DISTANCE_ZONE";
  const hasKgFields     = comp.type === "PER_KG";
  const hasWaitingFields = comp.type === "WAITING_FEE";
  const hasPackages     = comp.type === "TIMED_PACKAGE";
  const isZoneMatrix    = comp.type === "ZONE_MATRIX_PRICE";
  const hasCondition    = comp.type === "MULTIPLIER" || comp.type === "PERCENTAGE_FEE";

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] p-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-[color:var(--muted-foreground)]">
          #{index + 1} — {typeLabel}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-md p-1.5 text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)] hover:text-[color:var(--danger)]"
          aria-label="Supprimer la composante"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      {/* Type + key + label */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Select
          label="Type *"
          id={`comp-type-${index}`}
          options={COMPONENT_TYPE_OPTIONS}
          value={comp.type}
          onChange={(e) => onTypeChange(e.target.value as PricingComponentType)}
        />
        <Input
          label="Clé *"
          value={comp.key}
          onChange={(e) => onUpdate({ key: e.target.value })}
          placeholder="base_fare"
          required
        />
        <Input
          label="Libellé *"
          value={comp.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder="Frais de base"
          required
        />
      </div>

      {/* ── Simple value ───────────────────────────────────────────────────── */}
      {hasValue && (
        <Input
          label="Valeur (FCFA centimes) *"
          type="number" step="1" min={0}
          value={comp.value ?? 0}
          onChange={(e) => onUpdate({ value: Number(e.target.value) })}
          hint={comp.type === "FLAT_FEE" ? "Montant fixe en centimes" : undefined}
        />
      )}

      {/* ── Rate (MULTIPLIER, PERCENTAGE_FEE, COD_FEE, INSURANCE_FEE) ──── */}
      {hasRate && (
        <div className={`grid gap-3 ${hasMinimum ? "sm:grid-cols-2" : ""}`}>
          <Input
            label={
              comp.type === "MULTIPLIER"     ? "Coefficient *"
              : comp.type === "PERCENTAGE_FEE" ? "Taux (0→1) *"
              : "Taux *"
            }
            type="number" step="0.001" min={0}
            value={comp.rate ?? 0}
            onChange={(e) => onUpdate({ rate: Number(e.target.value) })}
            hint={
              comp.type === "PERCENTAGE_FEE" ? `${((comp.rate ?? 0) * 100).toFixed(1)} %`
              : comp.type === "COD_FEE" || comp.type === "INSURANCE_FEE"
                ? `${((comp.rate ?? 0) * 100).toFixed(1)} % de la valeur déclarée`
              : undefined
            }
          />
          {hasMinimum && (
            <Input
              label="Minimum garanti (centimes)"
              type="number" step="1" min={0}
              value={comp.minimum ?? 0}
              onChange={(e) => onUpdate({ minimum: Number(e.target.value) })}
              hint="Frais minimum en centimes FCFA"
            />
          )}
        </div>
      )}

      {/* ── rateFromContext (MULTIPLIER uniquement) ───────────────────────── */}
      {hasRateFromCtx && (
        <Input
          label="Clé de contexte (rateFromContext)"
          value={comp.rateFromContext ?? ""}
          onChange={(e) => onUpdate({ rateFromContext: e.target.value.trim() || undefined })}
          placeholder="surgeMultiplier"
          hint="Si renseignée, le coefficient est lu depuis le contexte d'appel — ignore le champ Coefficient ci-dessus"
        />
      )}

      {/* ── Kg fields ──────────────────────────────────────────────────────── */}
      {hasKgFields && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Tarif par kg (centimes) *"
            type="number" step="1" min={0}
            value={comp.value ?? 0}
            onChange={(e) => onUpdate({ value: Number(e.target.value) })}
          />
          <Input
            label="Seuil gratuit (kg)"
            type="number" step="0.1" min={0}
            value={comp.threshold ?? 0}
            onChange={(e) => onUpdate({ threshold: Number(e.target.value) })}
            hint="Kg inclus avant facturation"
          />
        </div>
      )}

      {/* ── Waiting fields ─────────────────────────────────────────────────── */}
      {hasWaitingFields && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Taux (centimes/min) *"
            type="number" step="1" min={0}
            value={comp.value ?? 0}
            onChange={(e) => onUpdate({ value: Number(e.target.value) })}
          />
          <Input
            label="Minutes gratuites"
            type="number" step="1" min={0}
            value={comp.freeUnits ?? 0}
            onChange={(e) => onUpdate({ freeUnits: Number(e.target.value) })}
            hint="Minutes d'attente incluses avant facturation"
          />
        </div>
      )}

      {/* ── ZONE_MATRIX_PRICE info ─────────────────────────────────────────── */}
      {isZoneMatrix && (
        <p className="rounded-md bg-[color:var(--muted)] px-3 py-2 text-xs text-[color:var(--muted-foreground)]">
          Ce composant retourne directement <code className="font-mono">context.zonePriceFcfa</code> — aucun paramètre supplémentaire requis.
        </p>
      )}

      {/* ── KM tiers ───────────────────────────────────────────────────────── */}
      {hasTiers && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[color:var(--foreground)]">Paliers km</span>
            <Button variant="outline" size="sm" onClick={onAddTier}>
              <Plus className="size-3" /> Palier
            </Button>
          </div>
          {(comp.tiers ?? []).length === 0 ? (
            <p className="text-xs italic text-[color:var(--muted-foreground)]">Aucun palier.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {(comp.tiers ?? []).map((tier, ti) => (
                <li key={ti} className="flex items-center gap-2 rounded border border-[color:var(--border)] bg-[color:var(--muted)]/30 p-2">
                  <Input
                    label={ti === 0 ? "Jusqu'à (km)" : ""}
                    type="number" step="0.1" min={0}
                    value={tier.upTo ?? ""}
                    onChange={(e) => onUpdateTier(ti, { upTo: e.target.value === "" ? null : Number(e.target.value) })}
                    placeholder="∞"
                    className="w-24"
                  />
                  <Input
                    label={ti === 0 ? "Prix/km (centimes)" : ""}
                    type="number" step="1" min={0}
                    value={tier.pricePerKm ?? 0}
                    onChange={(e) => onUpdateTier(ti, { pricePerKm: Number(e.target.value) })}
                    className="w-28"
                  />
                  <button
                    type="button"
                    onClick={() => onRemoveTier(ti)}
                    className="mt-auto rounded-md p-1.5 text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)] hover:text-[color:var(--danger)]"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── Zones (PER_ZONE / DISTANCE_ZONE) ──────────────────────────────── */}
      {hasZones && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[color:var(--foreground)]">Zones</span>
            <Button variant="outline" size="sm" onClick={onAddZone}>
              <Plus className="size-3" /> Zone
            </Button>
          </div>
          {(comp.zones ?? []).length === 0 ? (
            <p className="text-xs italic text-[color:var(--muted-foreground)]">Aucune zone.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {(comp.zones ?? []).map((zone, zi) => (
                <li key={zi} className="flex flex-wrap items-end gap-2 rounded border border-[color:var(--border)] bg-[color:var(--muted)]/30 p-2">
                  <Input
                    label={zi === 0 ? (comp.type === "DISTANCE_ZONE" ? "De (km)" : "Code zone De *") : ""}
                    value={zone.from ?? ""}
                    onChange={(e) => onUpdateZone(zi, { from: e.target.value })}
                    placeholder={comp.type === "DISTANCE_ZONE" ? "0" : "Zone A"}
                    className="w-24"
                  />
                  <Input
                    label={zi === 0 ? (comp.type === "DISTANCE_ZONE" ? "À (km, opt.)" : "Code zone À") : ""}
                    value={zone.to ?? ""}
                    onChange={(e) => onUpdateZone(zi, { to: e.target.value.trim() || null })}
                    placeholder={comp.type === "DISTANCE_ZONE" ? "20" : "Zone B (opt.)"}
                    className="w-24"
                  />
                  <Input
                    label={zi === 0 ? "Prix (centimes)" : ""}
                    type="number" step="1" min={0}
                    value={zone.price ?? 0}
                    onChange={(e) => onUpdateZone(zi, { price: Number(e.target.value) })}
                    className="w-24"
                  />
                  {comp.type === "DISTANCE_ZONE" && (
                    <Input
                      label={zi === 0 ? "+/km au-delà" : ""}
                      type="number" step="1" min={0}
                      value={zone.perKmBeyond ?? ""}
                      onChange={(e) =>
                        onUpdateZone(zi, { perKmBeyond: e.target.value === "" ? undefined : Number(e.target.value) })
                      }
                      placeholder="opt."
                      className="w-24"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => onRemoveZone(zi)}
                    className="rounded-md p-1.5 text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)] hover:text-[color:var(--danger)]"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── TIMED_PACKAGE packages ─────────────────────────────────────────── */}
      {hasPackages && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[color:var(--foreground)]">Forfaits</span>
            <Button variant="outline" size="sm" onClick={onAddPackage}>
              <Plus className="size-3" /> Forfait
            </Button>
          </div>
          {(comp.packages ?? []).length === 0 ? (
            <p className="text-xs italic text-[color:var(--muted-foreground)]">Aucun forfait.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {(comp.packages ?? []).map((pkg, pi) => (
                <li key={pi} className="grid grid-cols-2 gap-2 rounded border border-[color:var(--border)] bg-[color:var(--muted)]/30 p-3 sm:grid-cols-4">
                  <Input
                    label="Durée (min) *"
                    type="number" step="1" min={1}
                    value={pkg.durationMinutes}
                    onChange={(e) => onUpdatePackage(pi, { durationMinutes: Number(e.target.value) })}
                  />
                  <Input
                    label="Prix (centimes) *"
                    type="number" step="1" min={0}
                    value={pkg.price}
                    onChange={(e) => onUpdatePackage(pi, { price: Number(e.target.value) })}
                  />
                  <Input
                    label="Km inclus"
                    type="number" step="0.1" min={0}
                    value={pkg.includedKm}
                    onChange={(e) => onUpdatePackage(pi, { includedKm: Number(e.target.value) })}
                  />
                  <div className="flex items-end gap-2">
                    <Input
                      label="Extra km (centimes/km)"
                      type="number" step="1" min={0}
                      value={pkg.extraKmRate}
                      onChange={(e) => onUpdatePackage(pi, { extraKmRate: Number(e.target.value) })}
                      className="flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => onRemovePackage(pi)}
                      className="mb-0.5 rounded-md p-1.5 text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)] hover:text-[color:var(--danger)]"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── Condition (MULTIPLIER / PERCENTAGE_FEE) ───────────────────────── */}
      {hasCondition && (
        <div className="flex flex-col gap-2 rounded-md border border-dashed border-[color:var(--border)] p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[color:var(--foreground)]">
              Condition d&apos;activation
              <span className="ml-1.5 text-[color:var(--muted-foreground)]">(optionnelle)</span>
            </span>
            {comp.condition ? (
              <button
                type="button"
                onClick={() => onUpdate({ condition: undefined })}
                className="text-xs text-[color:var(--danger)] hover:underline"
              >
                Retirer
              </button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onUpdate({ condition: { field: "isSurge", operator: "eq", value: true } })}
              >
                <Plus className="size-3" /> Ajouter condition
              </Button>
            )}
          </div>

          {comp.condition && (
            <div className="grid gap-2 sm:grid-cols-3">
              <Input
                label="Champ de contexte"
                value={comp.condition.field}
                onChange={(e) => onUpdate({ condition: { ...comp.condition!, field: e.target.value } })}
                placeholder="isSurge, isNight…"
              />
              <Select
                label="Opérateur"
                id={`cond-op-${index}`}
                options={CONDITION_OPERATOR_OPTIONS}
                value={comp.condition.operator}
                onChange={(e) =>
                  onUpdate({
                    condition: { ...comp.condition!, operator: e.target.value as typeof comp.condition.operator },
                  })
                }
              />
              <Input
                label="Valeur"
                value={String(comp.condition.value ?? "")}
                onChange={(e) => {
                  const raw = e.target.value;
                  const val = raw === "true" ? true : raw === "false" ? false : isNaN(Number(raw)) ? raw : Number(raw);
                  onUpdate({ condition: { ...comp.condition!, value: val } });
                }}
                placeholder='true, false, "EXPRESS"…'
              />
            </div>
          )}
        </div>
      )}
    </li>
  );
}
