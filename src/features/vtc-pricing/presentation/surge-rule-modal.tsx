"use client";

import { useEffect, useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Modal } from "@/shared/ui/modal";
import { Spinner } from "@/shared/ui/spinner";
import { Textarea } from "@/shared/ui/textarea";
import { toast } from "@/shared/ui/toast";
import {
  createSurgeRuleAction,
  updateSurgeRuleAction,
  type ActionResult,
} from "../application/surge-actions";
import {
  DAYS_OF_WEEK_LABELS,
  defaultSurgeRule,
  type SurgeRule,
  type SurgeRuleInput,
  type SurgeTimeWindow,
  type SurgeZone,
} from "../domain/surge";
import {
  RIDE_VEHICLE_LABELS,
  type RideVehicleType,
} from "../domain/ride-pricing";

const VEHICLE_TYPES = Object.keys(RIDE_VEHICLE_LABELS) as RideVehicleType[];
const DAYS = Object.keys(DAYS_OF_WEEK_LABELS).map((k) => parseInt(k));

function notify(result: ActionResult<unknown>, successTitle: string) {
  if (result.ok) {
    toast({
      kind: "success",
      title: successTitle,
      description: result.message,
    });
  } else {
    toast({ kind: "error", title: "Échec", description: result.message });
  }
}

export interface SurgeRuleModalProps {
  open: boolean;
  rule: SurgeRule | null;
  onClose: () => void;
}

