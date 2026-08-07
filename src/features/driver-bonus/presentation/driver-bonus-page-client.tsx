"use client";

import { useState, useTransition, useEffect } from "react";
import {
  Award,
  ChevronDown,
  ChevronUp,
  Gift,
  History,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Settings,
  Star,
  Trash2,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Combobox } from "@/shared/ui/combobox";
import { DataTable, PaginationFooter, type ColumnDef } from "@/shared/ui/data-table";
import { Modal } from "@/shared/ui/modal";
import { Tabs } from "@/shared/ui/tabs";
import { toast } from "@/shared/ui/toast";
import { formatDate, formatXof } from "@/shared/lib/format";
import {
  VEHICLE_CATEGORIES,
  VEHICLE_CATEGORY_META,
  BONUS_RUN_FREQUENCY_LABELS,
  type ActivityTier,
  type BonusTier,
  type BonusRunFrequency,
  type DriverBonusActivityConfig,
  type DriverBonusActivityDailyLedger,
  type DriverBonusActivityPayout,
  type DriverBonusAward,
  type DriverBonusTierConfig,
  type DriverBonusQualityConfig,
  type DriverBonusQualityMonthlyLedger,
  type DriverBonusRunConfig,
  type DriverBonusVehicleCategory,
  type PaginatedResult,
  type QualityTier,
} from "../domain/driver-bonus";
import {
  activateActivityConfigAction,
  activateDriverBonusConfigAction,
  activateQualityConfigAction,
  createActivityConfigAction,
  createDriverBonusConfigAction,
  createQualityConfigAction,
  deactivateActivityConfigAction,
  deactivateDriverBonusConfigAction,
  deactivateQualityConfigAction,
  deleteActivityConfigAction,
  deleteDriverBonusConfigAction,
  deleteQualityConfigAction,
  updateActivityConfigAction,
  updateDriverBonusConfigAction,
  updateQualityConfigAction,
  updateRunConfigAction,
  listActivityLedgerAction,
  listActivityPayoutsAction,
  listQualityLedgerAction,
  type ActionResult,
} from "../application/actions";
import { CanView } from "@/shared/ui/can-view";
import { usePermissions } from "@/features/auth/presentation/use-permissions";

// ─── Shared helpers ────────────────────────────────────────────────────────────

const CAT_OPTIONS = [
  { value: "ALL_FILTER", label: "Catégorie : toutes" },
  ...VEHICLE_CATEGORIES.map((c) => ({
    value: c,
    label: VEHICLE_CATEGORY_META[c].label,
  })),
];

function notify(res: ActionResult, successTitle: string) {
  if (res.ok) {
    toast({ kind: "success", title: successTitle, description: res.message });
  } else {
    toast({ kind: "error", title: "Erreur", description: res.message });
  }
}

function FieldInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: "text" | "number" | "textarea";
  placeholder?: string;
  required?: boolean;
}) {
  const cls =
    "rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm outline-none focus:border-[color:var(--primary)]";
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-[color:var(--foreground)]">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {type === "textarea" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          placeholder={placeholder}
          className={`${cls} resize-none`}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cls}
        />
      )}
    </div>
  );
}

// ─── ConfigCardShell — carte réutilisable pour les 3 systèmes ────────────────

