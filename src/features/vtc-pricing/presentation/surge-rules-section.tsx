"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Clock,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Zap,
} from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { ConfirmModal } from "@/shared/ui/confirm-modal";
import { Spinner } from "@/shared/ui/spinner";
import { toast } from "@/shared/ui/toast";
import { formatDate } from "@/shared/lib/format";
import { DevNote } from "@/shared/ui/dev-note";
import {
  deleteSurgeRuleAction,
  type ActionResult,
} from "../application/surge-actions";
import { DAYS_OF_WEEK_LABELS, type SurgeRule } from "../domain/surge";
import { SurgeRuleModal } from "./surge-rule-modal";
import { CanView } from "@/shared/ui/can-view";

function notify(result: ActionResult<unknown>, successTitle: string) {
  if (result.ok) {
    toast({ kind: "success", title: successTitle, description: result.message });
  } else {
    toast({ kind: "error", title: "Échec", description: result.message });
  }
}

function multiplierTone(m: number): "info" | "warning" | "danger" {
  if (m >= 2.0) return "danger";
  if (m >= 1.5) return "warning";
  return "info";
}

export interface SurgeRulesSectionProps {
  rules: SurgeRule[];
  error?: string;
}

export function SurgeRulesSection({ rules, error }: SurgeRulesSectionProps) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [editTarget, setEditTarget] = useState<SurgeRule | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SurgeRule | null>(null);
  const [deleting, startDelete] = useTransition();

  function runDelete() {
    if (!deleteTarget) return;
    startDelete(async () => {
      const r = await deleteSurgeRuleAction(deleteTarget.id);
      notify(r, "Règle supprimée");
      if (r.ok) setDeleteTarget(null);
    });
  }

  const activeCount = rules.filter((r) => r.isActive !== false).length;
  const sorted = [...rules].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Zap className="size-5 text-[color:var(--primary)]" />
          <div>
            <h2 className="text-base font-semibold text-[color:var(--foreground)]">
              Règles de surge
            </h2>
            <p className="text-xs text-[color:var(--muted-foreground)]">
              {activeCount} active{activeCount !== 1 ? "s" : ""} sur {rules.length} règle{rules.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => startRefresh(() => router.refresh())}
            disabled={refreshing}
          >
            {refreshing ? <Spinner size="sm" /> : <RefreshCw className="size-4" />}
            Rafraîchir
          </Button>
          <CanView permission="pricing.grid.configure">
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              Nouvelle règle
            </Button>
          </CanView>
        </div>
      </div>

      <DevNote>
        ⚠️ Bug backend confirmé : <code>POST /api/admin/surge-rules</code> échoue avec{" "}
        <em>Cast to ObjectId failed</em> — le schéma Mongoose génère un UUID v4 comme{" "}
        <code>_id</code> alors que MongoDB attend un ObjectId. À corriger dans le backend
        (model SurgeRule, champ <code>_id</code>).
      </DevNote>

      {error && (
        <div className="rounded-xl border border-[color:var(--danger)]/30 bg-[color:var(--danger)]/10 px-4 py-3 text-sm text-[color:var(--danger)]">
          {error}
        </div>
      )}

      {/* Rules list */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[color:var(--border)] py-12 text-center">
          <AlertTriangle className="size-8 text-[color:var(--muted-foreground)]" />
          <div>
            <p className="text-sm font-medium text-[color:var(--foreground)]">Aucune règle de surge</p>
            <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
              Les règles de surge multiplient automatiquement les tarifs selon des conditions.
            </p>
          </div>
          <CanView permission="pricing.grid.configure">
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              Créer la première règle
            </Button>
          </CanView>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((rule) => (
            <SurgeRuleCard
              key={rule.id}
              rule={rule}
              onEdit={() => setEditTarget(rule)}
              onDelete={() => setDeleteTarget(rule)}
            />
          ))}
        </div>
      )}

      <SurgeRuleModal
        open={createOpen || !!editTarget}
        rule={editTarget}
        onClose={() => {
          setCreateOpen(false);
          setEditTarget(null);
        }}
      />

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={runDelete}
        title="Supprimer cette règle de surge ?"
        description={
          deleteTarget ? (
            <p>
              <strong>{deleteTarget.name}</strong> — multiplicateur ×
              {deleteTarget.multiplier}. Cette règle ne s&apos;appliquera plus
              aux courses dès confirmation.
            </p>
          ) : null
        }
        confirmLabel="Supprimer"
        tone="danger"
        isLoading={deleting}
      />
    </div>
  );
}

