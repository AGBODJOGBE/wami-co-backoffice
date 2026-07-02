"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Modal } from "@/shared/ui/modal";
import { Select } from "@/shared/ui/select";
import { Spinner } from "@/shared/ui/spinner";
import { Tabs } from "@/shared/ui/tabs";
import { Textarea } from "@/shared/ui/textarea";
import { toast } from "@/shared/ui/toast";
import {
  createReferralConfigAction,
  updateReferralConfigAction,
} from "../application/actions";
import { REFERRAL_TYPE_LABELS, type ReferralConfig } from "../domain/referral";

/* ─── constants ─────────────────────────────────────────────────────────── */

const PROFILE_TYPES = [
  "PASSENGER",
  "DRIVER_STANDARD",
  "DRIVER_PREMIUM",
  "DRIVER_VIP",
  "PARTNER",
] as const;

type ProfileType = (typeof PROFILE_TYPES)[number];

const ACTION_TYPES = ["RIDE", "TRANSACTION", "DELIVERY"] as const;

const PROFILE_OPTIONS = PROFILE_TYPES.map((t) => ({
  value: t,
  label: REFERRAL_TYPE_LABELS[t],
}));

const ACTION_OPTIONS = ACTION_TYPES.map((t) => ({
  value: t,
  label: t === "RIDE" ? "Course" : t === "TRANSACTION" ? "Transaction" : "Livraison",
}));

/* ─── types ──────────────────────────────────────────────────────────────── */

interface MatrixEntry {
  referrerType:   ProfileType;
  referredType:   ProfileType;
  rewardMode:     "FIXED" | "PERCENTAGE";
  referrerAmount: number;
  referredAmount: number;
  referrerCap:    number | null;
  referredCap:    number | null;
}

interface ConditionEntry {
  referredType:    ProfileType;
  actionsRequired: number;
  actionType:      "RIDE" | "TRANSACTION" | "DELIVERY";
}

interface LimitEntry {
  referredType: ProfileType;
  maxPerMonth:  number;
  maxPerDay:    number;
}

interface FormState {
  name:                    string;
  description:             string;
  rewardMatrix:            MatrixEntry[];
  validationConditions:    ConditionEntry[];
  expirationDays:          string;
  limits:                  LimitEntry[];
  maxReferralsPerDayGlobal: string;
}

/* ─── helpers ────────────────────────────────────────────────────────────── */

function buildDefaultMatrix(): MatrixEntry[] {
  const entries: MatrixEntry[] = [];
  for (const referrerType of PROFILE_TYPES) {
    for (const referredType of PROFILE_TYPES) {
      entries.push({
        referrerType,
        referredType,
        rewardMode:     "FIXED",
        referrerAmount: 0,
        referredAmount: 0,
        referrerCap:    null,
        referredCap:    null,
      });
    }
  }
  return entries;
}

function buildDefaultConditions(): ConditionEntry[] {
  return PROFILE_TYPES.map((t) => ({
    referredType:    t,
    actionsRequired: 1,
    actionType:      "RIDE",
  }));
}

function buildDefaultLimits(): LimitEntry[] {
  return PROFILE_TYPES.map((t) => ({
    referredType: t,
    maxPerMonth:  10,
    maxPerDay:    2,
  }));
}

function configToForm(config: ReferralConfig): FormState {
  return {
    name:        config.name,
    description: config.description ?? "",
    rewardMatrix: (config.rewardMatrix as MatrixEntry[]).length > 0
      ? (config.rewardMatrix as MatrixEntry[])
      : buildDefaultMatrix(),
    validationConditions: (config.validationConditions.perType as ConditionEntry[]).length > 0
      ? (config.validationConditions.perType as ConditionEntry[])
      : buildDefaultConditions(),
    expirationDays: config.validationConditions.expirationDays?.toString() ?? "",
    limits: (config.limits.perType as LimitEntry[]).length > 0
      ? (config.limits.perType as LimitEntry[])
      : buildDefaultLimits(),
    maxReferralsPerDayGlobal: config.limits.maxReferralsPerDayGlobal?.toString() ?? "",
  };
}