export function SurgeRuleModal({ open, rule, onClose }: SurgeRuleModalProps) {
  const [form, setForm] = useState<SurgeRuleInput>(defaultSurgeRule());
  const [pending, start] = useTransition();
  const [zonesText, setZonesText] = useState("");

  useEffect(() => {
    if (!open) return;
    if (rule) {
      setForm({
        name: rule.name,
        description: rule.description ?? "",
        multiplier: rule.multiplier,
        priority: rule.priority,
        vehicleTypes: rule.vehicleTypes ?? [],
        timeWindows: rule.timeWindows ?? [],
        zones: rule.zones ?? [],
        specialDates: rule.specialDates ?? [],
        demandConfig: rule.demandConfig ?? null,
        isActive: rule.isActive ?? true,
      });
      setZonesText(
        (rule.zones ?? []).map((z) => z.name).join(", "),
      );
    } else {
      setForm(defaultSurgeRule());
      setZonesText("");
    }
  }, [open, rule]);

  function set<K extends keyof SurgeRuleInput>(
    key: K,
    value: SurgeRuleInput[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleVehicle(t: RideVehicleType) {
    const cur = form.vehicleTypes ?? [];
    set(
      "vehicleTypes",
      cur.includes(t) ? cur.filter((v) => v !== t) : [...cur, t],
    );
  }

  function addWindow() {
    set("timeWindows", [
      ...(form.timeWindows ?? []),
      { startHour: 7, endHour: 9, daysOfWeek: [1, 2, 3, 4, 5] },
    ]);
  }
  function updateWindow(i: number, patch: Partial<SurgeTimeWindow>) {
    const next = [...(form.timeWindows ?? [])];
    next[i] = { ...next[i], ...patch };
    set("timeWindows", next);
  }
  function toggleWindowDay(i: number, day: number) {
    const cur = form.timeWindows?.[i].daysOfWeek ?? [];
    updateWindow(i, {
      daysOfWeek: cur.includes(day)
        ? cur.filter((d) => d !== day)
        : [...cur, day].sort(),
    });
  }
  function removeWindow(i: number) {
    set(
      "timeWindows",
      (form.timeWindows ?? []).filter((_, idx) => idx !== i),
    );
  }

  function commit(): SurgeRuleInput {
    const zones: SurgeZone[] = zonesText
      ? zonesText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((name) => ({ name, coordinates: [] }))
      : [];
    return { ...form, zones };
  }

  function addSpecialDate() {
    set("specialDates", [...(form.specialDates ?? []), ""]);
  }
  function updateSpecialDate(i: number, value: string) {
    const next = [...(form.specialDates ?? [])];
    next[i] = value;
    set("specialDates", next);
  }
  function removeSpecialDate(i: number) {
    set(
      "specialDates",
      (form.specialDates ?? []).filter((_, idx) => idx !== i),
    );
  }

  function submit() {
    const final = commit();
    if (!final.name) {
      toast({
        kind: "error",
        title: "Nom requis",
        description: "Donne un nom à cette règle.",
      });
      return;
    }
    if (final.multiplier <= 1 || final.multiplier > 5) {
      toast({
        kind: "error",
        title: "Multiplicateur invalide",
        description: "Doit être strictement supérieur à 1 et ≤ 5.",
      });
      return;
    }
    start(async () => {
      const r = rule
        ? await updateSurgeRuleAction(rule.id, final)
        : await createSurgeRuleAction(final);
      notify(r, rule ? "Règle mise à jour" : "Règle créée");
      if (r.ok) onClose();
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={rule ? "Modifier la règle" : "Nouvelle règle de surge"}
      description="Multiplicateur tarifaire dynamique conditionné par véhicule, horaire et zone."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Annuler
          </Button>
          <Button onClick={submit} isLoading={pending}>
            {pending
              ? "Enregistrement…"
              : rule
                ? "Enregistrer"
                : "Créer la règle"}
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
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Nom *"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Rush hour Cotonou"
              required
            />
            <Input
              label="Multiplicateur (1.01 → 5) *"
              type="number"
              step="0.05"
              min={1.01}
              max={5}
              value={form.multiplier}
              onChange={(e) => set("multiplier", Number(e.target.value))}
              hint={`Course +${Math.round((form.multiplier - 1) * 100)} %`}
              required
            />
            <Input
              label="Priorité (entier) *"
              type="number"
              min={0}
              value={form.priority}
              onChange={(e) => set("priority", Number(e.target.value))}
              hint="Plus haute = appliquée en premier"
              required
            />
            <label className="mt-7 flex items-center gap-2 text-sm text-[color:var(--foreground)]">
              <input
                type="checkbox"
                checked={form.isActive ?? true}
                onChange={(e) => set("isActive", e.target.checked)}
                className="size-4 rounded border-[color:var(--border)] text-[color:var(--primary)] focus:ring-[color:var(--primary)]"
              />
              Règle active
            </label>
          </div>

          <Textarea
            label="Description"
            rows={2}
            value={form.description ?? ""}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Pic du matin et du soir en semaine"
          />

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-[color:var(--foreground)]">
              Types de véhicules
            </span>
            <div className="flex flex-wrap gap-2">
              {VEHICLE_TYPES.map((t) => {
                const active = (form.vehicleTypes ?? []).includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleVehicle(t)}
                    className={
                      "rounded-full border px-3 py-1 text-xs transition " +
                      (active
                        ? "border-[color:var(--primary)] bg-[color:var(--primary)] text-[color:var(--primary-foreground)]"
                        : "border-[color:var(--foreground)]/30 bg-transparent text-[color:var(--foreground)] hover:bg-[color:var(--muted)]")
                    }
                  >
                    {RIDE_VEHICLE_LABELS[t]}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-[color:var(--muted-foreground)]">
              Vide = tous les types de véhicules.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[color:var(--foreground)]">
                Plages horaires
              </span>
              <Button variant="outline" size="sm" onClick={addWindow}>
                <Plus className="size-4" />
                Ajouter
              </Button>
            </div>
            {(form.timeWindows ?? []).map((w, i) => (
              <div
                key={i}
                className="flex flex-col gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] p-3"
              >
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    value={w.startHour}
                    onChange={(e) =>
                      updateWindow(i, { startHour: Number(e.target.value) })
                    }
                    className="w-20"
                  />
                  <span className="text-sm">→</span>
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    value={w.endHour}
                    onChange={(e) =>
                      updateWindow(i, { endHour: Number(e.target.value) })
                    }
                    className="w-20"
                  />
                  <button
                    type="button"
                    onClick={() => removeWindow(i)}
                    className="ml-auto rounded-md p-1.5 text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)] hover:text-[color:var(--danger)]"
                    aria-label="Supprimer la plage"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {DAYS.map((d) => {
                    const active = (w.daysOfWeek ?? []).includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleWindowDay(i, d)}
                        className={
                          "rounded px-2 py-0.5 text-[10px] transition " +
                          (active
                            ? "bg-[color:var(--primary)] text-[color:var(--primary-foreground)]"
                            : "bg-[color:var(--muted)] text-[color:var(--foreground)] hover:bg-[color:var(--muted-foreground)]/30")
                        }
                      >
                        {DAYS_OF_WEEK_LABELS[d]}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <Input
            label="Zones (noms séparés par des virgules)"
            value={zonesText}
            onChange={(e) => setZonesText(e.target.value)}
            placeholder="Aéroport, Centre, Ganhi"
            hint="Les coordonnées GeoJSON seront éditables dans une prochaine version."
          />

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[color:var(--foreground)]">
                Dates spéciales
              </span>
              <Button variant="outline" size="sm" onClick={addSpecialDate}>
                <Plus className="size-4" />
                Ajouter une date
              </Button>
            </div>
            {(form.specialDates ?? []).length === 0 ? (
              <p className="text-xs italic text-[color:var(--muted-foreground)]">
                Aucune date spéciale — la règle s&apos;applique selon les
                plages horaires uniquement.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {(form.specialDates ?? []).map((d, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={d}
                      onChange={(e) => updateSpecialDate(i, e.target.value)}
                      className="flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => removeSpecialDate(i)}
                      className="rounded-md p-2 text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)] hover:text-[color:var(--danger)]"
                      aria-label="Supprimer la date"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </fieldset>
      </div>
    </Modal>
  );
}