// ─── SurgeRuleCard ────────────────────────────────────────────────────────────

function SurgeRuleCard({
  rule,
  onEdit,
  onDelete,
}: {
  rule: SurgeRule;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isActive = rule.isActive !== false;

  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        isActive
          ? "border-[color:var(--primary)]/30 bg-[color:var(--background)]"
          : "border-[color:var(--border)] bg-[color:var(--muted)]/20"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        {/* Left: multiplier + info */}
        <div className="flex items-start gap-4">
          {/* Multiplier display */}
          <div className="flex flex-col items-center rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)]/40 px-4 py-2.5 text-center">
            <span className="text-xl font-black text-[color:var(--foreground)]">
              ×{rule.multiplier}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-[color:var(--muted-foreground)]">
              surge
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-[color:var(--foreground)]">
                {rule.name}
              </span>
              <Badge tone={multiplierTone(rule.multiplier)}>
                ×{rule.multiplier}
              </Badge>
              <Badge tone="neutral">priorité {rule.priority}</Badge>
              {isActive ? (
                <Badge tone="success">Active</Badge>
              ) : (
                <Badge tone="danger">Désactivée</Badge>
              )}
            </div>

            {rule.description && (
              <p className="text-xs text-[color:var(--muted-foreground)]">
                {rule.description}
              </p>
            )}

            {/* Metadata row */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[color:var(--muted-foreground)]">
              {/* Vehicles */}
              <span className="flex items-center gap-1">
                <span className="font-medium text-[color:var(--foreground)]">
                  {rule.vehicleTypes && rule.vehicleTypes.length > 0
                    ? rule.vehicleTypes.join(", ")
                    : "Tous véhicules"}
                </span>
              </span>

              {/* Time windows */}
              {rule.timeWindows && rule.timeWindows.length > 0 ? (
                <span className="flex items-center gap-1">
                  <Clock className="size-3 shrink-0" />
                  {rule.timeWindows
                    .map(
                      (w) =>
                        `${String(w.startHour).padStart(2, "0")}h–${String(w.endHour).padStart(2, "0")}h${
                          w.daysOfWeek && w.daysOfWeek.length > 0
                            ? " (" +
                              w.daysOfWeek
                                .map((d) => DAYS_OF_WEEK_LABELS[d])
                                .join(", ") +
                              ")"
                            : ""
                        }`,
                    )
                    .join(" · ")}
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Clock className="size-3 shrink-0" />
                  24h/24
                </span>
              )}

              {/* Zones */}
              {rule.zones && rule.zones.length > 0 && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-3 shrink-0" />
                  {rule.zones.map((z) => z.name).join(", ")}
                </span>
              )}

              {/* Special dates */}
              {rule.specialDates && rule.specialDates.length > 0 && (
                <span>
                  Dates : {rule.specialDates.map((d) => formatDate(d)).join(", ")}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <CanView permission="pricing.grid.configure">
          <div className="flex flex-shrink-0 items-center gap-2">
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Pencil className="size-4" />
              Modifier
            </Button>
            <button
              type="button"
              onClick={onDelete}
              className="rounded-lg p-2 text-[color:var(--muted-foreground)] transition-colors hover:bg-[color:var(--muted)] hover:text-[color:var(--danger)]"
              title="Supprimer"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </CanView>
      </div>
    </div>
  );
}
