"use client";

import { useState, useTransition } from "react";
import { Power, X } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Modal } from "@/shared/ui/modal";
import { toast } from "@/shared/ui/toast";
import { formatDateTime } from "@/shared/lib/format";
import { togglePromoCodeAction } from "../application/actions";
import { AffiliateAttachment } from "./promo-code-affiliate-attachment";
import {
  CAMPAIGN_TYPE_LABELS,
  CHANNEL_LABELS,
  CODE_TYPE_LABELS,
  COMMISSION_BASE_LABELS,
  DISCOUNT_TYPE_LABELS,
  FUNDED_BY_LABELS,
  OBJECTIVE_LABELS,
  TARGETING_LABELS,
  USER_TYPE_LABELS,
  VERTICAL_LABELS,
  discountSummary,
  type PromoCode,
  type SetPromoCodeAffiliateResult,
} from "../domain/promo-code";

export interface PromoCodeDetailModalProps {
  open: boolean;
  promo: PromoCode | null;
  onClose: () => void;
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 py-1.5">
      <dt className="text-[10px] uppercase tracking-wide text-[color:var(--muted-foreground)]">
        {label}
      </dt>
      <dd className="text-sm text-[color:var(--foreground)]">{value}</dd>
    </div>
  );
}

function Section({
  title,
  children,
  cols = 2,
}: {
  title: string;
  children: React.ReactNode;
  cols?: 1 | 2 | 3;
}) {
  const grid =
    cols === 1
      ? "grid-cols-1"
      : cols === 3
        ? "grid-cols-1 sm:grid-cols-3"
        : "grid-cols-1 sm:grid-cols-2";
  return (
    <section className="rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] p-4">
      <h3 className="mb-2 text-sm font-semibold text-[color:var(--foreground)]">
        {title}
      </h3>
      <dl className={`grid gap-x-6 gap-y-1 ${grid}`}>{children}</dl>
    </section>
  );
}

function Pills({ values }: { values: string[] | undefined }) {
  if (!values || values.length === 0)
    return (
      <span className="text-xs italic text-[color:var(--muted-foreground)]">
        —
      </span>
    );
  return (
    <div className="flex flex-wrap gap-1">
      {values.map((v) => (
        <Badge key={v} tone="neutral">
          {v}
        </Badge>
      ))}
    </div>
  );
}

