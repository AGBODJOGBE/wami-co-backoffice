"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Combobox } from "@/shared/ui/combobox";
import { Input } from "@/shared/ui/input";
import { PageHeader } from "@/shared/ui/page-header";
import { Spinner } from "@/shared/ui/spinner";
import { toast } from "@/shared/ui/toast";
import {
  DEFAULT_RIDE_PRICING,
  RIDE_VEHICLE_LABELS,
  type RidePricingInput,
  type RideVehicleType,
  type TimedPackage,
} from "../domain/ride-pricing";
import { updateRidePricingAction } from "../application/actions";
import { CanView } from "@/shared/ui/can-view";

const VEHICLE_OPTIONS = (
  Object.keys(RIDE_VEHICLE_LABELS) as RideVehicleType[]
).map((v) => ({ value: v, label: RIDE_VEHICLE_LABELS[v] }));

function deepCloneDefaults(): RidePricingInput {
  return JSON.parse(JSON.stringify(DEFAULT_RIDE_PRICING));
}

function fmtFcfa(n: number) {
  return `${n.toLocaleString("fr-FR")} FCFA`;
}

export interface RidePricingClientProps {
  /** Active config pre-fetched server-side from GET /api/admin/ride-pricing. */
  initialPricing?: RidePricingInput;
  /** Vehicle type the initialPricing was fetched for (drives the combobox). */
  initialVehicleType?: RideVehicleType;
  /** When provided, displayed as the version reference under the title. */
  initialError?: string;
}