function buildPayload(form: FormState) {
  return {
    name:        form.name.trim(),
    description: form.description.trim() || null,
    rewardMatrix: form.rewardMatrix.map((e) => ({
      referrerType:   e.referrerType,
      referredType:   e.referredType,
      rewardMode:     e.rewardMode,
      referrerAmount: Number(e.referrerAmount),
      referredAmount: Number(e.referredAmount),
      referrerCap:    e.referrerCap !== null && e.referrerCap !== undefined && String(e.referrerCap) !== ""
        ? Number(e.referrerCap) : null,
      referredCap:    e.referredCap !== null && e.referredCap !== undefined && String(e.referredCap) !== ""
        ? Number(e.referredCap) : null,
    })),
    limits: {
      perType: form.limits.map((l) => ({
        referredType: l.referredType,
        maxPerMonth:  Number(l.maxPerMonth),
        maxPerDay:    Number(l.maxPerDay),
      })),
      maxReferralsPerDayGlobal: form.maxReferralsPerDayGlobal !== ""
        ? Number(form.maxReferralsPerDayGlobal) : null,
    },
    validationConditions: {
      perType: form.validationConditions.map((c) => ({
        referredType:    c.referredType,
        actionsRequired: Number(c.actionsRequired),
        actionType:      c.actionType,
      })),
      expirationDays: form.expirationDays !== "" ? Number(form.expirationDays) : null,
    },
  };
}

/* ─── component ──────────────────────────────────────────────────────────── */

export interface ReferralConfigFormModalProps {
  open:     boolean;
  onClose:  () => void;
  /** When provided → edit mode. When null → create mode. */
  config?:  ReferralConfig | null;
}

