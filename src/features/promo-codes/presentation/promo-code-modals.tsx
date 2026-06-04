"use client";

import { useEffect, useState, useTransition } from "react";
import { CalendarClock, Info, Plus, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Combobox } from "@/shared/ui/combobox";
import { Input } from "@/shared/ui/input";
import { Modal } from "@/shared/ui/modal";
import { Spinner } from "@/shared/ui/spinner";
import { Textarea } from "@/shared/ui/textarea";
import { toast } from "@/shared/ui/toast";
import { formatDateTime } from "@/shared/lib/format";
import {
  createPromoCodeAction,
  validatePromoCodeAction,
  type ActionResult,
} from "../application/actions";
import {
  CAMPAIGN_TYPE_LABELS,
  CHANNEL_LABELS,
  CODE_TYPE_LABELS,
  DISCOUNT_TYPE_LABELS,
  FUNDED_BY_LABELS,
  OBJECTIVE_LABELS,
  TARGETING_LABELS,
  USER_TYPE_LABELS,
  VERTICAL_LABELS,
  defaultPromoCodeInput,
  type CampaignType,
  type Channel,
  type CodeType,
  type CreatePromoCodeInput,
  type DiscountType,
  type FundedBy,
  type Objective,
  type Targeting,
  type TimeWindow,
  type UserType,
  type ValidatePromoCodeInput,
  type ValidatePromoCodeResult,
  type ValidateVehicleType,
  type Vertical,
} from "../domain/promo-code";

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

const optsFromLabels = <T extends string>(labels: Record<T, string>) =>
  (Object.keys(labels) as T[]).map((v) => ({ value: v, label: labels[v] }));

const isoToLocalInput = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  // datetime-local expects "YYYY-MM-DDTHH:mm" without trailing Z
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const localInputToIso = (local: string) =>
  local ? new Date(local).toISOString() : "";

export interface PromoCodeCreateModalProps {
  open: boolean;
  onClose: () => void;
}

