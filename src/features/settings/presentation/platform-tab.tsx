"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock, Gift, Pencil, RefreshCw, Settings, Smartphone } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Modal } from "@/shared/ui/modal";
import { Spinner } from "@/shared/ui/spinner";
import { Textarea } from "@/shared/ui/textarea";
import { toast } from "@/shared/ui/toast";
import { formatDate } from "@/shared/lib/format";
import { upsertAppConfigAction, updateSystemConfigAction, configureWelcomeBonusCampaignAction } from "../application/actions";
import { CanView } from "@/shared/ui/can-view";
import type { AppVersionConfig } from "../domain/admin-user";
import type { SystemConfigEntry, WelcomeBonusCampaign } from "../application/api";

// ─── Constants ────────────────────────────────────────────────────────────────

const APP_TYPE_LABELS: Record<string, string> = {
  DRIVER: "Driver",
  PASSENGER: "Passager",
};

const PLATFORM_TONE: Record<string, "success" | "info"> = {
  ANDROID: "success",
  IOS: "info",
};

// ─── Edit modal ───────────────────────────────────────────────────────────────

interface EditForm {
  latestVersion: string;
  minSupportedVersion: string;
  downloadUrl: string;
  releaseNotes: string;
}

function EditConfigModal({
  open,
  onClose,
  config,
}: {
  open: boolean;
  onClose: () => void;
  config: AppVersionConfig | null;
}) {
  const [form, setForm] = useState<EditForm>({
    latestVersion: "",
    minSupportedVersion: "",
    downloadUrl: "",
    releaseNotes: "",
  });
  const [pending, start] = useTransition();

  // Populate form when config changes
  useEffect(() => {
    if (config) {
      setForm({
        latestVersion: config.latestVersion,
        minSupportedVersion: config.minSupportedVersion,
        downloadUrl: config.downloadUrl,
        releaseNotes: config.releaseNotes ?? "",
      });
    }
  }, [config]);

  function set<K extends keyof EditForm>(k: K, v: EditForm[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function validate(v: string) {
    return /^\d+\.\d+\.\d+$/.test(v.trim());
  }

  function submit() {
    if (!config) return;
    if (!validate(form.latestVersion)) {
      toast({ kind: "error", title: "Version invalide", description: "Format attendu : X.Y.Z (ex: 1.2.0)" });
      return;
    }
    if (!validate(form.minSupportedVersion)) {
      toast({ kind: "error", title: "Version min. invalide", description: "Format attendu : X.Y.Z (ex: 1.0.0)" });
      return;
    }
    if (!form.downloadUrl.trim()) {
      toast({ kind: "error", title: "URL de téléchargement requise" });
      return;
    }
    start(async () => {
      const r = await upsertAppConfigAction(config.appType, config.platform, {
        latestVersion: form.latestVersion.trim(),
        minSupportedVersion: form.minSupportedVersion.trim(),
        downloadUrl: form.downloadUrl.trim(),
        releaseNotes: form.releaseNotes.trim() || undefined,
      });
      if (r.ok) {
        toast({ kind: "success", title: "Configuration mise à jour", description: r.message });
        onClose();
      } else {
        toast({ kind: "error", title: "Échec", description: r.message });
      }
    });
  }

  const title = config
    ? `${APP_TYPE_LABELS[config.appType] ?? config.appType} · ${config.platform}`
    : "";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Modifier la configuration — ${title}`}
      description="Met à jour les versions et l'URL de téléchargement de l'application."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>Annuler</Button>
          <Button onClick={submit} isLoading={pending}>
            {pending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Version actuelle *"
            value={form.latestVersion}
            onChange={(e) => set("latestVersion", e.target.value)}
            placeholder="1.2.0"
            hint="Format X.Y.Z"
            required
          />
          <Input
            label="Version min. supportée *"
            value={form.minSupportedVersion}
            onChange={(e) => set("minSupportedVersion", e.target.value)}
            placeholder="1.0.0"
            hint="Format X.Y.Z"
            required
          />
        </div>
        <Input
          label="URL de téléchargement *"
          value={form.downloadUrl}
          onChange={(e) => set("downloadUrl", e.target.value)}
          placeholder="https://play.google.com/store/..."
          required
        />
        <Textarea
          label="Notes de version"
          value={form.releaseNotes}
          onChange={(e) => set("releaseNotes", e.target.value)}
          placeholder="Résumé des changements…"
          rows={3}
        />
      </div>
    </Modal>
  );
}

// ─── Tolerance inline edit ────────────────────────────────────────────────────

function ToleranceCard({
  initialDays,
  updatedAt,
}: {
  initialDays: number;
  updatedAt?: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<number | "">(initialDays);
  const [pending, start] = useTransition();

  function save() {
    const n = Number(value);
    if (!n || n < 1 || n > 30) {
      toast({
        kind: "error",
        title: "Valeur invalide",
        description: "La tolérance doit être comprise entre 1 et 30 jours.",
      });
      return;
    }
    start(async () => {
      const r = await updateSystemConfigAction("PAYMENT_TOLERANCE_DAYS", String(n));
      if (r.ok) {
        toast({ kind: "success", title: "Tolérance mise à jour", description: r.message });
        setEditing(false);
        router.refresh();
      } else {
        toast({ kind: "error", title: "Échec", description: r.message });
      }
    });
  }

  function cancel() {
    setValue(initialDays);
    setEditing(false);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="size-5 text-amber-500" />
          <CardTitle>Paramètres des contrats location-vente</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-[color:var(--muted-foreground)]">
            Ces valeurs sont lues en temps réel par le worker de traitement des
            échéances. Un changement est appliqué dès le prochain cycle.
          </p>

          <div className="flex flex-wrap items-end gap-4 rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)]/20 p-4">
            <div className="flex flex-1 flex-col gap-1">
              <span className="text-xs font-medium text-[color:var(--foreground)]">
                Tolérance de paiement
              </span>
              <span className="text-[11px] text-[color:var(--muted-foreground)]">
                Nombre de jours après la date d'échéance avant passage en
                statut IMPAYÉE et blocage du chauffeur.
              </span>
              {updatedAt && (
                <span className="text-[10px] text-[color:var(--muted-foreground)]">
                  Modifié le {formatDate(updatedAt)}
                </span>
              )}
            </div>

            {editing ? (
              <div className="flex shrink-0 items-center gap-2">
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={30}
                  value={value === "" ? "" : value}
                  onChange={(e) =>
                    setValue(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  hint="1 – 30 jours"
                  className="w-28"
                />
                <Button size="sm" onClick={save} isLoading={pending}>
                  Enregistrer
                </Button>
                <Button size="sm" variant="ghost" onClick={cancel} disabled={pending}>
                  Annuler
                </Button>
              </div>
            ) : (
              <div className="flex shrink-0 items-center gap-3">
                <span className="font-mono text-2xl font-bold text-[color:var(--foreground)]">
                  {initialDays}
                  <span className="ml-1 text-sm font-normal text-[color:var(--muted-foreground)]">
                    jour{initialDays > 1 ? "s" : ""}
                  </span>
                </span>
                <CanView permission="app_config.manage">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setValue(initialDays); setEditing(true); }}
                  >
                    <Pencil className="size-3.5" />
                    Modifier
                  </Button>
                </CanView>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Welcome bonus card ───────────────────────────────────────────────────────

interface WelcomeBonusForm {
  bonusAmountFcfa: number | "";
  maxEligibleDrivers: number | "";
  isActive: boolean;
}

function WelcomeBonusCard({ campaign }: { campaign: WelcomeBonusCampaign | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const [form, setForm] = useState<WelcomeBonusForm>({
    bonusAmountFcfa: campaign?.bonusAmountFcfa ?? 1000,
    maxEligibleDrivers: campaign?.maxEligibleDrivers ?? 0,
    isActive: campaign?.isActive ?? false,
  });

  function openEdit() {
    setForm({
      bonusAmountFcfa: campaign?.bonusAmountFcfa ?? 1000,
      maxEligibleDrivers: campaign?.maxEligibleDrivers ?? 0,
      isActive: campaign?.isActive ?? false,
    });
    setEditing(true);
  }

  function save() {
    const amount = Number(form.bonusAmountFcfa);
    const quota = Number(form.maxEligibleDrivers);
    if (!amount || amount < 1) {
      toast({ kind: "error", title: "Montant invalide", description: "Le montant doit être supérieur à 0 FCFA." });
      return;
    }
    if (quota < 0 || !Number.isInteger(quota)) {
      toast({ kind: "error", title: "Quota invalide", description: "Le quota doit être un entier ≥ 0." });
      return;
    }
    if (campaign && quota < campaign.consumedCount) {
      toast({
        kind: "error",
        title: "Quota trop bas",
        description: `${campaign.consumedCount} bonus déjà accordés — le quota ne peut pas descendre en dessous.`,
      });
      return;
    }
    start(async () => {
      const r = await configureWelcomeBonusCampaignAction({
        bonusAmountFcfa: amount,
        maxEligibleDrivers: quota,
        isActive: form.isActive,
      });
      if (r.ok) {
        toast({ kind: "success", title: "Campagne mise à jour", description: r.message });
        setEditing(false);
        router.refresh();
      } else {
        toast({ kind: "error", title: "Échec", description: r.message });
      }
    });
  }

  const consumed = campaign?.consumedCount ?? 0;
  const maxQuota = campaign?.maxEligibleDrivers ?? 0;
  const remaining = campaign?.remainingSlots ?? 0;
  const pct = maxQuota > 0 ? Math.min(100, Math.round((consumed / maxQuota) * 100)) : 0;
  const isActive = campaign?.isActive ?? false;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Gift className="size-5 text-violet-500" />
            <CardTitle>Bonus de bienvenue driver</CardTitle>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              isActive
                ? "bg-emerald-100 text-emerald-700"
                : "bg-[color:var(--muted)] text-[color:var(--muted-foreground)]"
            }`}
          >
            {isActive ? "Actif" : "Inactif"}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-5">
          <p className="text-sm text-[color:var(--muted-foreground)]">
            Campagne one-shot : chaque nouveau chauffeur approuvé reçoit ce bonus une seule fois,
            dans la limite du quota global.
          </p>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-0.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)]/20 p-3">
              <span className="text-[11px] text-[color:var(--muted-foreground)]">Montant</span>
              <span className="font-mono text-lg font-bold text-[color:var(--foreground)]">
                {(campaign?.bonusAmountFcfa ?? 0).toLocaleString("fr-FR")}
                <span className="ml-1 text-xs font-normal text-[color:var(--muted-foreground)]">FCFA</span>
              </span>
            </div>
            <div className="flex flex-col gap-0.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)]/20 p-3">
              <span className="text-[11px] text-[color:var(--muted-foreground)]">Accordés</span>
              <span className="font-mono text-lg font-bold text-[color:var(--foreground)]">
                {consumed}
                <span className="ml-1 text-xs font-normal text-[color:var(--muted-foreground)]">/ {maxQuota}</span>
              </span>
            </div>
            <div className="flex flex-col gap-0.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)]/20 p-3">
              <span className="text-[11px] text-[color:var(--muted-foreground)]">Restants</span>
              <span className="font-mono text-lg font-bold text-[color:var(--foreground)]">
                {remaining}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          {maxQuota > 0 && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px] text-[color:var(--muted-foreground)]">
                <span>Utilisation du quota</span>
                <span>{pct}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[color:var(--muted)]">
                <div
                  className={`h-full rounded-full transition-all ${pct >= 90 ? "bg-[color:var(--danger)]" : pct >= 60 ? "bg-amber-500" : "bg-emerald-500"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}

          {campaign?.updatedAt && (
            <p className="text-[10px] text-[color:var(--muted-foreground)]">
              Modifié le {formatDate(campaign.updatedAt)}
            </p>
          )}

          {/* Edit form */}
          {editing ? (
            <div className="flex flex-col gap-4 rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)]/10 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Montant du bonus (FCFA) *"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={form.bonusAmountFcfa === "" ? "" : form.bonusAmountFcfa}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, bonusAmountFcfa: e.target.value === "" ? "" : Number(e.target.value) }))
                  }
                  hint="Entier > 0"
                />
                <Input
                  label="Quota global (nbre de chauffeurs)"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={form.maxEligibleDrivers === "" ? "" : form.maxEligibleDrivers}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, maxEligibleDrivers: e.target.value === "" ? "" : Number(e.target.value) }))
                  }
                  hint={campaign ? `Min : ${campaign.consumedCount} (déjà accordés)` : "0 = illimité"}
                />
              </div>
              <label className="flex cursor-pointer items-center gap-3">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  />
                  <div className={`h-5 w-9 rounded-full transition-colors ${form.isActive ? "bg-emerald-500" : "bg-[color:var(--muted)]"}`} />
                  <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${form.isActive ? "translate-x-4" : "translate-x-0.5"}`} />
                </div>
                <span className="text-sm text-[color:var(--foreground)]">Campagne active</span>
              </label>
              <div className="flex gap-2">
                <Button size="sm" onClick={save} isLoading={pending}>Enregistrer</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={pending}>Annuler</Button>
              </div>
            </div>
          ) : (
            <div>
              <CanView permission="driver.welcome_bonus.manage">
                <Button variant="outline" size="sm" onClick={openEdit}>
                  <Pencil className="size-3.5" />
                  Configurer la campagne
                </Button>
              </CanView>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── System config card ───────────────────────────────────────────────────────

const CONFIG_TYPE_TONE: Record<string, "primary" | "info" | "warning" | "neutral" | "success"> = {
  STRING: "neutral",
  INTEGER: "primary",
  FLOAT: "info",
  BOOLEAN: "success",
  ENUM: "warning",
};

function SystemConfigRow({ entry }: { entry: SystemConfigEntry }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(entry.value);
  const [pending, start] = useTransition();

  function save() {
    start(async () => {
      const r = await updateSystemConfigAction(entry.key, value);
      if (r.ok) {
        toast({ kind: "success", title: "Paramètre mis à jour", description: r.message });
        setEditing(false);
        router.refresh();
      } else {
        toast({ kind: "error", title: "Échec", description: r.message });
      }
    });
  }

  function openEdit() {
    setValue(entry.value);
    setEditing(true);
  }

  const isBoolean = entry.type === "BOOLEAN";
  const isNumeric = entry.type === "INTEGER" || entry.type === "FLOAT";

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)]/10 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-semibold text-[color:var(--foreground)]">{entry.key}</span>
            <Badge tone={CONFIG_TYPE_TONE[entry.type] ?? "neutral"}>
              {entry.type}
            </Badge>
          </div>
          {entry.description && (
            <span className="text-[10px] text-[color:var(--muted-foreground)]">{entry.description}</span>
          )}
          {entry.updatedAt && (
            <span className="text-[9px] text-[color:var(--muted-foreground)]">
              Modifié {formatDate(entry.updatedAt)}
              {entry.updatedBy ? ` par ${entry.updatedBy}` : ""}
              {entry.version != null ? ` · v${entry.version}` : ""}
            </span>
          )}
        </div>

        {!editing && (
          <div className="flex shrink-0 items-center gap-2">
            <span className="font-mono text-sm font-bold text-[color:var(--foreground)]">
              {isBoolean ? (entry.value === "true" ? "Oui" : "Non") : entry.value}
            </span>
            <CanView permission="app_config.manage">
              <Button variant="outline" size="sm" onClick={openEdit}>
                <Pencil className="size-3" />
                Modifier
              </Button>
            </CanView>
          </div>
        )}
      </div>

      {editing && (
        <div className="flex flex-wrap items-center gap-2 border-t border-[color:var(--border)] pt-2">
          {isBoolean ? (
            <label className="flex cursor-pointer items-center gap-2">
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={value === "true"}
                  onChange={(e) => setValue(e.target.checked ? "true" : "false")}
                />
                <div className={`h-5 w-9 rounded-full transition-colors ${value === "true" ? "bg-emerald-500" : "bg-[color:var(--muted)]"}`} />
                <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${value === "true" ? "translate-x-4" : "translate-x-0.5"}`} />
              </div>
              <span className="text-sm">{value === "true" ? "Activé" : "Désactivé"}</span>
            </label>
          ) : (
            <Input
              type={isNumeric ? "number" : "text"}
              step={entry.type === "FLOAT" ? "0.01" : undefined}
              inputMode={isNumeric ? "decimal" : undefined}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-44"
            />
          )}
          <Button size="sm" onClick={save} isLoading={pending}>Enregistrer</Button>
          <Button size="sm" variant="ghost" onClick={() => { setValue(entry.value); setEditing(false); }} disabled={pending}>
            Annuler
          </Button>
        </div>
      )}
    </div>
  );
}

function SystemConfigsCard({ configs }: { configs: SystemConfigEntry[] }) {
  const [search, setSearch] = useState("");

  if (configs.length === 0) return null;

  const filtered = search
    ? configs.filter(
        (c) =>
          c.key.toLowerCase().includes(search.toLowerCase()) ||
          (c.description ?? "").toLowerCase().includes(search.toLowerCase()),
      )
    : configs;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Settings className="size-5 text-[color:var(--primary)]" />
            <CardTitle>Paramètres système</CardTitle>
            <Badge tone="neutral">{configs.length}</Badge>
          </div>
          <Input
            placeholder="Filtrer par clé ou description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56"
          />
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <p className="text-sm text-[color:var(--muted-foreground)]">Aucun paramètre trouvé.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((entry) => (
              <SystemConfigRow key={entry.key} entry={entry} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

export interface PlatformTabProps {
  configs: AppVersionConfig[];
  error?: string;
  toleranceConfig?: SystemConfigEntry | null;
  welcomeBonus?: WelcomeBonusCampaign | null;
  systemConfigs?: SystemConfigEntry[];
}

export function PlatformTab({ configs, error, toleranceConfig, welcomeBonus, systemConfigs = [] }: PlatformTabProps) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [editTarget, setEditTarget] = useState<AppVersionConfig | null>(null);

  const toleranceDays = toleranceConfig?.value
    ? parseInt(toleranceConfig.value, 10) || 3
    : 3;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Bonus de bienvenue driver ── */}
      <WelcomeBonusCard campaign={welcomeBonus ?? null} />

      {/* ── Paramètres contrats ── */}
      <ToleranceCard
        initialDays={toleranceDays}
        updatedAt={toleranceConfig?.updatedAt}
      />

      {/* ── Versions applications mobiles ── */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Smartphone className="size-5 text-[color:var(--secondary)]" />
              <CardTitle>Versions des applications mobiles</CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => startRefresh(() => router.refresh())}
              disabled={refreshing}
            >
              {refreshing ? <Spinner size="sm" /> : <RefreshCw className="size-4" />}
              Rafraîchir
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-[color:var(--danger)]">{error}</p>
          ) : configs.length === 0 ? (
            <p className="text-sm text-[color:var(--muted-foreground)]">Aucune configuration disponible.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {configs.map((cfg) => (
                <div
                  key={cfg.id}
                  className="flex flex-col rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)]/20 p-4"
                >
                  {/* Header */}
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[color:var(--foreground)]">
                        {APP_TYPE_LABELS[cfg.appType] ?? cfg.appType}
                      </span>
                      <Badge tone={PLATFORM_TONE[cfg.platform] ?? "neutral"}>
                        {cfg.platform}
                      </Badge>
                    </div>
                    <CanView permission="app_config.manage">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditTarget(cfg)}
                      >
                        <Pencil className="size-3.5" />
                        Modifier
                      </Button>
                    </CanView>
                  </div>

                  {/* Details */}
                  <dl className="flex flex-col gap-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <dt className="text-[color:var(--muted-foreground)]">Version actuelle</dt>
                      <dd className="font-mono font-semibold text-[color:var(--foreground)]">
                        {cfg.latestVersion}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-[color:var(--muted-foreground)]">Version min. supportée</dt>
                      <dd className="font-mono text-[color:var(--foreground)]">
                        {cfg.minSupportedVersion}
                      </dd>
                    </div>
                    {cfg.releaseNotes ? (
                      <div className="mt-1 rounded-md bg-[color:var(--muted)] px-2 py-1.5 text-[color:var(--muted-foreground)]">
                        {cfg.releaseNotes}
                      </div>
                    ) : null}
                    <div className="mt-1 text-[color:var(--muted-foreground)]">
                      Mis à jour : {formatDate(cfg.updatedAt)}
                    </div>
                  </dl>

                  <a
                    href={cfg.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 block truncate text-xs text-[color:var(--primary)] hover:underline"
                  >
                    {cfg.downloadUrl}
                  </a>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <EditConfigModal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        config={editTarget}
      />

      {/* ── Paramètres système (toutes les clés dynamiques) ── */}
      <SystemConfigsCard configs={systemConfigs} />
    </div>
  );
}