export function RidePricingClient({
  initialPricing,
  initialVehicleType,
  initialError,
}: RidePricingClientProps = {}) {
  const [vehicleType, setVehicleType] = useState<RideVehicleType>(
    initialVehicleType ?? "STANDARD",
  );
  const [form, setForm] = useState<RidePricingInput>(
    initialPricing ?? deepCloneDefaults(),
  );
  const [pending, start] = useTransition();

  function set<K extends keyof RidePricingInput>(
    key: K,
    value: RidePricingInput[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setTier(tier: keyof RidePricingInput["distanceTiers"], value: number) {
    setForm((f) => ({
      ...f,
      distanceTiers: { ...f.distanceTiers, [tier]: value },
    }));
  }

  function addPackage() {
    set("timedPackages", [
      ...form.timedPackages,
      { durationMinutes: 60, price: 2500, includedKm: 15, extraKmRate: 150 },
    ]);
  }

  function updatePackage(i: number, patch: Partial<TimedPackage>) {
    const next = [...form.timedPackages];
    next[i] = { ...next[i], ...patch };
    set("timedPackages", next);
  }

  function removePackage(i: number) {
    set(
      "timedPackages",
      form.timedPackages.filter((_, idx) => idx !== i),
    );
  }

  function reset() {
    setForm(deepCloneDefaults());
    toast({
      kind: "info",
      title: "Formulaire réinitialisé",
      description: "Valeurs ramenées aux défauts.",
    });
  }

  function submit() {
    if (form.driverShareRate <= 0 || form.driverShareRate >= 1) {
      toast({
        kind: "error",
        title: "Part driver invalide",
        description: "Doit être entre 0 et 1 (ex. 0,82 pour 82 %).",
      });
      return;
    }
    if (form.minimumFare <= 0 || form.baseFare <= 0) {
      toast({
        kind: "error",
        title: "Tarifs invalides",
        description: "Base et minimum doivent être strictement positifs.",
      });
      return;
    }
    start(async () => {
      const r = await updateRidePricingAction(vehicleType, form);
      if (r.ok) {
        toast({
          kind: "success",
          title: "Nouvelle version activée",
          description: r.message,
        });
      } else {
        toast({ kind: "error", title: "Échec", description: r.message });
      }
    });
  }

  // Sample calculation preview
  const sample = useMemo(() => {
    const km = 12;
    const min = 25;
    const tier =
      Math.min(km, 10) * form.distanceTiers.upTo10km +
      Math.max(0, Math.min(km - 10, 10)) * form.distanceTiers.upTo20km +
      Math.max(0, Math.min(km - 20, 10)) * form.distanceTiers.upTo30km +
      Math.max(0, km - 30) * form.distanceTiers.above30km;
    const total = Math.max(
      form.minimumFare,
      Math.round(form.baseFare + tier + min * form.perMinute),
    );
    const driver = Math.round(total * form.driverShareRate);
    return { km, min, total, driver, commission: total - driver };
  }, [form]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Configuration VTC"
        title="Tarifs ride-pricing"
        dataSource="live"
        dataSourceHint="PATCH /api/admin/ride-pricing/{vehicleType} — chaque enregistrement crée une nouvelle version."
        description="Grille tarifaire par catégorie de véhicule. Versionné — la version précédente est automatiquement désactivée."
        actions={
          <>
            <CanView permission="pricing.grid.configure">
              <Button variant="outline" size="sm" onClick={reset} disabled={pending}>
                Réinitialiser
              </Button>
              <Button onClick={submit} isLoading={pending}>
                <Save className="size-4" />
                {pending
                  ? "Enregistrement…"
                  : "Activer une nouvelle version"}
              </Button>
            </CanView>
          </>
        }
      />

      {initialError ? (
        <div className="rounded-md border border-[color:var(--warning)]/30 bg-[color:var(--warning)]/10 px-3 py-2 text-xs text-[color:var(--warning)]">
          Impossible de précharger la version active : {initialError}. Le
          formulaire repart sur les valeurs par défaut.
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Catégorie de véhicule</CardTitle>
          </CardHeader>
          <CardContent>
            <Combobox
              label="Véhicule cible"
              options={VEHICLE_OPTIONS}
              value={vehicleType}
              onChange={(v) => setVehicleType(v as RideVehicleType)}
              required
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aperçu — course 12 km, 25 min</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="flex flex-col gap-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-[color:var(--muted-foreground)]">Total</dt>
                <dd className="font-semibold">{fmtFcfa(sample.total)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[color:var(--muted-foreground)]">
                  Driver ({Math.round(form.driverShareRate * 100)} %)
                </dt>
                <dd>{fmtFcfa(sample.driver)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[color:var(--muted-foreground)]">
                  Commission
                </dt>
                <dd>{fmtFcfa(sample.commission)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bases & paliers distance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Input
              label="Prise en charge (FCFA)"
              type="number"
              min={0}
              value={form.baseFare}
              onChange={(e) => set("baseFare", Number(e.target.value))}
              hint="Coût fixe au démarrage"
            />
            <Input
              label="Tarif min (FCFA)"
              type="number"
              min={0}
              value={form.minimumFare}
              onChange={(e) => set("minimumFare", Number(e.target.value))}
              hint="Plancher facturé"
            />
            <Input
              label="Tarif au temps (FCFA / min)"
              type="number"
              min={0}
              value={form.perMinute}
              onChange={(e) => set("perMinute", Number(e.target.value))}
              hint="Couvre les embouteillages"
            />
            <Input
              label="0 → 10 km (FCFA / km)"
              type="number"
              min={0}
              value={form.distanceTiers.upTo10km}
              onChange={(e) => setTier("upTo10km", Number(e.target.value))}
            />
            <Input
              label="10 → 20 km (FCFA / km)"
              type="number"
              min={0}
              value={form.distanceTiers.upTo20km}
              onChange={(e) => setTier("upTo20km", Number(e.target.value))}
            />
            <Input
              label="20 → 30 km (FCFA / km)"
              type="number"
              min={0}
              value={form.distanceTiers.upTo30km}
              onChange={(e) => setTier("upTo30km", Number(e.target.value))}
            />
            <Input
              label="Au-delà de 30 km (FCFA / km)"
              type="number"
              min={0}
              value={form.distanceTiers.above30km}
              onChange={(e) => setTier("above30km", Number(e.target.value))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Règles opérationnelles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Input
              label="Part driver (0 → 1)"
              type="number"
              step="0.01"
              min={0}
              max={1}
              value={form.driverShareRate}
              onChange={(e) =>
                set("driverShareRate", Number(e.target.value))
              }
              hint={`${Math.round(form.driverShareRate * 100)} % au driver`}
            />
            <Input
              label="Tolérance déviation (km)"
              type="number"
              step="0.1"
              min={0}
              value={form.routeDeviationThreshold}
              onChange={(e) =>
                set("routeDeviationThreshold", Number(e.target.value))
              }
              hint="Avant re-calcul du prix"
            />
            <Input
              label="Attente offerte (min)"
              type="number"
              min={0}
              value={form.freeWaitingMinutes}
              onChange={(e) =>
                set("freeWaitingMinutes", Number(e.target.value))
              }
            />
            <Input
              label="Attente facturée (FCFA / min)"
              type="number"
              min={0}
              value={form.waitingFeePerMinute}
              onChange={(e) =>
                set("waitingFeePerMinute", Number(e.target.value))
              }
            />
            <Input
              label="No-show déclaré après (min)"
              type="number"
              min={0}
              value={form.noShowMinutes}
              onChange={(e) => set("noShowMinutes", Number(e.target.value))}
              hint="Délai avant facturation d'absence"
            />
            <Input
              label="Frais de no-show (FCFA)"
              type="number"
              min={0}
              value={form.noShowFee}
              onChange={(e) => set("noShowFee", Number(e.target.value))}
              hint="Facturé au passager"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Forfaits horaires</CardTitle>
            <CanView permission="pricing.grid.configure">
              <Button
                variant="outline"
                size="sm"
                onClick={addPackage}
                disabled={pending}
              >
                <Plus className="size-4" />
                Ajouter un forfait
              </Button>
            </CanView>
          </div>
        </CardHeader>
        <CardContent>
          {form.timedPackages.length === 0 ? (
            <p className="text-sm italic text-[color:var(--muted-foreground)]">
              Aucun forfait — laisse vide si la catégorie ne propose pas de
              location à la durée.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {form.timedPackages.map((pkg, i) => (
                <li
                  key={i}
                  className="grid gap-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] p-3 sm:grid-cols-[repeat(4,1fr)_auto]"
                >
                  <Input
                    label="Durée (min)"
                    type="number"
                    min={1}
                    value={pkg.durationMinutes}
                    onChange={(e) =>
                      updatePackage(i, {
                        durationMinutes: Number(e.target.value),
                      })
                    }
                  />
                  <Input
                    label="Prix (FCFA)"
                    type="number"
                    min={0}
                    value={pkg.price}
                    onChange={(e) =>
                      updatePackage(i, { price: Number(e.target.value) })
                    }
                  />
                  <Input
                    label="Km inclus"
                    type="number"
                    min={0}
                    value={pkg.includedKm}
                    onChange={(e) =>
                      updatePackage(i, { includedKm: Number(e.target.value) })
                    }
                  />
                  <Input
                    label="Km supp. (FCFA / km)"
                    type="number"
                    min={0}
                    value={pkg.extraKmRate}
                    onChange={(e) =>
                      updatePackage(i, { extraKmRate: Number(e.target.value) })
                    }
                  />
                  <button
                    type="button"
                    onClick={() => removePackage(i)}
                    className="self-end rounded-md p-2 text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)] hover:text-[color:var(--danger)]"
                    aria-label="Supprimer le forfait"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {pending ? (
        <div className="fixed inset-x-0 bottom-6 mx-auto flex w-fit items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-2 shadow-lg">
          <Spinner size="sm" />
          <span className="text-sm">Activation de la nouvelle version…</span>
        </div>
      ) : null}
    </div>
  );
}