export function PromoCodeDetailModal({
  open,
  promo,
  onClose,
}: PromoCodeDetailModalProps) {
  const [pending, start] = useTransition();
  // Reflète immédiatement un rattachement/détachement d'affilié sans
  // attendre le prochain rafraîchissement de la liste parente.
  const [affiliateOverride, setAffiliateOverride] = useState<SetPromoCodeAffiliateResult | null>(null);
  if (!promo) return null;

  const effectivePromo: PromoCode =
    affiliateOverride && affiliateOverride.promoCodeId === promo.id
      ? { ...promo, affiliateId: affiliateOverride.affiliateId, affiliateCommissionRate: affiliateOverride.affiliateCommissionRate }
      : promo;

  function toggle() {
    if (!promo) return;
    start(async () => {
      const r = await togglePromoCodeAction(promo.id);
      if (r.ok) {
        toast({
          kind: "success",
          title: promo.isActive ? "Code désactivé" : "Code activé",
          description: r.message,
        });
        onClose();
      } else {
        toast({ kind: "error", title: "Échec", description: r.message });
      }
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={`Code ${promo.code}`}
      description={promo.campaignName}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            <X className="size-4" />
            Fermer
          </Button>
          <Button
            variant={promo.isActive ? "outline" : "primary"}
            onClick={toggle}
            isLoading={pending}
          >
            <Power className="size-4" />
            {promo.isActive ? "Désactiver" : "Activer"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {promo.isActive ? (
            <Badge tone="success">Actif</Badge>
          ) : (
            <Badge tone="danger">Désactivé</Badge>
          )}
          {promo.isScheduled ? <Badge tone="info">Programmé</Badge> : null}
          {promo.isPushed ? <Badge tone="primary">Push</Badge> : null}
          <Badge tone="neutral">
            {VERTICAL_LABELS[promo.vertical]}
          </Badge>
          <Badge tone={promo.campaignType === "PERFORMANCE" ? "info" : "warning"}>
            {CAMPAIGN_TYPE_LABELS[promo.campaignType]}
          </Badge>
          <Badge tone="neutral">{OBJECTIVE_LABELS[promo.objective]}</Badge>
        </div>

        <Section title="Identité">
          <Row label="Code" value={<span className="font-mono">{promo.code}</span>} />
          <Row label="Campagne" value={promo.campaignName} />
          <Row
            label="ID interne"
            value={<span className="font-mono text-xs">{promo.id}</span>}
          />
          <Row label="Créé le" value={formatDateTime(promo.createdAt)} />
          {promo.updatedAt ? (
            <Row label="Mis à jour le" value={formatDateTime(promo.updatedAt)} />
          ) : null}
          <Row label="Type de code" value={CODE_TYPE_LABELS[promo.codeType]} />
          <Row label="Canal" value={CHANNEL_LABELS[promo.channel]} />
          <Row label="Cible" value={TARGETING_LABELS[promo.targeting]} />
        </Section>

        <Section title="Réduction" cols={3}>
          <Row
            label="Type"
            value={DISCOUNT_TYPE_LABELS[promo.discountType]}
          />
          <Row label="Résumé" value={discountSummary(promo)} />
          <Row
            label="Plafond"
            value={
              promo.maxDiscountAmount
                ? `${promo.maxDiscountAmount.toLocaleString("fr-FR")} FCFA`
                : "—"
            }
          />
        </Section>

        <Section title="Période">
          <Row label="Début" value={formatDateTime(promo.startDate)} />
          <Row label="Fin" value={formatDateTime(promo.endDate)} />
          <Row
            label="Plages horaires"
            value={
              promo.timeWindows && promo.timeWindows.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {promo.timeWindows.map((w, i) => (
                    <Badge key={i} tone="neutral">
                      {String(w.startHour).padStart(2, "0")}:00 →{" "}
                      {String(w.endHour).padStart(2, "0")}:00
                    </Badge>
                  ))}
                </div>
              ) : (
                <span className="text-xs italic text-[color:var(--muted-foreground)]">
                  Toutes
                </span>
              )
            }
          />
        </Section>

        <Section title="Limites & seuils">
          <Row
            label="Usages totaux"
            value={
              promo.maxTotalUsages
                ? `${(promo.usageCount ?? 0).toLocaleString("fr-FR")} / ${promo.maxTotalUsages.toLocaleString("fr-FR")}`
                : `${(promo.usageCount ?? 0).toLocaleString("fr-FR")} / illimité`
            }
          />
          <Row
            label="Max par utilisateur"
            value={promo.maxUsagesPerUser ?? "—"}
          />
          <Row
            label="Montant min commande"
            value={
              promo.minOrderAmount
                ? `${promo.minOrderAmount.toLocaleString("fr-FR")} FCFA`
                : "—"
            }
          />
          <Row label="Numéro d'usage" value={promo.usageNumber ?? "—"} />
        </Section>

        <Section title="Ciblage">
          <Row
            label="Type d'utilisateur"
            value={USER_TYPE_LABELS[promo.userType ?? "ALL"]}
          />
          <Row label="Zones" value={<Pills values={promo.targetZones} />} />
          <Row
            label="Types de véhicules"
            value={<Pills values={promo.vehicleTypes} />}
          />
          <Row
            label="IDs ciblés"
            value={
              promo.targetUserIds && promo.targetUserIds.length > 0 ? (
                <span className="text-xs">
                  {promo.targetUserIds.length} utilisateur(s)
                </span>
              ) : (
                <span className="text-xs italic text-[color:var(--muted-foreground)]">
                  —
                </span>
              )
            }
          />
        </Section>

        <Section title="Financement">
          <Row label="Financé par" value={FUNDED_BY_LABELS[promo.fundedBy]} />
          <Row
            label="Sponsor ID"
            value={
              promo.sponsorId ? (
                <span className="font-mono text-xs">{promo.sponsorId}</span>
              ) : (
                "—"
              )
            }
          />
          <Row
            label="Budget sponsorisé"
            value={
              promo.sponsoredBudget
                ? `${promo.sponsoredBudget.toLocaleString("fr-FR")} FCFA`
                : "—"
            }
          />
          <Row
            label="Limite quotidienne"
            value={
              promo.dailySpendingLimit
                ? `${promo.dailySpendingLimit.toLocaleString("fr-FR")} FCFA`
                : "—"
            }
          />
          <Row
            label="Base commission affiliée"
            value={promo.commissionBase ? COMMISSION_BASE_LABELS[promo.commissionBase] : COMMISSION_BASE_LABELS.PLATFORM_MARGIN}
          />
          <Row
            label="Campagne à perte budgétée"
            value={
              promo.budgetedLossCampaign ? (
                <Badge tone="warning">Oui — dérogation assumée</Badge>
              ) : (
                <Badge tone="neutral">Non</Badge>
              )
            }
          />
        </Section>

        {promo.budgetedLossCampaign ? (
          <Section title="Coût réel de la campagne" cols={1}>
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-mono font-semibold">
                  {(promo.realCostAccrued ?? 0).toLocaleString("fr-FR")} FCFA dépensés
                </span>
                <span className="text-xs text-[color:var(--muted-foreground)]">
                  sur {promo.sponsoredBudget ? `${promo.sponsoredBudget.toLocaleString("fr-FR")} FCFA` : "budget non défini"}
                </span>
              </div>
              {promo.sponsoredBudget ? (
                <div className="h-2 w-full overflow-hidden rounded-full bg-[color:var(--muted)]">
                  <div
                    className={`h-full rounded-full ${
                      (promo.realCostAccrued ?? 0) >= promo.sponsoredBudget
                        ? "bg-red-500"
                        : (promo.realCostAccrued ?? 0) / promo.sponsoredBudget >= 0.8
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                    }`}
                    style={{
                      width: `${Math.min(100, ((promo.realCostAccrued ?? 0) / promo.sponsoredBudget) * 100)}%`,
                    }}
                  />
                </div>
              ) : null}
              <p className="text-xs text-[color:var(--muted-foreground)]">
                Remise absorbée au-delà de la marge + commission affiliée versée. Dès épuisement du
                budget, plus aucun nouvel usage du code n&apos;est accepté.
              </p>
            </div>
          </Section>
        ) : null}

        <Section title="Affiliation" cols={1}>
          <AffiliateAttachment
            promo={effectivePromo}
            onUpdated={(result) => setAffiliateOverride(result)}
          />
        </Section>

        <Section title="Affichage" cols={1}>
          <Row
            label="Texte affiché"
            value={
              <p className="rounded-md bg-[color:var(--muted)]/40 px-3 py-2 text-sm">
                {promo.displayText}
              </p>
            }
          />
        </Section>
      </div>
    </Modal>
  );
}
