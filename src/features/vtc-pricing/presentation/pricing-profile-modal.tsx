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
  type ZoneRate,
} from "../domain/pricing-profile";

function templateToForm(t: CreatePricingProfileInput): CreatePricingProfileInput {
  return { ...t, components: t.components.map((c) => ({ ...c })) };
}

function notify(result: ActionResult<unknown>, successTitle: string) {
  if (result.ok) {
    toast({ kind: "success", title: successTitle, description: result.message });
  } else {
    toast({ kind: "error", title: "Échec", description: result.message });
  }
}

function defaultForm(): CreatePricingProfileInput {
  return {
    serviceKey: "RIDE",
    vehicleType: null,
    name: "",
    description: null,
    strategy: "PER_KM",
    components: [],
    commissionRate: 0.2,
    driverShareRate: 0.8,
  };
}

function profileToForm(p: PricingProfile): CreatePricingProfileInput {
  return {
    serviceKey: p.serviceKey,
    vehicleType: p.vehicleType,
    name: p.name,
    description: p.description,
    strategy: p.strategy,
    components: p.components ?? [],
    commissionRate: p.commissionRate,
    driverShareRate: p.driverShareRate,
  };
}

export interface PricingProfileModalProps {
  open: boolean;
  /** Profil à éditer (mode edit). null = mode create. */
  profile: PricingProfile | null;
  /** En mode create, pré-remplit depuis ce profil source (mode "nouvelle version"). */
  copyFrom?: PricingProfile | null;
  /** En mode create, pré-remplit depuis un template statique (ex: template véhicule). */
  template?: CreatePricingProfileInput | null;
  onClose: () => void;
}

