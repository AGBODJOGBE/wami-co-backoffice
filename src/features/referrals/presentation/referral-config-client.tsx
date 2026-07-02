"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Circle,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Settings,
  Trash2,
} from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";
import { Spinner } from "@/shared/ui/spinner";
import { toast } from "@/shared/ui/toast";
import { formatDate, formatXof } from "@/shared/lib/format";
import {
  activateReferralConfigAction,
  deactivateReferralConfigAction,
  deleteReferralConfigAction,
  type ActionResult,
} from "../application/actions";
import {
  REFERRAL_TYPE_LABELS,
  type ReferralConfig,
} from "../domain/referral";
import { ReferralConfigFormModal } from "./referral-config-form-modal";

function notify(result: ActionResult<unknown>, successTitle: string) {
  if (result.ok) {
    toast({ kind: "success", title: successTitle, description: result.message });
  } else {
    toast({ kind: "error", title: "Échec", description: result.message });
  }
}

function ConfigActions({
  config,
  onEdit,
}: {
  config: ReferralConfig;
  onEdit: () => void;
}) {
  const [toggling, startToggle] = useTransition();
  const [deleting, startDelete] = useTransition();

  return (
    <div className="flex items-center gap-2">
      {!config.isActive && (
        <Button
          size="sm"
          variant="outline"
          disabled={toggling || deleting}
          onClick={onEdit}
        >
          <Pencil className="size-3.5" />
          Modifier
        </Button>
      )}
      <Button
        size="sm"
        variant="outline"
        disabled={toggling || deleting}
        onClick={() =>
          startToggle(async () => {
            const res = config.isActive
              ? await deactivateReferralConfigAction(config.id)
              : await activateReferralConfigAction(config.id);
            notify(res, config.isActive ? "Configuration désactivée" : "Configuration activée");
          })
        }
      >
        {toggling ? (
          <Spinner size="sm" />
        ) : (
          <Power className={`size-3.5 ${config.isActive ? "text-red-500" : "text-emerald-600"}`} />
        )}
        {config.isActive ? "Désactiver" : "Activer"}
      </Button>
      {!config.isActive && (
        <Button
          size="sm"
          variant="outline"
          disabled={toggling || deleting}
          onClick={() =>
            startDelete(async () => {
              const res = await deleteReferralConfigAction(config.id);
              notify(res, "Configuration supprimée");
            })
          }
        >
          {deleting ? <Spinner size="sm" /> : <Trash2 className="size-3.5 text-red-500" />}
          Supprimer
        </Button>
      )}
    </div>
  );
}

export interface ReferralConfigClientProps {
  configs: ReferralConfig[];
}

export function ReferralConfigClient({ configs }: ReferralConfigClientProps) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ReferralConfig | null>(null);

  const active   = configs.filter((c) => c.isActive);
  const inactive = configs.filter((c) => !c.isActive && !c.isDeleted);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Marketing · Parrainage"
        title="Configuration du programme"
        description="Gérez les matrices de récompenses, limites et conditions de validation."
        dataSource="live"
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="size-4" />
              Créer une configuration
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={refreshing}
              onClick={() => startRefresh(() => router.refresh())}
            >
              {refreshing ? <Spinner size="sm" /> : <RefreshCw className="size-4" />}
              Rafraîchir
            </Button>
          </div>
        }
      />

      <ReferralConfigFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
      <ReferralConfigFormModal
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        config={editTarget ?? undefined}
      />

      {configs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[color:var(--border)] py-16 text-center text-sm text-[color:var(--muted-foreground)]">
          Aucune configuration de parrainage trouvée.
        </div>
      ) : null}

      {/* Active config */}
      {active.map((config) => (
        <ConfigCard key={config.id} config={config} onEdit={() => setEditTarget(config)} />
      ))}

      {/* Inactive configs */}
      {inactive.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-medium text-[color:var(--muted-foreground)]">
            Configurations inactives ({inactive.length})
          </h2>
          {inactive.map((config) => (
            <ConfigCard key={config.id} config={config} onEdit={() => setEditTarget(config)} />
          ))}
        </div>
      )}
    </div>
  );
}

