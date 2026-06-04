"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Zap,
} from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { ConfirmModal } from "@/shared/ui/confirm-modal";
import { Spinner } from "@/shared/ui/spinner";
import { toast } from "@/shared/ui/toast";
import { formatDate } from "@/shared/lib/format";
import {
  deleteSurgeRuleAction,
  type ActionResult,
} from "../application/surge-actions";
import { DAYS_OF_WEEK_LABELS, type SurgeRule } from "../domain/surge";
import { SurgeRuleModal } from "./surge-rule-modal";

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

  const sorted = [...rules].sort(
    (a, b) => (b.priority ?? 0) - (a.priority ?? 0),
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Zap className="size-5 text-[color:var(--secondary)]" />
            <CardTitle>Règles de surge ({rules.length})</CardTitle>
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
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              Nouvelle règle
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="text-sm text-[color:var(--danger)]">{error}</p>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <AlertTriangle className="size-8 text-[color:var(--muted-foreground)]" />
            <p className="text-sm text-[color:var(--muted-foreground)]">
              Aucune règle de surge active.
            </p>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              Créer la première règle
            </Button>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {sorted.map((rule) => (
              <li
                key={rule.id}
                className="flex flex-col gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-[color:var(--foreground)]">
                      {rule.name}
                    </span>
                    <Badge tone="info">×{rule.multiplier}</Badge>
                    <Badge tone="neutral">priorité {rule.priority}</Badge>
                    {rule.isActive === false ? (
                      <Badge tone="danger">Désactivée</Badge>
                    ) : (
                      <Badge tone="success">Active</Badge>
                    )}
                  </div>
                  {rule.description ? (
                    <p className="text-xs text-[color:var(--muted-foreground)]">
                      {rule.description}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[color:var(--muted-foreground)]">
                    {rule.vehicleTypes && rule.vehicleTypes.length > 0 ? (
                      <span>Véhicules : {rule.vehicleTypes.join(", ")}</span>
                    ) : (
                      <span>Tous véhicules</span>
                    )}
                    {rule.timeWindows && rule.timeWindows.length > 0 ? (
                      <span>
                        {rule.timeWindows
                          .map(
                            (w) =>
                              `${String(w.startHour).padStart(2, "0")}h-${String(w.endHour).padStart(2, "0")}h${
                                w.daysOfWeek && w.daysOfWeek.length > 0
                                  ? " (" +
                                    w.daysOfWeek
                                      .map((d) => DAYS_OF_WEEK_LABELS[d])
                                      .join(",") +
                                    ")"
                                  : ""
                              }`,
                          )
                          .join(" · ")}
                      </span>
                    ) : (
                      <span>24h/24</span>
                    )}
                    {rule.zones && rule.zones.length > 0 ? (
                      <span>
                        Zones : {rule.zones.map((z) => z.name).join(", ")}
                      </span>
                    ) : (
                      <span>Toutes zones</span>
                    )}
                    {rule.specialDates && rule.specialDates.length > 0 ? (
                      <span>
                        Dates spéciales :{" "}
                        {rule.specialDates.map((d) => formatDate(d)).join(", ")}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditTarget(rule)}
                  >
                    <Pencil className="size-4" />
                    Modifier
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteTarget(rule)}
                  >
                    <Trash2 className="size-4" />
                    Supprimer
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

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
    </Card>
  );
}