export function PromoCodeCreateModal({
  open,
  onClose,
}: PromoCodeCreateModalProps) {
  const [form, setForm] = useState<CreatePromoCodeInput>(
    defaultPromoCodeInput(),
  );
  const [pending, start] = useTransition();
  const [zonesInput, setZonesInput] = useState("");
  const [vehiclesInput, setVehiclesInput] = useState("");
  const [userIdsInput, setUserIdsInput] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm(defaultPromoCodeInput());
    setZonesInput("");
    setVehiclesInput("");
    setUserIdsInput("");
  }, [open]);

  function set<K extends keyof CreatePromoCodeInput>(
    key: K,
    value: CreatePromoCodeInput[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function addTimeWindow() {
    set("timeWindows", [
      ...(form.timeWindows ?? []),
      { startHour: 0, endHour: 23 },
    ]);
  }
  function updateTimeWindow(i: number, patch: Partial<TimeWindow>) {
    const next = [...(form.timeWindows ?? [])];
    next[i] = { ...next[i], ...patch };
    set("timeWindows", next);
  }
  function removeTimeWindow(i: number) {
    set(
      "timeWindows",
      (form.timeWindows ?? []).filter((_, idx) => idx !== i),
    );
  }

  function commitListInputs(): CreatePromoCodeInput {
    const split = (s: string) =>
      s
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
    return {
      ...form,
      targetZones: zonesInput ? split(zonesInput) : form.targetZones ?? [],
      vehicleTypes: vehiclesInput
        ? split(vehiclesInput).map((v) => v.toUpperCase())
        : form.vehicleTypes ?? [],
      targetUserIds: userIdsInput ? split(userIdsInput) : form.targetUserIds ?? [],
    };
  }

  function handleSubmit() {
    const final = commitListInputs();
    if (!final.code || !final.campaignName || !final.displayText) {
      toast({
        kind: "error",
        title: "Champs requis",
        description: "Code, nom de campagne et texte d'affichage sont obligatoires.",
      });
      return;
    }
    if (new Date(final.startDate) >= new Date(final.endDate)) {
      toast({
        kind: "error",
        title: "Dates incohérentes",
        description: "La date de fin doit être postérieure au début.",
      });
      return;
    }
    start(async () => {
      const r = await createPromoCodeAction(final);
      notify(r, "Code promo créé");
      if (r.ok) onClose();
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Nouveau code promo"
      description="Remplis chaque section, puis enregistre. Les champs * sont obligatoires."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} isLoading={pending}>
            {pending ? "Création en cours…" : "Créer le code"}
          </Button>
        </>
      }
    >
      <div className="relative flex flex-col gap-6">
        {pending ? (
          <div
            aria-live="polite"
            className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-[color:var(--background)]/70 backdrop-blur-sm"
          >
            <Spinner size="lg" label="Création en cours…" />
          </div>
        ) : null}
        <fieldset disabled={pending} className="flex flex-col gap-6">
        <Section title="1. Identité de la campagne">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Code *"
              value={form.code}
              onChange={(e) => set("code", e.target.value.toUpperCase())}
              placeholder="4U300"
              required
            />
            <Input
              label="Nom de la campagne *"
              value={form.campaignName}
              onChange={(e) => set("campaignName", e.target.value)}
              placeholder="Promo Noël 2025"
              required
            />
            <Combobox
              label="Vertical *"
              options={optsFromLabels(VERTICAL_LABELS)}
              value={form.vertical}
              onChange={(v) => set("vertical", v as Vertical)}
              required
            />
            <Combobox
              label="Type de campagne *"
              options={optsFromLabels(CAMPAIGN_TYPE_LABELS)}
              value={form.campaignType}
              onChange={(v) => set("campaignType", v as CampaignType)}
              required
            />
            <Combobox
              label="Objectif *"
              options={optsFromLabels(OBJECTIVE_LABELS)}
              value={form.objective}
              onChange={(v) => set("objective", v as Objective)}
              required
            />
            <Combobox
              label="Canal *"
              options={optsFromLabels(CHANNEL_LABELS)}
              value={form.channel}
              onChange={(v) => set("channel", v as Channel)}
              required
            />
            <Combobox
              label="Type de code *"
              options={optsFromLabels(CODE_TYPE_LABELS)}
              value={form.codeType}
              onChange={(v) => set("codeType", v as CodeType)}
              required
            />
            <Combobox
              label="Cible *"
              options={optsFromLabels(TARGETING_LABELS)}
              value={form.targeting}
              onChange={(v) => set("targeting", v as Targeting)}
              required
            />
          </div>
        </Section>

        <Section title="2. Réduction">
          <div className="grid gap-4 sm:grid-cols-3">
            <Combobox
              label="Type *"
              options={optsFromLabels(DISCOUNT_TYPE_LABELS)}
              value={form.discountType}
              onChange={(v) => set("discountType", v as DiscountType)}
              required
            />
            <Input
              label="Valeur *"
              type="number"
              min={0}
              value={form.discountValue}
              onChange={(e) => set("discountValue", Number(e.target.value))}
              hint={
                form.discountType === "PERCENTAGE"
                  ? "%"
                  : form.discountType === "FREE_RIDE"
                    ? "ignoré pour course offerte"
                    : "FCFA"
              }
            />
            <Input
              label="Réduction max (FCFA)"
              type="number"
              min={0}
              value={form.maxDiscountAmount ?? ""}
              onChange={(e) =>
                set(
                  "maxDiscountAmount",
                  e.target.value ? Number(e.target.value) : null,
                )
              }
              hint="Plafond optionnel pour PERCENTAGE"
            />
          </div>
        </Section>

        <Section title="3. Période">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Début *"
              type="datetime-local"
              value={isoToLocalInput(form.startDate)}
              onChange={(e) => set("startDate", localInputToIso(e.target.value))}
              required
            />
            <Input
              label="Fin *"
              type="datetime-local"
              value={isoToLocalInput(form.endDate)}
              onChange={(e) => set("endDate", localInputToIso(e.target.value))}
              required
            />
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[color:var(--foreground)]">
                Plages horaires
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={addTimeWindow}
              >
                <Plus className="size-4" />
                Ajouter une plage
              </Button>
            </div>
            {(form.timeWindows ?? []).map((w, i) => (
              <div key={i} className="flex items-center gap-3">
                <Input
                  type="number"
                  min={0}
                  max={23}
                  value={w.startHour}
                  onChange={(e) =>
                    updateTimeWindow(i, { startHour: Number(e.target.value) })
                  }
                  className="w-20"
                />
                <span className="text-sm text-[color:var(--muted-foreground)]">
                  →
                </span>
                <Input
                  type="number"
                  min={0}
                  max={23}
                  value={w.endHour}
                  onChange={(e) =>
                    updateTimeWindow(i, { endHour: Number(e.target.value) })
                  }
                  className="w-20"
                />
                <button
                  type="button"
                  onClick={() => removeTimeWindow(i)}
                  className="rounded-md p-1.5 text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)] hover:text-[color:var(--danger)]"
                  aria-label="Supprimer la plage"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </Section>

        <Section title="4. Limites & seuils">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Usages max (total)"
              type="number"
              min={0}
              value={form.maxTotalUsages ?? ""}
              onChange={(e) =>
                set("maxTotalUsages", e.target.value ? Number(e.target.value) : null)
              }
            />
            <Input
              label="Usages max / utilisateur"
              type="number"
              min={0}
              value={form.maxUsagesPerUser ?? ""}
              onChange={(e) =>
                set("maxUsagesPerUser", e.target.value ? Number(e.target.value) : null)
              }
            />
            <Input
              label="Montant min commande (FCFA)"
              type="number"
              min={0}
              value={form.minOrderAmount ?? ""}
              onChange={(e) =>
                set("minOrderAmount", e.target.value ? Number(e.target.value) : null)
              }
            />
            <Input
              label="Numéro d'usage"
              type="number"
              min={1}
              value={form.usageNumber ?? ""}
              onChange={(e) =>
                set("usageNumber", e.target.value ? Number(e.target.value) : null)
              }
              hint="Quel passage applicable (ex. 1ʳᵉ course)"
            />
          </div>
        </Section>

        <Section title="5. Ciblage">
          <div className="grid gap-4 sm:grid-cols-2">
            <Combobox
              label="Type d'utilisateur"
              options={optsFromLabels(USER_TYPE_LABELS)}
              value={form.userType ?? "ALL"}
              onChange={(v) => set("userType", v as UserType)}
            />
            <Input
              label="Zones (séparées par des virgules)"
              value={zonesInput || (form.targetZones ?? []).join(", ")}
              onChange={(e) => setZonesInput(e.target.value)}
              placeholder="Cotonou, Calavi"
            />
            <Input
              label="Types de véhicules (virgules)"
              value={vehiclesInput || (form.vehicleTypes ?? []).join(", ")}
              onChange={(e) => setVehiclesInput(e.target.value)}
              placeholder="MOTO, STANDARD"
              className="sm:col-span-2"
            />
            <Textarea
              label="IDs utilisateurs ciblés (CSV / SEGMENT)"
              value={userIdsInput || (form.targetUserIds ?? []).join(", ")}
              onChange={(e) => setUserIdsInput(e.target.value)}
              placeholder="uuid1, uuid2, uuid3"
              rows={2}
              className="sm:col-span-2"
            />
          </div>
        </Section>

        <Section title="6. Financement">
          <div className="grid gap-4 sm:grid-cols-2">
            <Combobox
              label="Financé par *"
              options={optsFromLabels(FUNDED_BY_LABELS)}
              value={form.fundedBy}
              onChange={(v) => set("fundedBy", v as FundedBy)}
              required
            />
            <Input
              label="Sponsor ID"
              value={form.sponsorId ?? ""}
              onChange={(e) => set("sponsorId", e.target.value || null)}
              placeholder="(optionnel si fundedBy = PARTNER)"
            />
            <Input
              label="Budget sponsorisé (FCFA)"
              type="number"
              min={0}
              value={form.sponsoredBudget ?? ""}
              onChange={(e) =>
                set(
                  "sponsoredBudget",
                  e.target.value ? Number(e.target.value) : null,
                )
              }
            />
            <Input
              label="Limite quotidienne (FCFA)"
              type="number"
              min={0}
              value={form.dailySpendingLimit ?? ""}
              onChange={(e) =>
                set(
                  "dailySpendingLimit",
                  e.target.value ? Number(e.target.value) : null,
                )
              }
            />
          </div>
        </Section>

        <Section title="7. Affichage & activation">
          <Textarea
            label="Texte d'affichage *"
            value={form.displayText}
            onChange={(e) => set("displayText", e.target.value)}
            placeholder="-20% sur vos 3 prochaines courses"
            rows={2}
            required
          />

          <div className="mt-4 flex flex-col gap-3">
            <span className="text-sm font-medium text-[color:var(--foreground)]">
              Mode de démarrage
            </span>
            <div className="grid gap-2 sm:grid-cols-2">
              <RadioOption
                label="Activer immédiatement"
                description="Le code est utilisable dès la date de début saisie."
                checked={!form.isScheduled && (form.isActive ?? false)}
                onChange={() => {
                  set("isScheduled", false);
                  set("isActive", true);
                }}
              />
              <RadioOption
                label="Programmer le démarrage"
                description="Le code restera inactif jusqu'à la date de début."
                checked={form.isScheduled ?? false}
                onChange={() => {
                  set("isScheduled", true);
                  set("isActive", false);
                }}
              />
            </div>
            {form.isScheduled ? (
              <div className="flex items-start gap-2 rounded-md border border-[color:var(--warning)]/30 bg-[color:var(--warning)]/10 px-3 py-2 text-xs text-[color:var(--warning)]">
                <CalendarClock className="mt-0.5 size-4 shrink-0" />
                <p>
                  Programmé : le code sera activé automatiquement le{" "}
                  <strong>{formatDateTime(form.startDate)}</strong>. Vérifie la
                  section <em>3. Période</em> et règle <em>Début</em> sur la
                  date de démarrage souhaitée.
                </p>
              </div>
            ) : null}
            {!form.isScheduled && !(form.isActive ?? false) ? (
              <div className="flex items-start gap-2 rounded-md border border-[color:var(--border)] bg-[color:var(--muted)]/40 px-3 py-2 text-xs text-[color:var(--muted-foreground)]">
                <Info className="mt-0.5 size-4 shrink-0" />
                <p>
                  Le code sera créé en état <strong>désactivé</strong>. Tu
                  pourras l&apos;activer manuellement depuis la liste.
                </p>
              </div>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap gap-6 border-t border-[color:var(--border)] pt-4">
            <CheckboxRow
              label="Notification push aux utilisateurs ciblés"
              checked={form.isPushed ?? false}
              onChange={(v) => set("isPushed", v)}
            />
          </div>
        </Section>
        </fieldset>
      </div>
    </Modal>
  );
}

function RadioOption({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-pressed={checked}
      className={
        "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition " +
        (checked
          ? "border-[color:var(--primary)] bg-[color:var(--primary-soft)]/30"
          : "border-[color:var(--border)] hover:bg-[color:var(--muted)]/40")
      }
    >
      <span className="flex items-center gap-2 text-sm font-medium text-[color:var(--foreground)]">
        <span
          className={
            "flex size-4 shrink-0 items-center justify-center rounded-full border " +
            (checked
              ? "border-[color:var(--primary)] bg-[color:var(--primary)]"
              : "border-[color:var(--border)]")
          }
        >
          {checked ? (
            <span className="size-1.5 rounded-full bg-white" />
          ) : null}
        </span>
        {label}
      </span>
      <span className="pl-6 text-xs text-[color:var(--muted-foreground)]">
        {description}
      </span>
    </button>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] p-4">
      <h3 className="mb-3 text-sm font-semibold text-[color:var(--foreground)]">
        {title}
      </h3>
      {children}
    </section>
  );
}

function CheckboxRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-[color:var(--foreground)]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 rounded border-[color:var(--border)] text-[color:var(--primary)] focus:ring-[color:var(--primary)]"
      />
      {label}
    </label>
  );
}

const VEHICLE_TYPES_VALIDATE: ValidateVehicleType[] = [
  "MOTO",
  "STANDARD",
  "CONFORT",
  "VAN",
];

export interface PromoCodeValidateModalProps {
  open: boolean;
  onClose: () => void;
}

export function PromoCodeValidateModal({
  open,
  onClose,
}: PromoCodeValidateModalProps) {
  const [form, setForm] = useState<ValidatePromoCodeInput>({
    code: "",
    orderAmount: 3000,
    vehicleType: "STANDARD",
    pickupZone: "",
  });
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ValidatePromoCodeResult | null>(null);

  useEffect(() => {
    if (open) {
      setForm({ code: "", orderAmount: 3000, vehicleType: "STANDARD", pickupZone: "" });
      setResult(null);
    }
  }, [open]);

  function submit() {
    if (!form.code) {
      toast({
        kind: "error",
        title: "Code requis",
        description: "Saisis un code à tester.",
      });
      return;
    }
    start(async () => {
      const r = await validatePromoCodeAction({
        ...form,
        pickupZone: form.pickupZone || undefined,
      });
      if (r.ok && r.data) {
        setResult(r.data);
        toast({
          kind: "success",
          title: "Code valide",
          description: `Réduction ${r.data.discountAmount.toLocaleString("fr-FR")} FCFA`,
        });
      } else {
        setResult(null);
        toast({ kind: "error", title: "Échec", description: r.message });
      }
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tester un code promo"
      description="Simule l'application d'un code sur une course."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Fermer
          </Button>
          <Button onClick={submit} isLoading={pending}>
            Tester
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Code"
          value={form.code}
          onChange={(e) =>
            setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
          }
          required
        />
        <Combobox
          label="Type de véhicule"
          options={VEHICLE_TYPES_VALIDATE.map((v) => ({ value: v, label: v }))}
          value={form.vehicleType}
          onChange={(v) =>
            setForm((f) => ({ ...f, vehicleType: v as ValidateVehicleType }))
          }
          required
        />
        <Input
          label="Montant commande (FCFA)"
          type="number"
          min={0}
          value={form.orderAmount}
          onChange={(e) =>
            setForm((f) => ({ ...f, orderAmount: Number(e.target.value) }))
          }
        />
        <Input
          label="Zone pickup"
          value={form.pickupZone ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, pickupZone: e.target.value }))}
          placeholder="Cotonou (optionnel)"
        />
      </div>

      {result ? (
        <div className="mt-4 rounded-md border border-[color:var(--success)]/40 bg-[color:var(--success)]/10 p-4 text-sm text-[color:var(--success)]">
          <div className="flex justify-between">
            <span>Réduction</span>
            <span className="font-semibold">
              {result.discountAmount.toLocaleString("fr-FR")} FCFA
            </span>
          </div>
          <div className="mt-1 flex justify-between">
            <span>Montant final</span>
            <span className="font-semibold">
              {result.finalAmount.toLocaleString("fr-FR")} FCFA
            </span>
          </div>
          <p className="mt-2 text-xs italic">{result.displayText}</p>
        </div>
      ) : null}
    </Modal>
  );
}
