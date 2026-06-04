"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Power, Sparkles, Trash2 } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { ConfirmModal } from "@/shared/ui/confirm-modal";
import { DropdownMenu } from "@/shared/ui/dropdown-menu";
import { Input } from "@/shared/ui/input";
import { Modal } from "@/shared/ui/modal";
import { PageHeader } from "@/shared/ui/page-header";
import { Tabs } from "@/shared/ui/tabs";
import { Textarea } from "@/shared/ui/textarea";
import { toast } from "@/shared/ui/toast";
import { formatXof } from "@/shared/lib/format";
import { PARCEL_TYPE_META, type ParcelType } from "@/features/delivery/domain/delivery";
import {
  useDeliveryPricingStore,
  type ExpressRule,
  type NewExpressRuleInput,
  type NewZoneInput,
  type ParcelMultiplier,
  type Zone,
} from "./store";

function ZoneFormModal({
  open,
  mode,
  zone,
  onClose,
}: {
  open: boolean;
  mode: "create" | "edit";
  zone?: Zone;
  onClose: () => void;
}) {
  const create = useDeliveryPricingStore((s) => s.createZone);
  const update = useDeliveryPricingStore((s) => s.updateZone);
  const empty: NewZoneInput = { label: "", range: "", basePrice: 1000, pricePerKm: 100 };
  const [form, setForm] = useState<NewZoneInput>(empty);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && zone) {
      setForm({
        label: zone.label,
        range: zone.range,
        basePrice: zone.basePrice,
        pricePerKm: zone.pricePerKm,
      });
    } else {
      setForm(empty);
    }
  }, [open, mode, zone]);

  function set<K extends keyof NewZoneInput>(key: K, value: NewZoneInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit() {
    if (!form.label || !form.range) {
      toast({
        kind: "error",
        title: "Champs manquants",
        description: "Libellé et plage de distance requis.",
      });
      return;
    }
    if (mode === "create") {
      create(form);
      toast({ kind: "success", title: "Zone créée", description: form.label });
    } else if (zone) {
      update(zone.id, form);
      toast({ kind: "success", title: "Zone mise à jour", description: form.label });
    }
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "create" ? "Nouvelle zone tarifaire" : "Modifier la zone"}
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
          label="Libellé"
          required
          value={form.label}
          onChange={(e) => set("label", e.target.value)}
          placeholder="Zone 1"
        />
        <Input
          label="Plage de distance"
          required
          value={form.range}
          onChange={(e) => set("range", e.target.value)}
          placeholder="≤ 5 km"
        />
        <Input
          label="Prix de base (FCFA)"
          type="number"
          value={form.basePrice}
          onChange={(e) => set("basePrice", Number(e.target.value))}
        />
        <Input
          label="Prix / km (FCFA)"
          type="number"
          value={form.pricePerKm}
          onChange={(e) => set("pricePerKm", Number(e.target.value))}
        />
      </div>
    </Modal>
  );
}