export function ReferralConfigFormModal({
  open,
  onClose,
  config = null,
}: ReferralConfigFormModalProps) {
  const isEdit = config !== null;

  const [form, setForm] = useState<FormState>(() =>
    config ? configToForm(config) : {
      name:                    "",
      description:             "",
      rewardMatrix:            buildDefaultMatrix(),
      validationConditions:    buildDefaultConditions(),
      expirationDays:          "",
      limits:                  buildDefaultLimits(),
      maxReferralsPerDayGlobal: "",
    },
  );

  const [saving, startSave] = useTransition();

  /* Reset form when modal reopens with a new config */
  const resetForm = (cfg: ReferralConfig | null) => {
    setForm(cfg ? configToForm(cfg) : {
      name: "", description: "",
      rewardMatrix: buildDefaultMatrix(),
      validationConditions: buildDefaultConditions(),
      expirationDays: "",
      limits: buildDefaultLimits(),
      maxReferralsPerDayGlobal: "",
    });
  };

  function handleClose() {
    onClose();
    resetForm(config);
  }

  function updateMatrix(index: number, field: keyof MatrixEntry, value: unknown) {
    setForm((prev) => {
      const next = [...prev.rewardMatrix];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, rewardMatrix: next };
    });
  }

  function updateCondition(index: number, field: keyof ConditionEntry, value: unknown) {
    setForm((prev) => {
      const next = [...prev.validationConditions];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, validationConditions: next };
    });
  }

  function updateLimit(index: number, field: keyof LimitEntry, value: unknown) {
    setForm((prev) => {
      const next = [...prev.limits];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, limits: next };
    });
  }

  function handleSubmit() {
    if (!form.name.trim()) {
      toast({ kind: "error", title: "Champ requis", description: "Le nom est obligatoire." });
      return;
    }
    const payload = buildPayload(form);
    startSave(async () => {
      const res = isEdit
        ? await updateReferralConfigAction(config!.id, payload)
        : await createReferralConfigAction(payload);
      if (res.ok) {
        toast({ kind: "success", title: isEdit ? "Configuration mise à jour" : "Configuration créée", description: res.message });
        handleClose();
      } else {
        toast({ kind: "error", title: "Erreur", description: res.message });
      }
    });
  }

  /* ── Tab 1: Informations générales ─────────────────────────────────────── */
  const tabGeneral = (
    <div className="flex flex-col gap-4">
      <Input
        label="Nom *"
        value={form.name}
        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
        placeholder="Ex : Programme Bénin 2025"
        required
      />
      <Textarea
        label="Description"
        value={form.description}
        onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
        placeholder="Description optionnelle…"
        className="min-h-20"
      />
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/20 dark:bg-amber-500/10">
        <div className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>
            La configuration est créée en état <strong>inactif</strong>. Tu devras l'activer manuellement.
            La matrice de récompenses doit couvrir toutes les <strong>25 combinaisons</strong> de types de profils.
          </p>
        </div>
      </div>
    </div>
  );

  /* ── Tab 2: Matrice de récompenses ──────────────────────────────────────── */
  const tabMatrix = (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-[color:var(--muted-foreground)]">
        Définissez les récompenses pour chaque combinaison parrain → filleul.
        En mode <strong>FIXE</strong> les montants sont en FCFA entiers.
        En mode <strong>%</strong> ce sont des pourcentages (0-100) de la transaction.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[color:var(--border)] bg-[color:var(--muted)]/50">
              <th className="px-2 py-2 text-left font-medium text-[color:var(--muted-foreground)]">Parrain →</th>
              <th className="px-2 py-2 text-left font-medium text-[color:var(--muted-foreground)]">Filleul ↓</th>
              <th className="px-2 py-2 text-left font-medium text-[color:var(--muted-foreground)]">Mode</th>
              <th className="px-2 py-2 text-right font-medium text-[color:var(--muted-foreground)]">Parrain reçoit</th>
              <th className="px-2 py-2 text-right font-medium text-[color:var(--muted-foreground)]">Filleul reçoit</th>
              <th className="px-2 py-2 text-right font-medium text-[color:var(--muted-foreground)]">Cap parrain</th>
              <th className="px-2 py-2 text-right font-medium text-[color:var(--muted-foreground)]">Cap filleul</th>
            </tr>
          </thead>
          <tbody>
            {form.rewardMatrix.map((entry, i) => {
              const isPct = entry.rewardMode === "PERCENTAGE";
              return (
                <tr key={i} className="border-b border-[color:var(--border)] last:border-0 hover:bg-[color:var(--muted)]/30">
                  <td className="px-2 py-1.5">
                    <span className="rounded bg-[color:var(--muted)] px-1.5 py-0.5 text-[10px] font-medium">
                      {REFERRAL_TYPE_LABELS[entry.referrerType]}
                    </span>
                  </td>
                  <td className="px-2 py-1.5">
                    <span className="rounded bg-[color:var(--primary-soft)] px-1.5 py-0.5 text-[10px] font-medium text-[color:var(--primary)]">
                      {REFERRAL_TYPE_LABELS[entry.referredType]}
                    </span>
                  </td>
                  <td className="px-2 py-1.5">
                    <select
                      value={entry.rewardMode}
                      onChange={(e) => updateMatrix(i, "rewardMode", e.target.value)}
                      className="h-7 rounded border border-[color:var(--border)] bg-[color:var(--background)] px-1 text-xs focus:outline-none focus:ring-1 focus:ring-[color:var(--primary)]"
                    >
                      <option value="FIXED">Fixe</option>
                      <option value="PERCENTAGE">%</option>
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center justify-end gap-1">
                      <input
                        type="number"
                        min={0}
                        max={isPct ? 100 : undefined}
                        step={isPct ? 0.5 : 1}
                        value={entry.referrerAmount}
                        onChange={(e) => updateMatrix(i, "referrerAmount", e.target.value)}
                        className="h-7 w-20 rounded border border-[color:var(--border)] bg-[color:var(--background)] px-2 text-right text-xs focus:outline-none focus:ring-1 focus:ring-[color:var(--primary)]"
                      />
                      <span className="text-[color:var(--muted-foreground)]">{isPct ? "%" : "F"}</span>
                    </div>
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center justify-end gap-1">
                      <input
                        type="number"
                        min={0}
                        max={isPct ? 100 : undefined}
                        step={isPct ? 0.5 : 1}
                        value={entry.referredAmount}
                        onChange={(e) => updateMatrix(i, "referredAmount", e.target.value)}
                        className="h-7 w-20 rounded border border-[color:var(--border)] bg-[color:var(--background)] px-2 text-right text-xs focus:outline-none focus:ring-1 focus:ring-[color:var(--primary)]"
                      />
                      <span className="text-[color:var(--muted-foreground)]">{isPct ? "%" : "F"}</span>
                    </div>
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      min={1}
                      step={1}
                      disabled={!isPct}
                      placeholder={isPct ? "optionnel" : "—"}
                      value={entry.referrerCap ?? ""}
                      onChange={(e) => updateMatrix(i, "referrerCap", e.target.value === "" ? null : Number(e.target.value))}
                      className="h-7 w-20 rounded border border-[color:var(--border)] bg-[color:var(--background)] px-2 text-right text-xs disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-[color:var(--primary)]"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      min={1}
                      step={1}
                      disabled={!isPct}
                      placeholder={isPct ? "optionnel" : "—"}
                      value={entry.referredCap ?? ""}
                      onChange={(e) => updateMatrix(i, "referredCap", e.target.value === "" ? null : Number(e.target.value))}
                      className="h-7 w-20 rounded border border-[color:var(--border)] bg-[color:var(--background)] px-2 text-right text-xs disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-[color:var(--primary)]"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  /* ── Tab 3: Conditions de validation ────────────────────────────────────── */
  const tabConditions = (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-[color:var(--muted-foreground)]">
        Nombre d'actions requises par le filleul avant que le parrainage soit validé automatiquement.
      </p>
      <div className="overflow-hidden rounded-lg border border-[color:var(--border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[color:var(--border)] bg-[color:var(--muted)]/50">
              <th className="px-3 py-2 text-left text-xs font-medium text-[color:var(--muted-foreground)]">Type filleul</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-[color:var(--muted-foreground)]">Type d'action</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-[color:var(--muted-foreground)]">Nb requis</th>
            </tr>
          </thead>
          <tbody>
            {form.validationConditions.map((cond, i) => (
              <tr key={i} className="border-b border-[color:var(--border)] last:border-0">
                <td className="px-3 py-2">
                  <span className="rounded bg-[color:var(--primary-soft)] px-2 py-0.5 text-xs font-medium text-[color:var(--primary)]">
                    {REFERRAL_TYPE_LABELS[cond.referredType]}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <select
                    value={cond.actionType}
                    onChange={(e) => updateCondition(i, "actionType", e.target.value)}
                    className="h-8 rounded border border-[color:var(--border)] bg-[color:var(--background)] px-2 text-sm focus:outline-none focus:ring-1 focus:ring-[color:var(--primary)]"
                  >
                    {ACTION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2 text-right">
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={cond.actionsRequired}
                    onChange={(e) => updateCondition(i, "actionsRequired", Number(e.target.value))}
                    className="h-8 w-20 rounded border border-[color:var(--border)] bg-[color:var(--background)] px-2 text-right text-sm focus:outline-none focus:ring-1 focus:ring-[color:var(--primary)]"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Input
        label="Expiration (jours)"
        type="number"
        min={1}
        step={1}
        value={form.expirationDays}
        onChange={(e) => setForm((p) => ({ ...p, expirationDays: e.target.value }))}
        placeholder="Ex : 30 (laisser vide = sans expiration)"
        hint="Nombre de jours avant qu'un parrainage en attente expire automatiquement."
      />
    </div>
  );

  /* ── Tab 4: Limites ──────────────────────────────────────────────────────── */
  const tabLimits = (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-lg border border-[color:var(--border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[color:var(--border)] bg-[color:var(--muted)]/50">
              <th className="px-3 py-2 text-left text-xs font-medium text-[color:var(--muted-foreground)]">Type filleul</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-[color:var(--muted-foreground)]">Max / jour</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-[color:var(--muted-foreground)]">Max / mois</th>
            </tr>
          </thead>
          <tbody>
            {form.limits.map((lim, i) => (
              <tr key={i} className="border-b border-[color:var(--border)] last:border-0">
                <td className="px-3 py-2">
                  <span className="rounded bg-[color:var(--muted)] px-2 py-0.5 text-xs font-medium">
                    {REFERRAL_TYPE_LABELS[lim.referredType]}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  <input
                    type="number" min={1} step={1}
                    value={lim.maxPerDay}
                    onChange={(e) => updateLimit(i, "maxPerDay", Number(e.target.value))}
                    className="h-8 w-20 rounded border border-[color:var(--border)] bg-[color:var(--background)] px-2 text-right text-sm focus:outline-none focus:ring-1 focus:ring-[color:var(--primary)]"
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <input
                    type="number" min={1} step={1}
                    value={lim.maxPerMonth}
                    onChange={(e) => updateLimit(i, "maxPerMonth", Number(e.target.value))}
                    className="h-8 w-20 rounded border border-[color:var(--border)] bg-[color:var(--background)] px-2 text-right text-sm focus:outline-none focus:ring-1 focus:ring-[color:var(--primary)]"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Input
        label="Limite globale (parrainages / jour)"
        type="number"
        min={1}
        step={1}
        value={form.maxReferralsPerDayGlobal}
        onChange={(e) => setForm((p) => ({ ...p, maxReferralsPerDayGlobal: e.target.value }))}
        placeholder="Ex : 500 (laisser vide = illimité)"
        hint="Limite totale tous types confondus."
      />
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isEdit ? `Modifier — ${config?.name}` : "Nouvelle configuration de parrainage"}
      description={isEdit ? "Modifiez les paramètres de cette configuration (inactive uniquement)." : "Définissez la matrice de récompenses, les conditions et les limites."}
      size="xl"
      footer={
        <>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Annuler
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving}>
            {saving ? <Spinner size="sm" /> : null}
            {isEdit ? "Enregistrer" : "Créer la configuration"}
          </Button>
        </>
      }
    >
      <Tabs
        defaultValue="general"
        tabs={[
          { value: "general",     label: "Général",           content: tabGeneral },
          { value: "matrix",      label: "Matrice (25)",       content: tabMatrix },
          { value: "conditions",  label: "Validation",         content: tabConditions },
          { value: "limits",      label: "Limites",            content: tabLimits },
        ]}
      />
    </Modal>
  );
}