function ConfigCard({
  config,
  onEdit,
}: {
  config: ReferralConfig;
  onEdit: () => void;
}) {
  const [expanded, setExpanded] = useState(config.isActive);

  return (
    <Card className={config.isActive ? "ring-2 ring-[color:var(--primary)]" : ""}>
      {/* Header */}
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Settings className="size-4 text-[color:var(--primary)]" />
              <CardTitle>{config.name}</CardTitle>
              {config.isActive ? (
                <Badge tone="success">Active</Badge>
              ) : (
                <Badge tone="neutral">Inactive</Badge>
              )}
            </div>
            {config.description ? (
              <p className="text-sm text-[color:var(--muted-foreground)]">{config.description}</p>
            ) : null}
            <div className="flex flex-wrap gap-4 text-xs text-[color:var(--muted-foreground)]">
              <span>Créée le {formatDate(config.createdAt)}</span>
              {config.activatedAt   ? <span>Activée le {formatDate(config.activatedAt)}</span>   : null}
              {config.deactivatedAt ? <span>Désactivée le {formatDate(config.deactivatedAt)}</span> : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setExpanded((p) => !p)}
            >
              {expanded ? "Réduire" : "Détails"}
            </Button>
            <ConfigActions config={config} onEdit={onEdit} />
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="flex flex-col gap-6 border-t border-[color:var(--border)] pt-5">
          {/* Reward matrix */}
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
              Matrice de récompenses
            </h3>
            <div className="overflow-x-auto rounded-lg border border-[color:var(--border)]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[color:var(--border)] bg-[color:var(--muted)]/50">
                    <th className="px-3 py-2 text-left font-medium text-[color:var(--muted-foreground)]">Type parrain</th>
                    <th className="px-3 py-2 text-left font-medium text-[color:var(--muted-foreground)]">Type filleul</th>
                    <th className="px-3 py-2 text-left font-medium text-[color:var(--muted-foreground)]">Mode</th>
                    <th className="px-3 py-2 text-right font-medium text-[color:var(--muted-foreground)]">Parrain gagne</th>
                    <th className="px-3 py-2 text-right font-medium text-[color:var(--muted-foreground)]">Filleul gagne</th>
                  </tr>
                </thead>
                <tbody>
                  {config.rewardMatrix.map((entry, i) => (
                    <tr
                      key={i}
                      className="border-b border-[color:var(--border)] last:border-0 hover:bg-[color:var(--muted)]/30"
                    >
                      <td className="px-3 py-2">
                        <Badge tone="neutral">
                          {REFERRAL_TYPE_LABELS[entry.referrerType as keyof typeof REFERRAL_TYPE_LABELS] ?? entry.referrerType}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        <Badge tone="primary">
                          {REFERRAL_TYPE_LABELS[entry.referredType as keyof typeof REFERRAL_TYPE_LABELS] ?? entry.referredType}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-[color:var(--muted-foreground)]">
                        {entry.rewardMode === "FIXED" ? "Fixe" : "Pourcentage"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-emerald-600">
                        {entry.rewardMode === "FIXED"
                          ? formatXof(entry.referrerAmount)
                          : `${entry.referrerAmount}%`}
                        {entry.referrerCap ? (
                          <span className="ml-1 text-[10px] text-[color:var(--muted-foreground)]">
                            (max {formatXof(entry.referrerCap)})
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-[color:var(--primary)]">
                        {entry.rewardMode === "FIXED"
                          ? formatXof(entry.referredAmount)
                          : `${entry.referredAmount}%`}
                        {entry.referredCap ? (
                          <span className="ml-1 text-[10px] text-[color:var(--muted-foreground)]">
                            (max {formatXof(entry.referredCap)})
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Validation conditions + limits */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Conditions de validation */}
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
                Conditions de validation
              </h3>
              <div className="flex flex-col gap-2">
                {config.validationConditions.perType.map((cond, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-lg bg-[color:var(--muted)]/50 px-3 py-2 text-xs"
                  >
                    <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />
                    <span>
                      <strong>{REFERRAL_TYPE_LABELS[cond.referredType as keyof typeof REFERRAL_TYPE_LABELS] ?? cond.referredType}</strong>
                      {" — "}
                      {cond.actionsRequired} {cond.actionType.toLowerCase()}
                      {cond.actionsRequired > 1 ? "s" : ""}
                    </span>
                  </div>
                ))}
                {config.validationConditions.expirationDays != null && (
                  <div className="flex items-center gap-3 rounded-lg border border-dashed border-[color:var(--border)] px-3 py-2 text-xs text-[color:var(--muted-foreground)]">
                    <Circle className="size-3.5 shrink-0" />
                    Expiration après{" "}
                    <strong>{config.validationConditions.expirationDays} jours</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Limites */}
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
                Limites
              </h3>
              <div className="flex flex-col gap-2">
                {config.limits.perType.map((lim, i) => (
                  <div
                    key={i}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[color:var(--muted)]/50 px-3 py-2 text-xs"
                  >
                    <Badge tone="neutral">
                      {REFERRAL_TYPE_LABELS[lim.referredType as keyof typeof REFERRAL_TYPE_LABELS] ?? lim.referredType}
                    </Badge>
                    <span className="text-[color:var(--muted-foreground)]">
                      <span className="font-semibold text-[color:var(--foreground)]">{lim.maxPerDay}</span>/jour ·{" "}
                      <span className="font-semibold text-[color:var(--foreground)]">{lim.maxPerMonth}</span>/mois
                    </span>
                  </div>
                ))}
                {config.limits.maxReferralsPerDayGlobal != null && (
                  <div className="flex items-center justify-between rounded-lg border border-dashed border-[color:var(--border)] px-3 py-2 text-xs">
                    <span className="text-[color:var(--muted-foreground)]">Limite globale / jour</span>
                    <span className="font-mono font-semibold">{config.limits.maxReferralsPerDayGlobal}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