function MultiplierEditModal({
  open,
  multiplier,
  onClose,
}: {
  open: boolean;
  multiplier: ParcelMultiplier | null;
  onClose: () => void;
}) {
  const update = useDeliveryPricingStore((s) => s.updateMultiplier);
  const [value, setValue] = useState(1);

  useEffect(() => {
    if (open && multiplier) setValue(multiplier.multiplier);
  }, [open, multiplier]);

  function handleSubmit() {
    if (!multiplier) return;
    update(multiplier.parcelType, value);
    toast({
      kind: "success",
      title: "Multiplicateur mis à jour",
      description: `${PARCEL_TYPE_META[multiplier.parcelType].label} → ×${value}`,
    });
    onClose();
  }

  if (!multiplier) return null;
  const meta = PARCEL_TYPE_META[multiplier.parcelType];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Multiplicateur ${meta.label}`}
      description="Surcharge appliquée sur le prix de zone selon la catégorie de colis."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSubmit}>Enregistrer</Button>
        </>
      }
    >
      <div className="flex items-center gap-3 rounded-lg bg-[color:var(--muted)] p-3 text-sm">
        <span className="text-2xl" aria-hidden>
          {meta.emoji}
        </span>
        <div>
          <p className="font-medium text-[color:var(--foreground)]">{meta.label}</p>
          <p className="text-xs text-[color:var(--muted-foreground)]">
            ≤ {meta.maxKg} kg · véhicule par défaut {meta.defaultVehicle}
          </p>
        </div>
      </div>
      <div className="mt-4">
        <Input
          label="Multiplicateur"
          type="number"
          step={0.05}
          min={1}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          hint="1.0 = pas de surcharge. 1.4 = +40 % par rapport au prix de zone."
        />
      </div>
    </Modal>
  );
}

function ExpressFormModal({
  open,
  mode,
  rule,
  onClose,
}: {
  open: boolean;
  mode: "create" | "edit";
  rule?: ExpressRule;
  onClose: () => void;
}) {
  const create = useDeliveryPricingStore((s) => s.createRule);
  const update = useDeliveryPricingStore((s) => s.updateRule);
  const empty: NewExpressRuleInput = { label: "", description: "", multiplier: 1.5 };
  const [form, setForm] = useState<NewExpressRuleInput>(empty);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && rule) {
      setForm({
        label: rule.label,
        description: rule.description,
        multiplier: rule.multiplier,
      });
    } else {
      setForm(empty);
    }
  }, [open, mode, rule]);

  function set<K extends keyof NewExpressRuleInput>(
    key: K,
    value: NewExpressRuleInput[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit() {
    if (!form.label) {
      toast({
        kind: "error",
        title: "Libellé manquant",
        description: "Donne un nom court à cette règle.",
      });
      return;
    }
    if (mode === "create") {
      create(form);
      toast({ kind: "success", title: "Règle ajoutée", description: form.label });
    } else if (rule) {
      update(rule.id, form);
      toast({
        kind: "success",
        title: "Règle mise à jour",
        description: form.label,
      });
    }
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={mode === "create" ? "Nouvelle règle express" : "Modifier la règle"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSubmit}>
            {mode === "create" ? "Créer la règle" : "Enregistrer"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Input
          label="Libellé"
          required
          value={form.label}
          onChange={(e) => set("label", e.target.value)}
          placeholder="Livraison express ≤ 30 min"
        />
        <Textarea
          label="Description"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Pickup + delivery en moins de 30 minutes"
          rows={2}
        />
        <Input
          label="Multiplicateur"
          type="number"
          step={0.05}
          min={1}
          value={form.multiplier}
          onChange={(e) => set("multiplier", Number(e.target.value))}
          hint="Appliqué au-dessus du prix zone × catégorie."
        />
      </div>
    </Modal>
  );
}

export function DeliveryPricingPage() {
  const zones = useDeliveryPricingStore((s) => s.zones);
  const removeZone = useDeliveryPricingStore((s) => s.removeZone);
  const multipliers = useDeliveryPricingStore((s) => s.multipliers);
  const rules = useDeliveryPricingStore((s) => s.rules);
  const toggleRule = useDeliveryPricingStore((s) => s.toggleRule);
  const removeRule = useDeliveryPricingStore((s) => s.removeRule);

  const [zoneFormOpen, setZoneFormOpen] = useState(false);
  const [zoneMode, setZoneMode] = useState<"create" | "edit">("create");
  const [zoneTarget, setZoneTarget] = useState<Zone | undefined>(undefined);

  const [zoneConfirm, setZoneConfirm] = useState<{
    open: boolean;
    target: Zone | null;
  }>({ open: false, target: null });

  const [multiplierOpen, setMultiplierOpen] = useState(false);
  const [multiplierTarget, setMultiplierTarget] = useState<ParcelMultiplier | null>(
    null,
  );

  const [ruleFormOpen, setRuleFormOpen] = useState(false);
  const [ruleMode, setRuleMode] = useState<"create" | "edit">("create");
  const [ruleTarget, setRuleTarget] = useState<ExpressRule | undefined>(undefined);

  const [ruleConfirm, setRuleConfirm] = useState<{
    open: boolean;
    action: "toggle" | "delete";
    target: ExpressRule | null;
  }>({ open: false, action: "delete", target: null });

  function openZoneCreate() {
    setZoneMode("create");
    setZoneTarget(undefined);
    setZoneFormOpen(true);
  }
  function openZoneEdit(z: Zone) {
    setZoneMode("edit");
    setZoneTarget(z);
    setZoneFormOpen(true);
  }
  function openMultiplier(m: ParcelMultiplier) {
    setMultiplierTarget(m);
    setMultiplierOpen(true);
  }
  function openRuleCreate() {
    setRuleMode("create");
    setRuleTarget(undefined);
    setRuleFormOpen(true);
  }
  function openRuleEdit(r: ExpressRule) {
    setRuleMode("edit");
    setRuleTarget(r);
    setRuleFormOpen(true);
  }

  function runZoneDelete() {
    if (!zoneConfirm.target) return;
    removeZone(zoneConfirm.target.id);
    toast({
      kind: "info",
      title: "Zone supprimée",
      description: zoneConfirm.target.label,
    });
    setZoneConfirm({ open: false, target: null });
  }

  function runRuleConfirm() {
    if (!ruleConfirm.target) return;
    if (ruleConfirm.action === "toggle") {
      toggleRule(ruleConfirm.target.id);
      toast({
        kind: "info",
        title: ruleConfirm.target.isActive ? "Règle désactivée" : "Règle activée",
        description: ruleConfirm.target.label,
      });
    } else {
      removeRule(ruleConfirm.target.id);
      toast({
        kind: "info",
        title: "Règle supprimée",
        description: ruleConfirm.target.label,
      });
    }
    setRuleConfirm((c) => ({ ...c, open: false, target: null }));
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Configuration livraison"
        title="Tarifs livraison"
        dataSource="mock"
        description="Grille zones × distance, multiplicateurs catégorie et règles express."
        actions={
          <>
            <Button variant="outline" size="sm">
              Historique des versions
            </Button>
            <Button size="sm">Publier les changements</Button>
          </>
        }
      />

      <Tabs
        defaultValue="grid"
        tabs={[
          {
            value: "grid",
            label: "Grille zones × catégories",
            content: (
              <div className="flex flex-col gap-6">
                <Card className="p-0">
                  <CardHeader className="flex-row items-end justify-between">
                    <div>
                      <CardTitle>Grille tarifaire — par zone de distance</CardTitle>
                      <CardDescription>
                        Prix de base + prix au km calculé sur la distance pickup → delivery.
                      </CardDescription>
                    </div>
                    <Button size="sm" onClick={openZoneCreate}>
                      <Plus className="size-4" />
                      Nouvelle zone
                    </Button>
                  </CardHeader>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-y border-[color:var(--border)] text-left text-xs uppercase tracking-wide text-[color:var(--muted-foreground)]">
                        <th className="px-5 py-2.5 font-medium">Zone</th>
                        <th className="px-5 py-2.5 font-medium">Distance</th>
                        <th className="px-5 py-2.5 text-right font-medium">Prix de base</th>
                        <th className="px-5 py-2.5 text-right font-medium">Prix / km</th>
                        <th className="px-5 py-2.5 text-right font-medium">Exemple 8 km</th>
                        <th className="w-12 px-5 py-2.5"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {zones.map((zone) => {
                        const example = zone.basePrice + zone.pricePerKm * 8;
                        return (
                          <tr
                            key={zone.id}
                            className="border-b border-[color:var(--border)] last:border-b-0"
                          >
                            <td className="px-5 py-3 font-medium text-[color:var(--foreground)]">
                              {zone.label}
                            </td>
                            <td className="px-5 py-3 text-[color:var(--muted-foreground)]">
                              {zone.range}
                            </td>
                            <td className="px-5 py-3 text-right font-mono text-[color:var(--foreground)]">
                              {formatXof(zone.basePrice)}
                            </td>
                            <td className="px-5 py-3 text-right font-mono text-[color:var(--foreground)]">
                              {formatXof(zone.pricePerKm)}
                            </td>
                            <td className="px-5 py-3 text-right font-mono text-[color:var(--muted-foreground)]">
                              ≈ {formatXof(example)}
                            </td>
                            <td className="px-5 py-3 text-right">
                              <DropdownMenu
                                groups={[
                                  {
                                    items: [
                                      {
                                        label: "Modifier",
                                        icon: Pencil,
                                        onSelect: () => openZoneEdit(zone),
                                      },
                                      {
                                        label: "Supprimer",
                                        icon: Trash2,
                                        onSelect: () =>
                                          setZoneConfirm({ open: true, target: zone }),
                                        danger: true,
                                      },
                                    ],
                                  },
                                ]}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </Card>

                <Card className="p-0">
                  <CardHeader>
                    <CardTitle>Multiplicateurs par catégorie de colis</CardTitle>
                    <CardDescription>
                      Surcharge appliquée sur le prix de zone selon le type de colis.
                    </CardDescription>
                  </CardHeader>
                  <ul className="grid gap-px bg-[color:var(--border)] sm:grid-cols-2 lg:grid-cols-3">
                    {multipliers.map((m) => {
                      const meta = PARCEL_TYPE_META[m.parcelType as ParcelType];
                      return (
                        <li
                          key={m.parcelType}
                          className="flex items-center gap-3 bg-[color:var(--background)] px-5 py-4 dark:bg-[color:var(--muted)]"
                        >
                          <span className="text-2xl" aria-hidden>
                            {meta.emoji}
                          </span>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-[color:var(--foreground)]">
                              {meta.label}
                            </p>
                            <p className="text-xs text-[color:var(--muted-foreground)]">
                              ≤ {meta.maxKg} kg · véhicule {meta.defaultVehicle}
                            </p>
                          </div>
                          <span className="rounded-md bg-[color:var(--secondary-soft)] px-2.5 py-1 text-sm font-semibold text-[color:var(--secondary-foreground)]">
                            ×{m.multiplier}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openMultiplier(m)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                </Card>
              </div>
            ),
          },
          {
            value: "express",
            label: "Express & exceptions",
            badge: {
              count: rules.filter((r) => r.isActive).length,
              tone: "primary",
            },
            content: (
              <Card className="p-0">
                <CardHeader className="flex-row items-end justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="size-4 text-[color:var(--secondary)]" />
                      Suppléments & exceptions
                    </CardTitle>
                    <CardDescription>
                      Multiplicateurs appliqués au-dessus de la grille zone × catégorie.
                    </CardDescription>
                  </div>
                  <Button size="sm" onClick={openRuleCreate}>
                    <Plus className="size-4" />
                    Nouvelle règle
                  </Button>
                </CardHeader>
                <ul className="flex flex-col">
                  {rules.length === 0 ? (
                    <li className="px-5 py-12 text-center text-sm text-[color:var(--muted-foreground)]">
                      Aucune règle. Créez la première.
                    </li>
                  ) : (
                    rules.map((rule) => (
                      <li
                        key={rule.id}
                        className="flex flex-wrap items-center gap-3 border-t border-[color:var(--border)] px-5 py-4 first:border-t-0 hover:bg-[color:var(--muted)]/40"
                      >
                        <span className="flex size-10 items-center justify-center rounded-lg bg-[color:var(--primary-soft)] text-[color:var(--primary)]">
                          <Sparkles className="size-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-[color:var(--foreground)]">
                            {rule.label}
                          </p>
                          <p className="text-xs text-[color:var(--muted-foreground)]">
                            {rule.description}
                          </p>
                        </div>
                        <Badge tone={rule.isActive ? "success" : "neutral"}>
                          {rule.isActive ? "Activée" : "Désactivée"}
                        </Badge>
                        <span className="rounded-md bg-[color:var(--secondary-soft)] px-2.5 py-1 text-sm font-semibold text-[color:var(--secondary-foreground)]">
                          ×{rule.multiplier}
                        </span>
                        <DropdownMenu
                          groups={[
                            {
                              label: "Cas d'usage",
                              items: [
                                {
                                  label: "Modifier",
                                  icon: Pencil,
                                  onSelect: () => openRuleEdit(rule),
                                },
                                {
                                  label: rule.isActive ? "Désactiver" : "Activer",
                                  icon: Power,
                                  onSelect: () =>
                                    setRuleConfirm({
                                      open: true,
                                      action: "toggle",
                                      target: rule,
                                    }),
                                },
                              ],
                            },
                            {
                              items: [
                                {
                                  label: "Supprimer",
                                  icon: Trash2,
                                  onSelect: () =>
                                    setRuleConfirm({
                                      open: true,
                                      action: "delete",
                                      target: rule,
                                    }),
                                  danger: true,
                                },
                              ],
                            },
                          ]}
                        />
                      </li>
                    ))
                  )}
                </ul>
              </Card>
            ),
          },
        ]}
      />

      <ZoneFormModal
        open={zoneFormOpen}
        mode={zoneMode}
        zone={zoneTarget}
        onClose={() => setZoneFormOpen(false)}
      />
      <ConfirmModal
        open={zoneConfirm.open}
        onClose={() => setZoneConfirm({ open: false, target: null })}
        onConfirm={runZoneDelete}
        title="Supprimer cette zone ?"
        description={
          zoneConfirm.target ? (
            <p className="font-medium">{zoneConfirm.target.label}</p>
          ) : null
        }
        confirmLabel="Supprimer"
        tone="danger"
      />
      <MultiplierEditModal
        open={multiplierOpen}
        multiplier={multiplierTarget}
        onClose={() => setMultiplierOpen(false)}
      />
      <ExpressFormModal
        open={ruleFormOpen}
        mode={ruleMode}
        rule={ruleTarget}
        onClose={() => setRuleFormOpen(false)}
      />
      <ConfirmModal
        open={ruleConfirm.open}
        onClose={() => setRuleConfirm((c) => ({ ...c, open: false }))}
        onConfirm={runRuleConfirm}
        title={
          ruleConfirm.action === "toggle"
            ? ruleConfirm.target?.isActive
              ? "Désactiver cette règle ?"
              : "Activer cette règle ?"
            : "Supprimer cette règle ?"
        }
        description={
          ruleConfirm.target ? (
            <p className="font-medium">{ruleConfirm.target.label}</p>
          ) : null
        }
        confirmLabel={
          ruleConfirm.action === "toggle"
            ? ruleConfirm.target?.isActive
              ? "Désactiver"
              : "Activer"
            : "Supprimer"
        }
        tone={
          ruleConfirm.action === "delete" ||
          (ruleConfirm.action === "toggle" && ruleConfirm.target?.isActive)
            ? "danger"
            : "primary"
        }
      />
    </div>
  );
}