export function PricingProfileModal({
  open,
  profile,
  copyFrom,
  template,
  onClose,
}: PricingProfileModalProps) {
  const [form, setForm] = useState<CreatePricingProfileInput>(defaultForm());
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open) return;
    if (profile) setForm(profileToForm(profile));
    else if (copyFrom) setForm(profileToForm(copyFrom));
    else if (template) setForm(templateToForm(template));
    else setForm(defaultForm());
  }, [open, profile, copyFrom, template]);

  function set<K extends keyof CreatePricingProfileInput>(
    key: K,
    value: CreatePricingProfileInput[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setCommission(value: number) {
    const c = Math.min(1, Math.max(0, value));
    setForm((f) => ({ ...f, commissionRate: c, driverShareRate: +(1 - c).toFixed(4) }));
  }

  // ─── Component helpers ────────────────────────────────────────────────────

  function addComponent() {
    set("components", [...form.components, defaultComponent()]);
  }

  function removeComponent(i: number) {
    set(
      "components",
      form.components.filter((_, idx) => idx !== i),
    );
  }

  function updateComponent(i: number, patch: Partial<PricingComponent>) {
    const next = [...form.components];
    next[i] = { ...next[i], ...patch };
    set("components", next);
  }

  function changeComponentType(i: number, type: PricingComponentType) {
    // Reset type-specific fields when changing type
    updateComponent(i, {
      type,
      value: undefined,
      rate: undefined,
      threshold: undefined,
      freeUnits: undefined,
      tiers: undefined,
      zones: undefined,
      packages: undefined,
    });
  }

  // Tier helpers
  function addTier(compIdx: number) {
    const comp = form.components[compIdx];
    const tiers: KmTier[] = [...(comp.tiers ?? []), { upTo: null, pricePerKm: 0 }];
    updateComponent(compIdx, { tiers });
  }
  function updateTier(compIdx: number, tierIdx: number, patch: Partial<KmTier>) {
    const comp = form.components[compIdx];
    const tiers = [...(comp.tiers ?? [])];
    tiers[tierIdx] = { ...tiers[tierIdx], ...patch };
    updateComponent(compIdx, { tiers });
  }
  function removeTier(compIdx: number, tierIdx: number) {
    const comp = form.components[compIdx];
    updateComponent(compIdx, {
      tiers: (comp.tiers ?? []).filter((_, i) => i !== tierIdx),
    });
  }

  // Zone helpers
  function addZone(compIdx: number) {
    const comp = form.components[compIdx];
    const zones: ZoneRate[] = [
      ...(comp.zones ?? []),
      { from: "", to: null, price: 0 },
    ];
    updateComponent(compIdx, { zones });
  }
  function updateZone(
    compIdx: number,
    zoneIdx: number,
    patch: Partial<ZoneRate>,
  ) {
    const comp = form.components[compIdx];
    const zones = [...(comp.zones ?? [])];
    zones[zoneIdx] = { ...zones[zoneIdx], ...patch };
    updateComponent(compIdx, { zones });
  }
  function removeZone(compIdx: number, zoneIdx: number) {
    const comp = form.components[compIdx];
    updateComponent(compIdx, {
      zones: (comp.zones ?? []).filter((_, i) => i !== zoneIdx),
    });
  }

  // ─── Submit ───────────────────────────────────────────────────────────────

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
        description: `commissionRate + driverShareRate doit être égal à 1 (actuellement ${sum.toFixed(4)}).`,
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={profile ? "Modifier le profil" : copyFrom ? "Nouvelle version du profil" : "Créer un profil"}
      description={
        profile ? "Modifiez les composantes du profil inactif." :
        copyFrom ? `Copie de "${copyFrom.name}" — une nouvelle version sera créée.` :
        template ? `Nouveau profil pré-rempli avec le template ${template.vehicleType ?? template.serviceKey}. Ajustez selon vos besoins.` :
        "Définissez la stratégie de tarification et ses composantes."
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Annuler
          </Button>
          <Button onClick={submit} isLoading={pending}>
            {pending
              ? "Enregistrement…"
              : profile
                ? "Enregistrer"
                : "Créer le profil"}
          </Button>
        </>
      }
    >
      <div className="relative flex flex-col gap-5">
        {pending ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-[color:var(--background)]/70 backdrop-blur-sm">
            <Spinner size="lg" label="Enregistrement…" />
          </div>
        ) : null}

        <fieldset disabled={pending} className="flex flex-col gap-5">
          {/* Basic info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Service *"
              id="pp-service-key"
              options={SERVICE_KEY_OPTIONS}
              value={form.serviceKey}
              onChange={(e) =>
                set(
                  "serviceKey",
                  e.target.value as CreatePricingProfileInput["serviceKey"],
                )
              }
            />
            <Select
              label="Stratégie *"
              id="pp-strategy"
              options={STRATEGY_OPTIONS}
              value={form.strategy}
              onChange={(e) =>
                set(
                  "strategy",
                  e.target.value as CreatePricingProfileInput["strategy"],
                )
              }
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
              onChange={(e) =>
                set("vehicleType", e.target.value.trim() || null)
              }
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

          {/* Rates */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Taux de commission (0 → 1) *"
              type="number"
              step="0.01"
              min={0}
              max={1}
              value={form.commissionRate}
              onChange={(e) => setCommission(Number(e.target.value))}
              hint={`Plateforme : ${(form.commissionRate * 100).toFixed(1)} %`}
              required
            />
            <Input
              label="Part chauffeur (0 → 1) *"
              type="number"
              step="0.01"
              min={0}
              max={1}
              value={form.driverShareRate}
              onChange={(e) =>
                set("driverShareRate", Math.min(1, Math.max(0, Number(e.target.value))))
              }
              hint={`Chauffeur : ${(form.driverShareRate * 100).toFixed(1)} % — somme = ${(form.commissionRate + form.driverShareRate).toFixed(4)}`}
              required
            />
          </div>

          {/* Components */}
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
                    onUpdateTier={(ti, patch) => updateTier(i, ti, patch)}
                    onRemoveTier={(ti) => removeTier(i, ti)}
                    onAddZone={() => addZone(i)}
                    onUpdateZone={(zi, patch) => updateZone(i, zi, patch)}
                    onRemoveZone={(zi) => removeZone(i, zi)}
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

// ─── ComponentEditor ─────────────────────────────────────────────────────

interface ComponentEditorProps {
  index: number;
  comp: PricingComponent;
  onTypeChange: (t: PricingComponentType) => void;
  onUpdate: (patch: Partial<PricingComponent>) => void;
  onRemove: () => void;
  onAddTier: () => void;
  onUpdateTier: (tierIdx: number, patch: Partial<KmTier>) => void;
  onRemoveTier: (tierIdx: number) => void;
  onAddZone: () => void;
  onUpdateZone: (zoneIdx: number, patch: Partial<ZoneRate>) => void;
  onRemoveZone: (zoneIdx: number) => void;
}

function ComponentEditor({
  index,
  comp,
  onTypeChange,
  onUpdate,
  onRemove,
  onAddTier,
  onUpdateTier,
  onRemoveTier,
  onAddZone,
  onUpdateZone,
  onRemoveZone,
}: ComponentEditorProps) {
  const typeLabel = COMPONENT_TYPE_LABELS[comp.type];

  const hasValue =
    comp.type === "FLAT_FEE" ||
    comp.type === "MINIMUM_FARE" ||
    comp.type === "PER_MINUTE" ||
    comp.type === "PER_UNIT" ||
    comp.type === "FIXED_SURCHARGE";
  const hasRate =
    comp.type === "MULTIPLIER" || comp.type === "PERCENTAGE_FEE";
  const hasTiers = comp.type === "PER_KM_TIER";
  const hasZones = comp.type === "PER_ZONE" || comp.type === "DISTANCE_ZONE";
  const hasKgFields = comp.type === "PER_KG";
  const hasWaitingFields = comp.type === "WAITING_FEE";

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

      {/* Type-specific fields */}
      {hasValue ? (
        <Input
          label="Valeur *"
          type="number"
          step="0.01"
          min={0}
          value={comp.value ?? 0}
          onChange={(e) => onUpdate({ value: Number(e.target.value) })}
          hint={comp.type === "FLAT_FEE" ? "Montant fixe (FCFA)" : undefined}
        />
      ) : null}

      {hasRate ? (
        <Input
          label={comp.type === "MULTIPLIER" ? "Coefficient *" : "Taux (0→1) *"}
          type="number"
          step="0.01"
          min={0}
          value={comp.rate ?? 0}
          onChange={(e) => onUpdate({ rate: Number(e.target.value) })}
          hint={
            comp.type === "PERCENTAGE_FEE"
              ? `${((comp.rate ?? 0) * 100).toFixed(1)} %`
              : undefined
          }
        />
      ) : null}

      {hasKgFields ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Tarif par kg *"
            type="number"
            step="0.01"
            min={0}
            value={comp.value ?? 0}
            onChange={(e) => onUpdate({ value: Number(e.target.value) })}
          />
          <Input
            label="Seuil gratuit (kg)"
            type="number"
            step="0.1"
            min={0}
            value={comp.threshold ?? 0}
            onChange={(e) => onUpdate({ threshold: Number(e.target.value) })}
            hint="Kg inclus avant facturation"
          />
        </div>
      ) : null}

      {hasWaitingFields ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Taux (FCFA/min) *"
            type="number"
            step="0.01"
            min={0}
            value={comp.value ?? 0}
            onChange={(e) => onUpdate({ value: Number(e.target.value) })}
          />
          <Input
            label="Minutes gratuites"
            type="number"
            step="1"
            min={0}
            value={comp.freeUnits ?? 0}
            onChange={(e) => onUpdate({ freeUnits: Number(e.target.value) })}
            hint="Minutes d'attente incluses"
          />
        </div>
      ) : null}

      {hasTiers ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[color:var(--foreground)]">
              Paliers km
            </span>
            <Button variant="outline" size="sm" onClick={onAddTier}>
              <Plus className="size-3" />
              Palier
            </Button>
          </div>
          {(comp.tiers ?? []).length === 0 ? (
            <p className="text-xs italic text-[color:var(--muted-foreground)]">
              Aucun palier.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {(comp.tiers ?? []).map((tier, ti) => (
                <li
                  key={ti}
                  className="flex items-center gap-2 rounded border border-[color:var(--border)] bg-[color:var(--muted)]/30 p-2"
                >
                  <Input
                    label={ti === 0 ? "Jusqu'à (km)" : ""}
                    type="number"
                    step="0.1"
                    min={0}
                    value={tier.upTo ?? ""}
                    onChange={(e) =>
                      onUpdateTier(ti, {
                        upTo:
                          e.target.value === ""
                            ? null
                            : Number(e.target.value),
                      })
                    }
                    placeholder="∞"
                    className="w-24"
                  />
                  <Input
                    label={ti === 0 ? "Prix/km" : ""}
                    type="number"
                    step="0.01"
                    min={0}
                    value={tier.pricePerKm ?? 0}
                    onChange={(e) =>
                      onUpdateTier(ti, {
                        pricePerKm: Number(e.target.value),
                      })
                    }
                    className="w-28"
                  />
                  <button
                    type="button"
                    onClick={() => onRemoveTier(ti)}
                    className="mt-auto rounded-md p-1.5 text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)] hover:text-[color:var(--danger)]"
                    aria-label="Supprimer le palier"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {hasZones ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[color:var(--foreground)]">
              Zones
            </span>
            <Button variant="outline" size="sm" onClick={onAddZone}>
              <Plus className="size-3" />
              Zone
            </Button>
          </div>
          {(comp.zones ?? []).length === 0 ? (
            <p className="text-xs italic text-[color:var(--muted-foreground)]">
              Aucune zone.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {(comp.zones ?? []).map((zone, zi) => (
                <li
                  key={zi}
                  className="flex flex-wrap items-end gap-2 rounded border border-[color:var(--border)] bg-[color:var(--muted)]/30 p-2"
                >
                  <Input
                    label={zi === 0 ? "De *" : ""}
                    value={zone.from ?? ""}
                    onChange={(e) => onUpdateZone(zi, { from: e.target.value })}
                    placeholder="Zone A"
                    className="w-28"
                  />
                  <Input
                    label={zi === 0 ? "Vers" : ""}
                    value={zone.to ?? ""}
                    onChange={(e) =>
                      onUpdateZone(zi, {
                        to: e.target.value.trim() || null,
                      })
                    }
                    placeholder="Zone B (opt.)"
                    className="w-28"
                  />
                  <Input
                    label={zi === 0 ? "Prix *" : ""}
                    type="number"
                    step="0.01"
                    min={0}
                    value={zone.price ?? 0}
                    onChange={(e) =>
                      onUpdateZone(zi, { price: Number(e.target.value) })
                    }
                    className="w-24"
                  />
                  <button
                    type="button"
                    onClick={() => onRemoveZone(zi)}
                    className="rounded-md p-1.5 text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)] hover:text-[color:var(--danger)]"
                    aria-label="Supprimer la zone"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </li>
  );
}
