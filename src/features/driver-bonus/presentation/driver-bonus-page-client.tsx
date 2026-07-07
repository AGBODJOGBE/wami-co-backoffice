"use client";

import { useState, useTransition } from "react";
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
  Trash2,
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
  type BonusTier,
  type DriverBonusAward,
  type DriverBonusTierConfig,
  type DriverBonusVehicleCategory,
} from "../domain/driver-bonus";
import {
  activateDriverBonusConfigAction,
  createDriverBonusConfigAction,
  deactivateDriverBonusConfigAction,
  deleteDriverBonusConfigAction,
  updateDriverBonusConfigAction,
  type ActionResult,
} from "../application/actions";
import { CanView } from "@/shared/ui/can-view";
import { usePermissions } from "@/features/auth/presentation/use-permissions";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── TiersEditor ──────────────────────────────────────────────────────────────

function TiersEditor({
  tiers,
  onChange,
}: {
  tiers: BonusTier[];
  onChange: (t: BonusTier[]) => void;
}) {
  function addRow() {
    onChange([...tiers, { ridesThreshold: 0, bonusAmount: 0 }]);
  }
  function removeRow(i: number) {
    onChange(tiers.filter((_, idx) => idx !== i));
  }
  function update(i: number, field: keyof BonusTier, val: number) {
    onChange(tiers.map((t, idx) => (idx === i ? { ...t, [field]: val } : t)));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[color:var(--muted-foreground)] uppercase tracking-wide">
          Paliers
        </span>
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="size-3" /> Ajouter
        </Button>
      </div>
      {tiers.length === 0 && (
        <p className="text-xs text-[color:var(--muted-foreground)] italic">
          Aucun palier. Ajoutez-en au moins un.
        </p>
      )}
      {tiers.map((t, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)]/20 px-3 py-2">
            <div className="flex flex-1 flex-col gap-0.5">
              <label className="text-[10px] text-[color:var(--muted-foreground)]">Nb courses</label>
              <input
                type="number"
                min={1}
                value={t.ridesThreshold || ""}
                onChange={(e) => update(i, "ridesThreshold", parseInt(e.target.value) || 0)}
                className="w-full bg-transparent text-sm font-medium outline-none"
              />
            </div>
            <span className="text-[color:var(--muted-foreground)]">→</span>
            <div className="flex flex-1 flex-col gap-0.5">
              <label className="text-[10px] text-[color:var(--muted-foreground)]">Bonus (FCFA)</label>
              <input
                type="number"
                min={1}
                value={t.bonusAmount || ""}
                onChange={(e) => update(i, "bonusAmount", parseInt(e.target.value) || 0)}
                className="w-full bg-transparent text-sm font-medium outline-none"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => removeRow(i)}
            className="text-[color:var(--danger)] hover:opacity-70"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── ConfigForm ───────────────────────────────────────────────────────────────

interface ConfigFormProps {
  initial?: DriverBonusTierConfig;
  onClose: () => void;
}

function ConfigForm({ initial, onClose }: ConfigFormProps) {
  const isEdit = Boolean(initial);
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [vehicleCategory, setVehicleCategory] = useState<DriverBonusVehicleCategory>(
    initial?.vehicleCategory ?? "ALL",
  );
  const [tiers, setTiers] = useState<BonusTier[]>(initial?.tiers ?? []);
  const [pending, start] = useTransition();

  function validate() {
    if (!name.trim()) return "Le nom est requis.";
    if (tiers.length === 0) return "Ajoutez au moins un palier.";
    if (tiers.some((t) => t.ridesThreshold <= 0 || t.bonusAmount <= 0))
      return "Chaque palier doit avoir un seuil et un montant > 0.";
    const thresholds = tiers.map((t) => t.ridesThreshold);
    if (new Set(thresholds).size !== thresholds.length)
      return "Les seuils de courses doivent être uniques.";
    return null;
  }

  function submit() {
    const err = validate();
    if (err) { toast({ kind: "error", title: "Validation", description: err }); return; }

    start(async () => {
      let res: ActionResult;
      if (isEdit && initial) {
        res = await updateDriverBonusConfigAction(initial.id, {
          name: name.trim(),
          description: description.trim() || null,
          tiers,
        });
      } else {
        res = await createDriverBonusConfigAction({
          name: name.trim(),
          description: description.trim() || null,
          vehicleCategory,
          tiers,
        });
      }
      notify(res, isEdit ? "Barème mis à jour." : "Barème créé.");
      if (res.ok) onClose();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-[color:var(--foreground)]">Nom *</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ex: Barème standard"
          className="rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm outline-none focus:border-[color:var(--primary)]"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-[color:var(--foreground)]">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Optionnel"
          className="rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm outline-none focus:border-[color:var(--primary)] resize-none"
        />
      </div>

      {!isEdit && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[color:var(--foreground)]">Catégorie véhicule *</label>
          <Combobox
            options={VEHICLE_CATEGORIES.map((c) => ({
              value: c,
              label: VEHICLE_CATEGORY_META[c].label,
            }))}
            value={vehicleCategory}
            onChange={(v) => setVehicleCategory(v as DriverBonusVehicleCategory)}
          />
          <p className="text-[10px] text-[color:var(--muted-foreground)]">
            Non modifiable après création. Utilisez &quot;Toutes&quot; comme barème de fallback.
          </p>
        </div>
      )}

      <TiersEditor tiers={tiers} onChange={setTiers} />

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose} disabled={pending}>Annuler</Button>
        <Button onClick={submit} disabled={pending}>
          {pending ? "Enregistrement…" : isEdit ? "Mettre à jour" : "Créer"}
        </Button>
      </div>
    </div>
  );
}

// ─── ConfigCard ───────────────────────────────────────────────────────────────

function ConfigCard({ config }: { config: DriverBonusTierConfig }) {
  const [expanded, setExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [pending, start] = useTransition();

  const cat = VEHICLE_CATEGORY_META[config.vehicleCategory];

  function toggleActive() {
    start(async () => {
      const res = config.isActive
        ? await deactivateDriverBonusConfigAction(config.id)
        : await activateDriverBonusConfigAction(config.id);
      notify(res, config.isActive ? "Barème désactivé." : "Barème activé.");
    });
  }

  function remove() {
    start(async () => {
      const res = await deleteDriverBonusConfigAction(config.id);
      notify(res, "Barème supprimé.");
      setDeleteConfirm(false);
    });
  }

  return (
    <>
      <Card className={`transition-all ${config.isActive ? "border-emerald-400 dark:border-emerald-600" : ""}`}>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">{config.name}</CardTitle>
                <Badge tone={cat.tone}>{cat.label}</Badge>
                {config.isActive ? (
                  <Badge tone="success">Actif</Badge>
                ) : (
                  <Badge tone="neutral">Inactif</Badge>
                )}
              </div>
              {config.description && (
                <p className="text-xs text-[color:var(--muted-foreground)]">{config.description}</p>
              )}
              <p className="text-[10px] text-[color:var(--muted-foreground)]">
                {config.tiers.length} palier{config.tiers.length > 1 ? "s" : ""}
                {config.activatedAt ? ` · Activé le ${formatDate(config.activatedAt)}` : ""}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                {expanded ? "Réduire" : "Paliers"}
              </Button>
              <CanView permission="driver_bonus.config.manage">
                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} disabled={pending}>
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleActive}
                  disabled={pending}
                >
                  {config.isActive
                    ? <><PowerOff className="size-4" /> Désactiver</>
                    : <><Power className="size-4" /> Activer</>}
                </Button>
                {!config.isActive && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteConfirm(true)}
                    disabled={pending}
                  >
                    <Trash2 className="size-4 text-[color:var(--danger)]" />
                  </Button>
                )}
              </CanView>
            </div>
          </div>
        </CardHeader>

        {expanded && config.tiers.length > 0 && (
          <CardContent>
            <div className="flex flex-col gap-1">
              {[...config.tiers]
                .sort((a, b) => a.ridesThreshold - b.ridesThreshold)
                .map((t) => (
                  <div
                    key={t.ridesThreshold}
                    className="flex items-center justify-between rounded-lg bg-[color:var(--muted)]/30 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <Zap className="size-3.5 text-[color:var(--primary)]" />
                      <span className="text-sm font-medium">
                        {t.ridesThreshold} course{t.ridesThreshold > 1 ? "s" : ""}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      +{formatXof(t.bonusAmount)}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        )}
      </Card>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Modifier le barème">
        <ConfigForm initial={config} onClose={() => setEditOpen(false)} />
      </Modal>

      <Modal open={deleteConfirm} onClose={() => setDeleteConfirm(false)} title="Supprimer le barème">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-[color:var(--foreground)]">
            Confirmer la suppression de <strong>{config.name}</strong> ? Cette action est irréversible.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(false)} disabled={pending}>
              Annuler
            </Button>
            <Button onClick={remove} disabled={pending}>
              {pending ? "Suppression…" : "Supprimer"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

// ─── ConfigsTab ───────────────────────────────────────────────────────────────

function ConfigsTab({ configs }: { configs: DriverBonusTierConfig[] }) {
  const [catFilter, setCatFilter] = useState("ALL_FILTER");
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = catFilter === "ALL_FILTER"
    ? configs
    : configs.filter((c) => c.vehicleCategory === catFilter);

  const active = filtered.filter((c) => c.isActive);
  const inactive = filtered.filter((c) => !c.isActive);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Combobox
          options={CAT_OPTIONS}
          value={catFilter}
          onChange={setCatFilter}
          className="w-48"
        />
        <CanView permission="driver_bonus.config.manage">
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Nouveau barème
          </Button>
        </CanView>
      </div>

      {filtered.length === 0 && (
        <Card className="flex flex-col items-center gap-3 py-12 text-center">
          <Gift className="size-10 text-[color:var(--muted-foreground)]" />
          <p className="text-sm text-[color:var(--muted-foreground)]">Aucun barème pour cette catégorie.</p>
        </Card>
      )}

      {active.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
            Actifs ({active.length})
          </p>
          {active.map((c) => <ConfigCard key={c.id} config={c} />)}
        </div>
      )}

      {inactive.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
            Inactifs ({inactive.length})
          </p>
          {inactive.map((c) => <ConfigCard key={c.id} config={c} />)}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nouveau barème">
        <ConfigForm onClose={() => setCreateOpen(false)} />
      </Modal>
    </div>
  );
}

// ─── AwardsTab ────────────────────────────────────────────────────────────────

function AwardsTab({ awards, total }: { awards: DriverBonusAward[]; total: number }) {
  const [catFilter, setCatFilter] = useState("ALL_FILTER");

  const filtered = catFilter === "ALL_FILTER"
    ? awards
    : awards.filter((a) => a.vehicleCategory === catFilter);

  const columns: ColumnDef<DriverBonusAward>[] = [
    {
      key: "driver",
      header: "Driver ID",
      render: (r) => (
        <span className="font-mono text-xs text-[color:var(--muted-foreground)]">
          {r.driverId.slice(0, 8)}…
        </span>
      ),
    },
    {
      key: "category",
      header: "Catégorie",
      render: (r) => {
        const m = VEHICLE_CATEGORY_META[r.vehicleCategory];
        return <Badge tone={m.tone}>{m.label}</Badge>;
      },
    },
    {
      key: "threshold",
      header: "Palier",
      sortAccessor: (r) => r.ridesThreshold,
      render: (r) => (
        <span className="inline-flex items-center gap-1 text-sm">
          <Zap className="size-3 text-[color:var(--primary)]" />
          {r.ridesThreshold} courses
        </span>
      ),
    },
    {
      key: "bonus",
      header: "Bonus versé",
      align: "right",
      sortAccessor: (r) => r.bonusAmount,
      render: (r) => (
        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          +{formatXof(r.bonusAmount)}
        </span>
      ),
    },
    {
      key: "tx",
      header: "Transaction",
      render: (r) =>
        r.transactionId ? (
          <span className="font-mono text-xs text-[color:var(--muted-foreground)]">
            {r.transactionId.slice(0, 10)}…
          </span>
        ) : (
          <Badge tone="warning">En attente</Badge>
        ),
    },
    {
      key: "date",
      header: "Date",
      sortAccessor: (r) => r.awardedAt,
      render: (r) => (
        <span className="text-xs text-[color:var(--muted-foreground)]">{formatDate(r.awardedAt)}</span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Combobox
          options={CAT_OPTIONS}
          value={catFilter}
          onChange={setCatFilter}
          className="w-48"
        />
        <p className="text-xs text-[color:var(--muted-foreground)]">
          {total} bonus versé{total > 1 ? "s" : ""} au total
        </p>
      </div>

      {filtered.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-12 text-center">
          <Award className="size-10 text-[color:var(--muted-foreground)]" />
          <p className="text-sm text-[color:var(--muted-foreground)]">Aucun bonus versé.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <DataTable
            rows={filtered}
            columns={columns}
            rowKey={(r) => r.id}
            defaultSort={{ key: "date", direction: "desc" }}
          />
          <PaginationFooter total={total} shown={filtered.length} />
        </Card>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export interface DriverBonusPageClientProps {
  configs: DriverBonusTierConfig[];
  awards: DriverBonusAward[];
  awardsTotal: number;
}

export function DriverBonusPageClient({
  configs,
  awards,
  awardsTotal,
}: DriverBonusPageClientProps) {
  const activeCount = configs.filter((c) => c.isActive).length;
  const { can } = usePermissions();

  const tabs = [
    {
      value: "configs",
      label: "Barèmes",
      badge: activeCount > 0 ? { count: activeCount, tone: "success" as const } : undefined,
      content: <ConfigsTab configs={configs} />,
    },
    ...(can("driver_bonus.awards.view")
      ? [
          {
            value: "awards",
            label: "Historique bonus",
            badge: awardsTotal > 0 ? { count: awardsTotal, tone: "primary" as const } : undefined,
            content: <AwardsTab awards={awards} total={awardsTotal} />,
          },
        ]
      : []),
  ];

  return (
    <Tabs
      defaultValue="configs"
      tabs={tabs}
    />
  );
}