function ConfigCardShell({
  name,
  description,
  vehicleCategory,
  isActive,
  activatedAt,
  tiersCount,
  extraMeta,
  expanded,
  onToggleExpand,
  onEdit,
  onToggleActive,
  onDelete,
  pending,
  showDelete,
  permissionKey,
  children,
}: {
  name: string;
  description: string | null;
  vehicleCategory: DriverBonusVehicleCategory;
  isActive: boolean;
  activatedAt: string | null;
  tiersCount: number;
  extraMeta?: string;
  expanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
  pending: boolean;
  showDelete: boolean;
  permissionKey: string;
  children: React.ReactNode;
}) {
  const cat = VEHICLE_CATEGORY_META[vehicleCategory];
  return (
    <Card className={`transition-all ${isActive ? "border-emerald-400 dark:border-emerald-600" : ""}`}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{name}</CardTitle>
              <Badge tone={cat.tone}>{cat.label}</Badge>
              <Badge tone={isActive ? "success" : "neutral"}>{isActive ? "Actif" : "Inactif"}</Badge>
            </div>
            {description && (
              <p className="text-xs text-[color:var(--muted-foreground)]">{description}</p>
            )}
            <p className="text-[10px] text-[color:var(--muted-foreground)]">
              {tiersCount} palier{tiersCount > 1 ? "s" : ""}
              {extraMeta ? ` · ${extraMeta}` : ""}
              {activatedAt ? ` · Activé le ${formatDate(activatedAt)}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onToggleExpand}>
              {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              {expanded ? "Réduire" : "Paliers"}
            </Button>
            <CanView permission={permissionKey}>
              <Button variant="outline" size="sm" onClick={onEdit} disabled={pending}>
                <Pencil className="size-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={onToggleActive} disabled={pending}>
                {isActive
                  ? <><PowerOff className="size-4" /> Désactiver</>
                  : <><Power className="size-4" /> Activer</>}
              </Button>
              {showDelete && (
                <Button variant="outline" size="sm" onClick={onDelete} disabled={pending}>
                  <Trash2 className="size-4 text-[color:var(--danger)]" />
                </Button>
              )}
            </CanView>
          </div>
        </div>
      </CardHeader>
      {expanded && <CardContent>{children}</CardContent>}
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SYSTÈME C — PALIERS / BIENVENUE
// ══════════════════════════════════════════════════════════════════════════════

function TiersEditor({ tiers, onChange }: { tiers: BonusTier[]; onChange: (t: BonusTier[]) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">Paliers</span>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...tiers, { ridesThreshold: 0, bonusAmount: 0 }])}>
          <Plus className="size-3" /> Ajouter
        </Button>
      </div>
      {tiers.length === 0 && <p className="text-xs italic text-[color:var(--muted-foreground)]">Aucun palier.</p>}
      {tiers.map((t, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)]/20 px-3 py-2">
            <div className="flex flex-1 flex-col gap-0.5">
              <label className="text-[10px] text-[color:var(--muted-foreground)]">Nb courses (cumulatif)</label>
              <input type="number" min={1} value={t.ridesThreshold || ""} onChange={(e) => onChange(tiers.map((x, idx) => idx === i ? { ...x, ridesThreshold: parseInt(e.target.value) || 0 } : x))} className="w-full bg-transparent text-sm font-medium outline-none" />
            </div>
            <span className="text-[color:var(--muted-foreground)]">→</span>
            <div className="flex flex-1 flex-col gap-0.5">
              <label className="text-[10px] text-[color:var(--muted-foreground)]">Bonus (FCFA)</label>
              <input type="number" min={1} value={t.bonusAmount || ""} onChange={(e) => onChange(tiers.map((x, idx) => idx === i ? { ...x, bonusAmount: parseInt(e.target.value) || 0 } : x))} className="w-full bg-transparent text-sm font-medium outline-none" />
            </div>
          </div>
          <button type="button" onClick={() => onChange(tiers.filter((_, idx) => idx !== i))} className="text-[color:var(--danger)] hover:opacity-70"><X className="size-4" /></button>
        </div>
      ))}
    </div>
  );
}

function TierConfigForm({ initial, onClose }: { initial?: DriverBonusTierConfig; onClose: () => void }) {
  const isEdit = Boolean(initial);
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [vehicleCategory, setVehicleCategory] = useState<DriverBonusVehicleCategory>(initial?.vehicleCategory ?? "ALL");
  const [tiers, setTiers] = useState<BonusTier[]>(initial?.tiers ?? []);
  const [pending, start] = useTransition();

  function validate() {
    if (!name.trim()) return "Le nom est requis.";
    if (tiers.length === 0) return "Ajoutez au moins un palier.";
    if (tiers.some((t) => t.ridesThreshold <= 0 || t.bonusAmount <= 0)) return "Chaque palier doit avoir seuil et montant > 0.";
    if (new Set(tiers.map((t) => t.ridesThreshold)).size !== tiers.length) return "Les seuils doivent être uniques.";
    return null;
  }

  function submit() {
    const err = validate();
    if (err) { toast({ kind: "error", title: "Validation", description: err }); return; }
    start(async () => {
      const res = isEdit && initial
        ? await updateDriverBonusConfigAction(initial.id, { name: name.trim(), description: description.trim() || null, tiers })
        : await createDriverBonusConfigAction({ name: name.trim(), description: description.trim() || null, vehicleCategory, tiers });
      notify(res, isEdit ? "Barème mis à jour." : "Barème créé.");
      if (res.ok) onClose();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <FieldInput label="Nom" value={name} onChange={setName} placeholder="ex: Barème standard" required />
      <FieldInput label="Description" value={description} onChange={setDescription} type="textarea" placeholder="Optionnel" />
      {!isEdit && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[color:var(--foreground)]">Catégorie véhicule *</label>
          <Combobox options={VEHICLE_CATEGORIES.map((c) => ({ value: c, label: VEHICLE_CATEGORY_META[c].label }))} value={vehicleCategory} onChange={(v) => setVehicleCategory(v as DriverBonusVehicleCategory)} />
          <p className="text-[10px] text-[color:var(--muted-foreground)]">Non modifiable après création. &quot;Toutes&quot; = barème de fallback.</p>
        </div>
      )}
      <TiersEditor tiers={tiers} onChange={setTiers} />
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose} disabled={pending}>Annuler</Button>
        <Button onClick={submit} disabled={pending}>{pending ? "Enregistrement…" : isEdit ? "Mettre à jour" : "Créer"}</Button>
      </div>
    </div>
  );
}

function TierConfigCard({ config }: { config: DriverBonusTierConfig }) {
  const [expanded, setExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [pending, start] = useTransition();

  function toggleActive() {
    start(async () => {
      const res = config.isActive ? await deactivateDriverBonusConfigAction(config.id) : await activateDriverBonusConfigAction(config.id);
      notify(res, config.isActive ? "Barème désactivé." : "Barème activé.");
    });
  }

  return (
    <>
      <ConfigCardShell
        name={config.name} description={config.description} vehicleCategory={config.vehicleCategory}
        isActive={config.isActive} activatedAt={config.activatedAt} tiersCount={config.tiers.length}
        expanded={expanded} onToggleExpand={() => setExpanded((v) => !v)}
        onEdit={() => setEditOpen(true)} onToggleActive={toggleActive} onDelete={() => setDeleteConfirm(true)}
        pending={pending} showDelete={!config.isActive} permissionKey="driver_bonus.config.manage"
      >
        <div className="flex flex-col gap-1">
          {[...config.tiers].sort((a, b) => a.ridesThreshold - b.ridesThreshold).map((t) => (
            <div key={t.ridesThreshold} className="flex items-center justify-between rounded-lg bg-[color:var(--muted)]/30 px-3 py-2">
              <div className="flex items-center gap-2">
                <Zap className="size-3.5 text-[color:var(--primary)]" />
                <span className="text-sm font-medium">{t.ridesThreshold} courses lifetime</span>
              </div>
              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">+{formatXof(t.bonusAmount)}</span>
            </div>
          ))}
        </div>
      </ConfigCardShell>
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Modifier le barème">
        <TierConfigForm initial={config} onClose={() => setEditOpen(false)} />
      </Modal>
      <Modal open={deleteConfirm} onClose={() => setDeleteConfirm(false)} title="Supprimer le barème">
        <div className="flex flex-col gap-4">
          <p className="text-sm">Confirmer la suppression de <strong>{config.name}</strong> ?</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(false)} disabled={pending}>Annuler</Button>
            <Button onClick={() => start(async () => { const r = await deleteDriverBonusConfigAction(config.id); notify(r, "Barème supprimé."); setDeleteConfirm(false); })} disabled={pending}>
              {pending ? "Suppression…" : "Supprimer"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function ConfigsTab({ configs }: { configs: DriverBonusTierConfig[] }) {
  const [catFilter, setCatFilter] = useState("ALL_FILTER");
  const [createOpen, setCreateOpen] = useState(false);
  const filtered = catFilter === "ALL_FILTER" ? configs : configs.filter((c) => c.vehicleCategory === catFilter);
  const active = filtered.filter((c) => c.isActive);
  const inactive = filtered.filter((c) => !c.isActive);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Combobox options={CAT_OPTIONS} value={catFilter} onChange={setCatFilter} className="w-48" />
        <CanView permission="driver_bonus.config.manage">
          <Button onClick={() => setCreateOpen(true)}><Plus className="size-4" /> Nouveau barème</Button>
        </CanView>
      </div>
      {filtered.length === 0 && <Card className="flex flex-col items-center gap-3 py-12 text-center"><Gift className="size-10 text-[color:var(--muted-foreground)]" /><p className="text-sm text-[color:var(--muted-foreground)]">Aucun barème.</p></Card>}
      {active.length > 0 && <div className="flex flex-col gap-3"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Actifs ({active.length})</p>{active.map((c) => <TierConfigCard key={c.id} config={c} />)}</div>}
      {inactive.length > 0 && <div className="flex flex-col gap-3"><p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">Inactifs ({inactive.length})</p>{inactive.map((c) => <TierConfigCard key={c.id} config={c} />)}</div>}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nouveau barème bienvenue">
        <TierConfigForm onClose={() => setCreateOpen(false)} />
      </Modal>
    </div>
  );
}

function AwardsTab({ awards, total }: { awards: DriverBonusAward[]; total: number }) {
  const [catFilter, setCatFilter] = useState("ALL_FILTER");
  const filtered = catFilter === "ALL_FILTER" ? awards : awards.filter((a) => a.vehicleCategory === catFilter);
  const columns: ColumnDef<DriverBonusAward>[] = [
    { key: "driver", header: "Driver ID", render: (r) => <span className="font-mono text-xs text-[color:var(--muted-foreground)]">{r.driverId.slice(0, 8)}…</span> },
    { key: "category", header: "Catégorie", render: (r) => { const m = VEHICLE_CATEGORY_META[r.vehicleCategory]; return <Badge tone={m.tone}>{m.label}</Badge>; } },
    { key: "threshold", header: "Palier", sortAccessor: (r) => r.ridesThreshold, render: (r) => <span className="inline-flex items-center gap-1 text-sm"><Zap className="size-3 text-[color:var(--primary)]" />{r.ridesThreshold} courses</span> },
    { key: "bonus", header: "Bonus versé", align: "right", sortAccessor: (r) => r.bonusAmount, render: (r) => <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">+{formatXof(r.bonusAmount)}</span> },
    { key: "tx", header: "Transaction", render: (r) => r.transactionId ? <span className="font-mono text-xs text-[color:var(--muted-foreground)]">{r.transactionId.slice(0, 10)}…</span> : <Badge tone="warning">En attente</Badge> },
    { key: "date", header: "Date", sortAccessor: (r) => r.awardedAt, render: (r) => <span className="text-xs text-[color:var(--muted-foreground)]">{formatDate(r.awardedAt)}</span> },
  ];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Combobox options={CAT_OPTIONS} value={catFilter} onChange={setCatFilter} className="w-48" />
        <p className="text-xs text-[color:var(--muted-foreground)]">{total} bonus versé{total > 1 ? "s" : ""} au total</p>
      </div>
      {filtered.length === 0 ? <Card className="flex flex-col items-center gap-3 py-12 text-center"><Award className="size-10 text-[color:var(--muted-foreground)]" /><p className="text-sm text-[color:var(--muted-foreground)]">Aucun bonus versé.</p></Card> : (
        <Card className="overflow-hidden p-0">
          <DataTable rows={filtered} columns={columns} rowKey={(r) => r.id} defaultSort={{ key: "date", direction: "desc" }} />
          <PaginationFooter total={total} shown={filtered.length} />
        </Card>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SYSTÈME A — ACTIVITÉ QUOTIDIENNE
// ══════════════════════════════════════════════════════════════════════════════

function ActivityTiersEditor({ tiers, onChange }: { tiers: ActivityTier[]; onChange: (t: ActivityTier[]) => void }) {
  function add() { onChange([...tiers, { name: "", ridesThresholdPerDay: 0, bonusPct: 0 }]); }
  function upd(i: number, patch: Partial<ActivityTier>) { onChange(tiers.map((t, idx) => idx === i ? { ...t, ...patch } : t)); }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">Paliers d'activité</span>
        <Button type="button" variant="outline" size="sm" onClick={add}><Plus className="size-3" /> Ajouter</Button>
      </div>
      <p className="text-[10px] text-[color:var(--muted-foreground)]">Seul le palier le plus élevé atteint ce jour est versé (non cumulatif).</p>
      {tiers.length === 0 && <p className="text-xs italic text-[color:var(--muted-foreground)]">Aucun palier.</p>}
      {tiers.map((t, i) => (
        <div key={i} className="flex items-start gap-2">
          <div className="grid flex-1 grid-cols-3 gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)]/20 px-3 py-2">
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-[color:var(--muted-foreground)]">Nom du palier</label>
              <input value={t.name} onChange={(e) => upd(i, { name: e.target.value })} placeholder="ex: Palier 20" className="w-full bg-transparent text-sm font-medium outline-none" />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-[color:var(--muted-foreground)]">Courses/jour min.</label>
              <input type="number" min={1} value={t.ridesThresholdPerDay || ""} onChange={(e) => upd(i, { ridesThresholdPerDay: parseInt(e.target.value) || 0 })} className="w-full bg-transparent text-sm font-medium outline-none" />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-[color:var(--muted-foreground)]">% gains nets</label>
              <input type="number" min={1} max={100} value={t.bonusPct || ""} onChange={(e) => upd(i, { bonusPct: parseInt(e.target.value) || 0 })} className="w-full bg-transparent text-sm font-medium outline-none" />
            </div>
          </div>
          <button type="button" onClick={() => onChange(tiers.filter((_, idx) => idx !== i))} className="mt-2 text-[color:var(--danger)] hover:opacity-70"><X className="size-4" /></button>
        </div>
      ))}
    </div>
  );
}

function ActivityConfigForm({ initial, onClose }: { initial?: DriverBonusActivityConfig; onClose: () => void }) {
  const isEdit = Boolean(initial);
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [vehicleCategory, setVehicleCategory] = useState<DriverBonusVehicleCategory>(initial?.vehicleCategory ?? "ALL");
  const [tiers, setTiers] = useState<ActivityTier[]>(initial?.tiers ?? []);
  const [pending, start] = useTransition();

  function validate() {
    if (!name.trim()) return "Le nom est requis.";
    if (tiers.length === 0) return "Ajoutez au moins un palier.";
    if (tiers.some((t) => !t.name.trim())) return "Chaque palier doit avoir un nom.";
    if (tiers.some((t) => t.ridesThresholdPerDay <= 0)) return "Seuil journalier > 0 requis.";
    if (tiers.some((t) => t.bonusPct <= 0 || t.bonusPct > 100)) return "Le % bonus doit être entre 1 et 100.";
    if (new Set(tiers.map((t) => t.ridesThresholdPerDay)).size !== tiers.length) return "Les seuils journaliers doivent être uniques.";
    return null;
  }

  function submit() {
    const err = validate();
    if (err) { toast({ kind: "error", title: "Validation", description: err }); return; }
    start(async () => {
      const res = isEdit && initial
        ? await updateActivityConfigAction(initial.id, { name: name.trim(), description: description.trim() || null, tiers })
        : await createActivityConfigAction({ name: name.trim(), description: description.trim() || null, vehicleCategory, tiers });
      notify(res, isEdit ? "Barème mis à jour." : "Barème créé.");
      if (res.ok) onClose();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <FieldInput label="Nom" value={name} onChange={setName} placeholder="ex: Grille activité standard" required />
      <FieldInput label="Description" value={description} onChange={setDescription} type="textarea" placeholder="Optionnel" />
      {!isEdit && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[color:var(--foreground)]">Catégorie véhicule *</label>
          <Combobox options={VEHICLE_CATEGORIES.map((c) => ({ value: c, label: VEHICLE_CATEGORY_META[c].label }))} value={vehicleCategory} onChange={(v) => setVehicleCategory(v as DriverBonusVehicleCategory)} />
        </div>
      )}
      <ActivityTiersEditor tiers={tiers} onChange={setTiers} />
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose} disabled={pending}>Annuler</Button>
        <Button onClick={submit} disabled={pending}>{pending ? "Enregistrement…" : isEdit ? "Mettre à jour" : "Créer"}</Button>
      </div>
    </div>
  );
}

function ActivityConfigCard({ config }: { config: DriverBonusActivityConfig }) {
  const [expanded, setExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [pending, start] = useTransition();

  function toggleActive() {
    start(async () => {
      const res = config.isActive ? await deactivateActivityConfigAction(config.id) : await activateActivityConfigAction(config.id);
      notify(res, config.isActive ? "Barème désactivé." : "Barème activé.");
    });
  }

  return (
    <>
      <ConfigCardShell
        name={config.name} description={config.description} vehicleCategory={config.vehicleCategory}
        isActive={config.isActive} activatedAt={config.activatedAt} tiersCount={config.tiers.length}
        expanded={expanded} onToggleExpand={() => setExpanded((v) => !v)}
        onEdit={() => setEditOpen(true)} onToggleActive={toggleActive} onDelete={() => setDeleteConfirm(true)}
        pending={pending} showDelete={!config.isActive} permissionKey="driver_bonus.config.manage"
      >
        <div className="flex flex-col gap-1">
          {[...config.tiers].sort((a, b) => a.ridesThresholdPerDay - b.ridesThresholdPerDay).map((t) => (
            <div key={t.ridesThresholdPerDay} className="flex items-center justify-between rounded-lg bg-[color:var(--muted)]/30 px-3 py-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="size-3.5 text-[color:var(--primary)]" />
                <span className="text-sm font-medium">{t.name}</span>
                <span className="text-xs text-[color:var(--muted-foreground)]">≥ {t.ridesThresholdPerDay} courses/jour</span>
              </div>
              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">+{t.bonusPct}% des gains nets</span>
            </div>
          ))}
        </div>
      </ConfigCardShell>
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Modifier le barème activité">
        <ActivityConfigForm initial={config} onClose={() => setEditOpen(false)} />
      </Modal>
      <Modal open={deleteConfirm} onClose={() => setDeleteConfirm(false)} title="Supprimer le barème">
        <div className="flex flex-col gap-4">
          <p className="text-sm">Confirmer la suppression de <strong>{config.name}</strong> ?</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(false)} disabled={pending}>Annuler</Button>
            <Button onClick={() => start(async () => { const r = await deleteActivityConfigAction(config.id); notify(r, "Barème supprimé."); setDeleteConfirm(false); })} disabled={pending}>
              {pending ? "Suppression…" : "Supprimer"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function ActivityConfigsTab({ configs }: { configs: DriverBonusActivityConfig[] }) {
  const [catFilter, setCatFilter] = useState("ALL_FILTER");
  const [createOpen, setCreateOpen] = useState(false);
  const filtered = catFilter === "ALL_FILTER" ? configs : configs.filter((c) => c.vehicleCategory === catFilter);
  const active = filtered.filter((c) => c.isActive);
  const inactive = filtered.filter((c) => !c.isActive);
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 dark:border-sky-800 dark:bg-sky-950/30">
        <p className="text-xs text-sky-700 dark:text-sky-300">
          <strong>Logique :</strong> Chaque nuit, le système gèle les courses de la journée (heure Porto-Novo UTC+1). Seul le palier le plus élevé atteint ce jour s'applique — le bonus = <code className="font-mono">gains_nets × %</code>. Le paiement est groupé selon la cadence configurée dans l'onglet Cadence.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Combobox options={CAT_OPTIONS} value={catFilter} onChange={setCatFilter} className="w-48" />
        <CanView permission="driver_bonus.config.manage">
          <Button onClick={() => setCreateOpen(true)}><Plus className="size-4" /> Nouveau barème activité</Button>
        </CanView>
      </div>
      {filtered.length === 0 && <Card className="flex flex-col items-center gap-3 py-12 text-center"><TrendingUp className="size-10 text-[color:var(--muted-foreground)]" /><p className="text-sm text-[color:var(--muted-foreground)]">Aucun barème activité.</p></Card>}
      {active.length > 0 && <div className="flex flex-col gap-3"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Actifs ({active.length})</p>{active.map((c) => <ActivityConfigCard key={c.id} config={c} />)}</div>}
      {inactive.length > 0 && <div className="flex flex-col gap-3"><p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">Inactifs ({inactive.length})</p>{inactive.map((c) => <ActivityConfigCard key={c.id} config={c} />)}</div>}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nouveau barème activité">
        <ActivityConfigForm onClose={() => setCreateOpen(false)} />
      </Modal>
    </div>
  );
}

function ActivityLedgerTab({ driverNames }: { driverNames: Map<string, string> }) {
  const [result, setResult] = useState<PaginatedResult<DriverBonusActivityDailyLedger> | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listActivityLedgerAction({ page, limit: 50 })
      .then(setResult)
      .finally(() => setLoading(false));
  }, [page]);

  const columns: ColumnDef<DriverBonusActivityDailyLedger>[] = [
    { key: "driver", header: "Chauffeur", render: (r) => <span className="text-sm font-medium">{driverNames.get(r.driverId) ?? <span className="font-mono text-xs text-[color:var(--muted-foreground)]">{r.driverId.slice(0, 8)}…</span>}</span> },
    { key: "date", header: "Date", sortAccessor: (r) => r.activityDate, render: (r) => <span className="text-sm">{r.activityDate}</span> },
    { key: "cat", header: "Catégorie", render: (r) => { const m = VEHICLE_CATEGORY_META[r.vehicleCategory]; return <Badge tone={m.tone}>{m.label}</Badge>; } },
    { key: "rides", header: "Courses", sortAccessor: (r) => r.ridesCount, render: (r) => <span className="text-sm font-medium">{r.ridesCount}</span> },
    { key: "net", header: "Gains nets", sortAccessor: (r) => r.netAmount, render: (r) => <span className="text-sm">{formatXof(r.netAmount)}</span> },
    { key: "pct", header: "Palier %", render: (r) => <span className="text-sm font-medium text-[color:var(--primary)]">{r.tierPctApplied}%</span> },
    { key: "bonus", header: "Bonus", align: "right", sortAccessor: (r) => r.bonusAmount, render: (r) => <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">+{formatXof(r.bonusAmount)}</span> },
    { key: "paid", header: "Payé", render: (r) => r.paid ? <Badge tone="success">Payé</Badge> : <Badge tone="warning">En attente</Badge> },
  ];
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-[color:var(--muted-foreground)]">Journal des calculs journaliers figés par le cron nightly. Les lignes <em>En attente</em> seront regroupées dans le prochain payout sweep.</p>
      <Card className="overflow-hidden p-0">
        <div className="flex items-center gap-2 border-b border-[color:var(--border)] px-4 py-3">
          <History className="size-4 text-[color:var(--muted-foreground)]" />
          <span className="text-sm font-medium text-[color:var(--foreground)]">Journal d'activité</span>
          {loading && <span className="ml-auto text-xs text-[color:var(--muted-foreground)]">Chargement…</span>}
          {!loading && <Badge tone="neutral" className="ml-auto">Vue lecture seule</Badge>}
        </div>
        <DataTable rows={result?.items ?? []} columns={columns} rowKey={(r) => r.id} defaultSort={{ key: "date", direction: "desc" }}
          emptyState={<div className="flex flex-col items-center gap-2 py-12"><History className="size-8 text-[color:var(--muted-foreground)]" /><p className="text-sm text-[color:var(--muted-foreground)]">Les entrées apparaîtront ici dès le premier cron nightly.</p></div>}
        />
        {result && result.totalPages > 1 && (
          <PaginationFooter total={result.total} shown={result.items.length} page={result.page} totalPages={result.totalPages} onPrev={page > 1 ? () => setPage((p) => p - 1) : undefined} onNext={result.page < result.totalPages ? () => setPage((p) => p + 1) : undefined} />
        )}
      </Card>
    </div>
  );
}

function ActivityPayoutsTab({ driverNames }: { driverNames: Map<string, string> }) {
  const [result, setResult] = useState<PaginatedResult<DriverBonusActivityPayout> | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listActivityPayoutsAction({ page, limit: 50 })
      .then(setResult)
      .finally(() => setLoading(false));
  }, [page]);

  const columns: ColumnDef<DriverBonusActivityPayout>[] = [
    { key: "driver", header: "Chauffeur", render: (r) => <span className="text-sm font-medium">{driverNames.get(r.driverId) ?? <span className="font-mono text-xs text-[color:var(--muted-foreground)]">{r.driverId.slice(0, 8)}…</span>}</span> },
    { key: "runDate", header: "Date payout", sortAccessor: (r) => r.payoutRunDate, render: (r) => <span className="text-sm">{r.payoutRunDate}</span> },
    { key: "ledgers", header: "Jours couverts", render: (r) => <span className="text-sm">{r.coveredLedgerIds.length} j</span> },
    { key: "total", header: "Total versé", align: "right", sortAccessor: (r) => r.totalAmount, render: (r) => <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">+{formatXof(r.totalAmount)}</span> },
    { key: "tx", header: "Transaction", render: (r) => r.transactionId ? <span className="font-mono text-xs text-[color:var(--muted-foreground)]">{r.transactionId.slice(0, 10)}…</span> : <Badge tone="warning">En attente</Badge> },
    { key: "date", header: "Créé le", sortAccessor: (r) => r.createdAt, render: (r) => <span className="text-xs text-[color:var(--muted-foreground)]">{formatDate(r.createdAt)}</span> },
  ];
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center gap-2 border-b border-[color:var(--border)] px-4 py-3">
        <Award className="size-4 text-[color:var(--muted-foreground)]" />
        <span className="text-sm font-medium text-[color:var(--foreground)]">Historique des payouts</span>
        {loading && <span className="ml-auto text-xs text-[color:var(--muted-foreground)]">Chargement…</span>}
        {!loading && <Badge tone="neutral" className="ml-auto">Vue lecture seule</Badge>}
      </div>
      <DataTable rows={result?.items ?? []} columns={columns} rowKey={(r) => r.id} defaultSort={{ key: "runDate", direction: "desc" }}
        emptyState={<div className="flex flex-col items-center gap-2 py-12"><Award className="size-8 text-[color:var(--muted-foreground)]" /><p className="text-sm text-[color:var(--muted-foreground)]">Aucun payout versé.</p></div>}
      />
      {result && result.totalPages > 1 && (
        <PaginationFooter total={result.total} shown={result.items.length} page={result.page} totalPages={result.totalPages} onPrev={page > 1 ? () => setPage((p) => p - 1) : undefined} onNext={result.page < result.totalPages ? () => setPage((p) => p + 1) : undefined} />
      )}
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SYSTÈME B — QUALITÉ MENSUELLE
// ══════════════════════════════════════════════════════════════════════════════

function QualityTiersEditor({ tiers, onChange }: { tiers: QualityTier[]; onChange: (t: QualityTier[]) => void }) {
  function add() { onChange([...tiers, { minRating: 0, bonusAmount: 0 }]); }
  function upd(i: number, patch: Partial<QualityTier>) { onChange(tiers.map((t, idx) => idx === i ? { ...t, ...patch } : t)); }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">Paliers de note</span>
        <Button type="button" variant="outline" size="sm" onClick={add}><Plus className="size-3" /> Ajouter</Button>
      </div>
      <p className="text-[10px] text-[color:var(--muted-foreground)]">Note minimale sur 5.0 → bonus flat FCFA. Le palier le plus élevé applicable est retenu.</p>
      {tiers.length === 0 && <p className="text-xs italic text-[color:var(--muted-foreground)]">Aucun palier.</p>}
      {tiers.map((t, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)]/20 px-3 py-2">
            <div className="flex flex-1 flex-col gap-0.5">
              <label className="text-[10px] text-[color:var(--muted-foreground)]">Note min. (sur 5.0)</label>
              <input type="number" min={0} max={5} step={0.1} value={t.minRating || ""} onChange={(e) => upd(i, { minRating: parseFloat(e.target.value) || 0 })} className="w-full bg-transparent text-sm font-medium outline-none" />
            </div>
            <span className="text-[color:var(--muted-foreground)]">→</span>
            <div className="flex flex-1 flex-col gap-0.5">
              <label className="text-[10px] text-[color:var(--muted-foreground)]">Bonus (FCFA)</label>
              <input type="number" min={1} value={t.bonusAmount || ""} onChange={(e) => upd(i, { bonusAmount: parseInt(e.target.value) || 0 })} className="w-full bg-transparent text-sm font-medium outline-none" />
            </div>
          </div>
          <button type="button" onClick={() => onChange(tiers.filter((_, idx) => idx !== i))} className="text-[color:var(--danger)] hover:opacity-70"><X className="size-4" /></button>
        </div>
      ))}
    </div>
  );
}

function QualityConfigForm({ initial, onClose }: { initial?: DriverBonusQualityConfig; onClose: () => void }) {
  const isEdit = Boolean(initial);
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [vehicleCategory, setVehicleCategory] = useState<DriverBonusVehicleCategory>(initial?.vehicleCategory ?? "ALL");
  const [minRidesPerMonth, setMinRidesPerMonth] = useState(String(initial?.minRidesPerMonth ?? 50));
  const [tiers, setTiers] = useState<QualityTier[]>(initial?.tiers ?? []);
  const [pending, start] = useTransition();

  function validate() {
    if (!name.trim()) return "Le nom est requis.";
    const minRides = parseInt(minRidesPerMonth);
    if (!minRides || minRides <= 0) return "Le seuil de courses mensuel doit être > 0.";
    if (tiers.length === 0) return "Ajoutez au moins un palier.";
    if (tiers.some((t) => t.minRating < 0 || t.minRating > 5)) return "Note minimale entre 0 et 5.";
    if (tiers.some((t) => t.bonusAmount <= 0)) return "Chaque palier doit avoir un montant > 0.";
    if (new Set(tiers.map((t) => t.minRating)).size !== tiers.length) return "Les notes minimales doivent être uniques.";
    return null;
  }

  function submit() {
    const err = validate();
    if (err) { toast({ kind: "error", title: "Validation", description: err }); return; }
    start(async () => {
      const minRides = parseInt(minRidesPerMonth);
      const res = isEdit && initial
        ? await updateQualityConfigAction(initial.id, { name: name.trim(), description: description.trim() || null, minRidesPerMonth: minRides, tiers })
        : await createQualityConfigAction({ name: name.trim(), description: description.trim() || null, vehicleCategory, minRidesPerMonth: minRides, tiers });
      notify(res, isEdit ? "Barème mis à jour." : "Barème créé.");
      if (res.ok) onClose();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <FieldInput label="Nom" value={name} onChange={setName} placeholder="ex: Barème qualité MOTO" required />
      <FieldInput label="Description" value={description} onChange={setDescription} type="textarea" placeholder="Optionnel" />
      {!isEdit && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[color:var(--foreground)]">Catégorie véhicule *</label>
          <Combobox options={VEHICLE_CATEGORIES.map((c) => ({ value: c, label: VEHICLE_CATEGORY_META[c].label }))} value={vehicleCategory} onChange={(v) => setVehicleCategory(v as DriverBonusVehicleCategory)} />
        </div>
      )}
      <FieldInput label="Seuil d'éligibilité (courses/mois)" value={minRidesPerMonth} onChange={setMinRidesPerMonth} type="number" placeholder="50" required />
      <QualityTiersEditor tiers={tiers} onChange={setTiers} />
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose} disabled={pending}>Annuler</Button>
        <Button onClick={submit} disabled={pending}>{pending ? "Enregistrement…" : isEdit ? "Mettre à jour" : "Créer"}</Button>
      </div>
    </div>
  );
}

function QualityConfigCard({ config }: { config: DriverBonusQualityConfig }) {
  const [expanded, setExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [pending, start] = useTransition();

  function toggleActive() {
    start(async () => {
      const res = config.isActive ? await deactivateQualityConfigAction(config.id) : await activateQualityConfigAction(config.id);
      notify(res, config.isActive ? "Barème désactivé." : "Barème activé.");
    });
  }

  return (
    <>
      <ConfigCardShell
        name={config.name} description={config.description} vehicleCategory={config.vehicleCategory}
        isActive={config.isActive} activatedAt={config.activatedAt} tiersCount={config.tiers.length}
        extraMeta={`éligibilité : ${config.minRidesPerMonth} courses/mois`}
        expanded={expanded} onToggleExpand={() => setExpanded((v) => !v)}
        onEdit={() => setEditOpen(true)} onToggleActive={toggleActive} onDelete={() => setDeleteConfirm(true)}
        pending={pending} showDelete={!config.isActive} permissionKey="driver_bonus.config.manage"
      >
        <div className="flex flex-col gap-1">
          {[...config.tiers].sort((a, b) => a.minRating - b.minRating).map((t) => (
            <div key={t.minRating} className="flex items-center justify-between rounded-lg bg-[color:var(--muted)]/30 px-3 py-2">
              <div className="flex items-center gap-2">
                <Star className="size-3.5 text-amber-500" />
                <span className="text-sm font-medium">≥ {t.minRating.toFixed(1)} / 5.0</span>
              </div>
              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">+{formatXof(t.bonusAmount)}</span>
            </div>
          ))}
        </div>
      </ConfigCardShell>
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Modifier le barème qualité">
        <QualityConfigForm initial={config} onClose={() => setEditOpen(false)} />
      </Modal>
      <Modal open={deleteConfirm} onClose={() => setDeleteConfirm(false)} title="Supprimer le barème">
        <div className="flex flex-col gap-4">
          <p className="text-sm">Confirmer la suppression de <strong>{config.name}</strong> ?</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(false)} disabled={pending}>Annuler</Button>
            <Button onClick={() => start(async () => { const r = await deleteQualityConfigAction(config.id); notify(r, "Barème supprimé."); setDeleteConfirm(false); })} disabled={pending}>
              {pending ? "Suppression…" : "Supprimer"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function QualityConfigsTab({ configs }: { configs: DriverBonusQualityConfig[] }) {
  const [catFilter, setCatFilter] = useState("ALL_FILTER");
  const [createOpen, setCreateOpen] = useState(false);
  const filtered = catFilter === "ALL_FILTER" ? configs : configs.filter((c) => c.vehicleCategory === catFilter);
  const active = filtered.filter((c) => c.isActive);
  const inactive = filtered.filter((c) => !c.isActive);
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/30">
        <p className="text-xs text-amber-700 dark:text-amber-300">
          <strong>Logique :</strong> En début de mois, le système évalue la note moyenne du mois précédent. Si le driver a atteint le seuil de courses (<em>éligibilité</em>) et a une note ≥ au palier minimum, il reçoit le bonus flat correspondant.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Combobox options={CAT_OPTIONS} value={catFilter} onChange={setCatFilter} className="w-48" />
        <CanView permission="driver_bonus.config.manage">
          <Button onClick={() => setCreateOpen(true)}><Plus className="size-4" /> Nouveau barème qualité</Button>
        </CanView>
      </div>
      {filtered.length === 0 && <Card className="flex flex-col items-center gap-3 py-12 text-center"><Star className="size-10 text-[color:var(--muted-foreground)]" /><p className="text-sm text-[color:var(--muted-foreground)]">Aucun barème qualité.</p></Card>}
      {active.length > 0 && <div className="flex flex-col gap-3"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Actifs ({active.length})</p>{active.map((c) => <QualityConfigCard key={c.id} config={c} />)}</div>}
      {inactive.length > 0 && <div className="flex flex-col gap-3"><p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">Inactifs ({inactive.length})</p>{inactive.map((c) => <QualityConfigCard key={c.id} config={c} />)}</div>}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nouveau barème qualité">
        <QualityConfigForm onClose={() => setCreateOpen(false)} />
      </Modal>
    </div>
  );
}

function QualityLedgerTab({ driverNames }: { driverNames: Map<string, string> }) {
  const [result, setResult] = useState<PaginatedResult<DriverBonusQualityMonthlyLedger> | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listQualityLedgerAction({ page, limit: 50 })
      .then(setResult)
      .finally(() => setLoading(false));
  }, [page]);

  const columns: ColumnDef<DriverBonusQualityMonthlyLedger>[] = [
    { key: "driver", header: "Chauffeur", render: (r) => <span className="text-sm font-medium">{driverNames.get(r.driverId) ?? <span className="font-mono text-xs text-[color:var(--muted-foreground)]">{r.driverId.slice(0, 8)}…</span>}</span> },
    { key: "month", header: "Mois", sortAccessor: (r) => r.yearMonth, render: (r) => <span className="text-sm font-medium">{r.yearMonth}</span> },
    { key: "cat", header: "Catégorie", render: (r) => { const m = VEHICLE_CATEGORY_META[r.vehicleCategory]; return <Badge tone={m.tone}>{m.label}</Badge>; } },
    { key: "rides", header: "Courses", sortAccessor: (r) => r.ridesCount, render: (r) => <span className="text-sm">{r.ridesCount}</span> },
    { key: "rating", header: "Note moy.", sortAccessor: (r) => r.averageRating, render: (r) => <span className="inline-flex items-center gap-1 text-sm font-medium"><Star className="size-3 text-amber-500" />{r.averageRating.toFixed(2)}</span> },
    { key: "bonus", header: "Bonus", align: "right", sortAccessor: (r) => r.bonusAmount, render: (r) => <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">+{formatXof(r.bonusAmount)}</span> },
    { key: "tx", header: "Transaction", render: (r) => r.transactionId ? <span className="font-mono text-xs">{r.transactionId.slice(0, 10)}…</span> : <Badge tone="warning">En attente</Badge> },
  ];
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center gap-2 border-b border-[color:var(--border)] px-4 py-3">
        <Star className="size-4 text-amber-500" />
        <span className="text-sm font-medium text-[color:var(--foreground)]">Journal qualité mensuel</span>
        {loading && <span className="ml-auto text-xs text-[color:var(--muted-foreground)]">Chargement…</span>}
        {!loading && <Badge tone="neutral" className="ml-auto">Vue lecture seule</Badge>}
      </div>
      <DataTable rows={result?.items ?? []} columns={columns} rowKey={(r) => r.id} defaultSort={{ key: "month", direction: "desc" }}
        emptyState={<div className="flex flex-col items-center gap-2 py-12"><Star className="size-8 text-amber-400" /><p className="text-sm text-[color:var(--muted-foreground)]">Les entrées apparaîtront après le premier cron mensuel.</p></div>}
      />
      {result && result.totalPages > 1 && (
        <PaginationFooter total={result.total} shown={result.items.length} page={result.page} totalPages={result.totalPages} onPrev={page > 1 ? () => setPage((p) => p - 1) : undefined} onNext={result.page < result.totalPages ? () => setPage((p) => p + 1) : undefined} />
      )}
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// RUNCONFIG — CADENCE & KILL-SWITCHES
// ══════════════════════════════════════════════════════════════════════════════

const WEEKDAY_LABELS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const WEEKDAY_OPTIONS = WEEKDAY_LABELS.map((l, i) => ({ value: String(i), label: l }));
const FREQUENCY_OPTIONS = (["DAILY", "WEEKLY", "MONTHLY"] as BonusRunFrequency[]).map((f) => ({ value: f, label: BONUS_RUN_FREQUENCY_LABELS[f] }));

function KillSwitch({ label, description, enabled, onToggle, disabled }: {
  label: string; description: string; enabled: boolean; onToggle: () => void; disabled: boolean;
}) {
  return (
    <div className={`flex items-start justify-between gap-4 rounded-xl border p-4 transition-colors ${enabled ? "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/20" : "border-[color:var(--border)] bg-[color:var(--muted)]/30"}`}>
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold text-[color:var(--foreground)]">{label}</span>
        <span className="text-xs text-[color:var(--muted-foreground)]">{description}</span>
      </div>
      <button type="button" onClick={onToggle} disabled={disabled}
        className={`relative flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${enabled ? "bg-emerald-500" : "bg-[color:var(--muted)]"}`}
      >
        <span className={`absolute left-0.5 size-5 rounded-full bg-white shadow-sm transition-transform ${enabled ? "translate-x-5" : "translate-x-0"}`} />
      </button>
    </div>
  );
}

function RunConfigTab({ runConfig }: { runConfig: DriverBonusRunConfig | null }) {
  const cfg = runConfig ?? {
    welcomeBonusEnabled: true, activityBonusEnabled: false, activityJournalCronHour: 23,
    activityPayoutFrequency: "DAILY" as BonusRunFrequency, activityPayoutCronHour: 6,
    activityPayoutWeeklyDay: 1, activityPayoutMonthlyDay: 1,
    qualityBonusEnabled: false, qualityBonusCronDay: 1, qualityBonusCronHour: 7,
    updatedBy: null, updatedAt: null,
  };

  const [welcome, setWelcome] = useState(cfg.welcomeBonusEnabled);
  const [activity, setActivity] = useState(cfg.activityBonusEnabled);
  const [journalHour, setJournalHour] = useState(String(cfg.activityJournalCronHour));
  const [payoutFreq, setPayoutFreq] = useState<BonusRunFrequency>(cfg.activityPayoutFrequency);
  const [payoutHour, setPayoutHour] = useState(String(cfg.activityPayoutCronHour));
  const [payoutWeekday, setPayoutWeekday] = useState(String(cfg.activityPayoutWeeklyDay));
  const [payoutMonthDay, setPayoutMonthDay] = useState(String(cfg.activityPayoutMonthlyDay));
  const [quality, setQuality] = useState(cfg.qualityBonusEnabled);
  const [qualityCronDay, setQualityCronDay] = useState(String(cfg.qualityBonusCronDay));
  const [qualityCronHour, setQualityCronHour] = useState(String(cfg.qualityBonusCronHour));
  const [pending, start] = useTransition();

  function save() {
    start(async () => {
      const res = await updateRunConfigAction({
        welcomeBonusEnabled: welcome,
        activityBonusEnabled: activity,
        activityJournalCronHour: parseInt(journalHour) || 23,
        activityPayoutFrequency: payoutFreq,
        activityPayoutCronHour: parseInt(payoutHour) || 6,
        activityPayoutWeeklyDay: parseInt(payoutWeekday) || 1,
        activityPayoutMonthlyDay: parseInt(payoutMonthDay) || 1,
        qualityBonusEnabled: quality,
        qualityBonusCronDay: parseInt(qualityCronDay) || 1,
        qualityBonusCronHour: parseInt(qualityCronHour) || 7,
      });
      notify(res, "Cadence mise à jour.");
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 dark:border-violet-800 dark:bg-violet-950/30">
        <p className="text-xs text-violet-700 dark:text-violet-300">
          <strong>Toutes les heures sont en heure de Porto-Novo (UTC+1, pas de DST).</strong> Le worker vérifie toutes les heures si un cron doit tourner. Les systèmes A et B démarrent <em>désactivés</em> par défaut — activez-les explicitement.
        </p>
      </div>

      {/* Kill-switches */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-[color:var(--foreground)]">Kill-switches</h3>
        <CanView permission="driver_bonus.config.manage">
          <KillSwitch label="Bonus Bienvenue (paliers)" description="Versement automatique à chaque palier de courses atteint (lifetime)." enabled={welcome} onToggle={() => setWelcome((v) => !v)} disabled={pending} />
          <KillSwitch label="Bonus Activité quotidienne" description="Calcul nightly + payout sweep selon la cadence ci-dessous." enabled={activity} onToggle={() => setActivity((v) => !v)} disabled={pending} />
          <KillSwitch label="Bonus Qualité mensuelle" description="Évaluation en début de mois sur la note et les courses du mois précédent." enabled={quality} onToggle={() => setQuality((v) => !v)} disabled={pending} />
        </CanView>
      </div>

      {/* Activité — cadence */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-[color:var(--foreground)]">Cadence bonus Activité</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[color:var(--foreground)]">Heure du gel nightly (journal)</label>
            <input type="number" min={0} max={23} value={journalHour} onChange={(e) => setJournalHour(e.target.value)}
              className="rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm outline-none focus:border-[color:var(--primary)]" />
            <p className="text-[10px] text-[color:var(--muted-foreground)]">ex: 23 → le gel tourne à 23h00 heure Porto-Novo chaque nuit</p>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[color:var(--foreground)]">Fréquence des payouts</label>
            <Combobox options={FREQUENCY_OPTIONS} value={payoutFreq} onChange={(v) => setPayoutFreq(v as BonusRunFrequency)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[color:var(--foreground)]">Heure du payout sweep</label>
            <input type="number" min={0} max={23} value={payoutHour} onChange={(e) => setPayoutHour(e.target.value)}
              className="rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm outline-none focus:border-[color:var(--primary)]" />
          </div>
          {payoutFreq === "WEEKLY" && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[color:var(--foreground)]">Jour de la semaine</label>
              <Combobox options={WEEKDAY_OPTIONS} value={payoutWeekday} onChange={setPayoutWeekday} />
            </div>
          )}
          {payoutFreq === "MONTHLY" && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[color:var(--foreground)]">Jour du mois (1-28)</label>
              <input type="number" min={1} max={28} value={payoutMonthDay} onChange={(e) => setPayoutMonthDay(e.target.value)}
                className="rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm outline-none focus:border-[color:var(--primary)]" />
            </div>
          )}
        </div>
      </div>

      {/* Qualité — cadence */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-[color:var(--foreground)]">Cadence bonus Qualité</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[color:var(--foreground)]">Jour du mois (1-28)</label>
            <input type="number" min={1} max={28} value={qualityCronDay} onChange={(e) => setQualityCronDay(e.target.value)}
              className="rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm outline-none focus:border-[color:var(--primary)]" />
            <p className="text-[10px] text-[color:var(--muted-foreground)]">ex: 1 → le 1er de chaque mois</p>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[color:var(--foreground)]">Heure du cron</label>
            <input type="number" min={0} max={23} value={qualityCronHour} onChange={(e) => setQualityCronHour(e.target.value)}
              className="rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm outline-none focus:border-[color:var(--primary)]" />
          </div>
        </div>
      </div>

      {cfg.updatedAt && (
        <p className="text-[10px] text-[color:var(--muted-foreground)]">
          Dernière modification le {formatDate(cfg.updatedAt)}{cfg.updatedBy ? ` par ${cfg.updatedBy.slice(0, 8)}…` : ""}
        </p>
      )}

      <CanView permission="driver_bonus.config.manage">
        <div className="flex justify-end">
          <Button onClick={save} disabled={pending}>
            {pending ? "Enregistrement…" : "Enregistrer la cadence"}
          </Button>
        </div>
      </CanView>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ══════════════════════════════════════════════════════════════════════════════

export interface DriverBonusPageClientProps {
  tierConfigs: DriverBonusTierConfig[];
  awards: DriverBonusAward[];
  awardsTotal: number;
  activityConfigs: DriverBonusActivityConfig[];
  qualityConfigs: DriverBonusQualityConfig[];
  runConfig: DriverBonusRunConfig | null;
  driverNames: Map<string, string>;
}

export function DriverBonusPageClient({
  tierConfigs,
  awards,
  awardsTotal,
  activityConfigs,
  qualityConfigs,
  runConfig,
  driverNames,
}: DriverBonusPageClientProps) {
  const { can } = usePermissions();

  const activeTierCount = tierConfigs.filter((c) => c.isActive).length;
  const activeActivityCount = activityConfigs.filter((c) => c.isActive).length;
  const activeQualityCount = qualityConfigs.filter((c) => c.isActive).length;

  // Onglet Bienvenue — 2 sous-onglets
  const welcomeSubTabs = [
    { value: "configs", label: "Barèmes", badge: activeTierCount > 0 ? { count: activeTierCount, tone: "success" as const } : undefined, content: <ConfigsTab configs={tierConfigs} /> },
    ...(can("driver_bonus.awards.view") ? [{ value: "awards", label: "Historique", badge: awardsTotal > 0 ? { count: awardsTotal, tone: "primary" as const } : undefined, content: <AwardsTab awards={awards} total={awardsTotal} /> }] : []),
  ];

  // Onglet Activité — 3 sous-onglets
  const activitySubTabs = [
    { value: "configs", label: "Barèmes", badge: activeActivityCount > 0 ? { count: activeActivityCount, tone: "success" as const } : undefined, content: <ActivityConfigsTab configs={activityConfigs} /> },
    { value: "ledger", label: "Journal", content: <ActivityLedgerTab driverNames={driverNames} /> },
    { value: "payouts", label: "Payouts", content: <ActivityPayoutsTab driverNames={driverNames} /> },
  ];

  // Onglet Qualité — 2 sous-onglets
  const qualitySubTabs = [
    { value: "configs", label: "Barèmes", badge: activeQualityCount > 0 ? { count: activeQualityCount, tone: "success" as const } : undefined, content: <QualityConfigsTab configs={qualityConfigs} /> },
    { value: "ledger", label: "Journal mensuel", content: <QualityLedgerTab driverNames={driverNames} /> },
  ];

  const tabs = [
    {
      value: "welcome",
      label: (
        <span className="flex items-center gap-1.5">
          <Gift className="size-3.5" />
          Bienvenue
        </span>
      ),
      badge: activeTierCount > 0 ? { count: activeTierCount, tone: "success" as const } : undefined,
      content: (
        <Tabs defaultValue="configs" tabs={welcomeSubTabs} />
      ),
    },
    {
      value: "activity",
      label: (
        <span className="flex items-center gap-1.5">
          <TrendingUp className="size-3.5" />
          Activité
        </span>
      ),
      badge: runConfig?.activityBonusEnabled ? { count: activeActivityCount, tone: "success" as const } : undefined,
      content: (
        <Tabs defaultValue="configs" tabs={activitySubTabs} />
      ),
    },
    {
      value: "quality",
      label: (
        <span className="flex items-center gap-1.5">
          <Star className="size-3.5" />
          Qualité
        </span>
      ),
      badge: runConfig?.qualityBonusEnabled ? { count: activeQualityCount, tone: "success" as const } : undefined,
      content: (
        <Tabs defaultValue="configs" tabs={qualitySubTabs} />
      ),
    },
    {
      value: "cadence",
      label: (
        <span className="flex items-center gap-1.5">
          <Settings className="size-3.5" />
          Cadence
        </span>
      ),
      content: <RunConfigTab runConfig={runConfig} />,
    },
  ];

  return <Tabs defaultValue="welcome" tabs={tabs} />;
}
