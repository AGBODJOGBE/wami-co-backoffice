"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  Plus,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Combobox } from "@/shared/ui/combobox";
import { Input } from "@/shared/ui/input";
import { Modal } from "@/shared/ui/modal";
import { PageHeader } from "@/shared/ui/page-header";
import { Spinner } from "@/shared/ui/spinner";
import { toast } from "@/shared/ui/toast";
import { formatDate, formatXof } from "@/shared/lib/format";
import { CanView } from "@/shared/ui/can-view";
import { previewWalletGrant } from "../application/grant-api";
import {
  createGrantCampaignAction,
  type CreateGrantCampaignInput,
} from "../application/grant-actions";
import {
  GRANT_AUDIENCE_LABELS,
  GRANT_BALANCE_LABELS,
  GRANT_STATUS_LABELS,
  type GrantAudience,
  type GrantBalanceType,
  type WalletGrantCampaignListItem,
  type WalletGrantCampaignStatus,
  type WalletGrantPreview,
} from "../domain/wallet-grant";

interface Props {
  campaigns: WalletGrantCampaignListItem[];
  total:     number;
}

export function WalletGrantsPage({ campaigns, total }: Props) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);

  const pendingCount = campaigns.filter((c) => c.status === "PENDING_APPROVAL").length;
  const failedCount  = campaigns.filter((c) => c.status === "PARTIALLY_FAILED").length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Finance · Wallet"
        title="Campagnes de crédit"
        description={`${total} campagne${total !== 1 ? "s" : ""}${pendingCount > 0 ? ` — ${pendingCount} en attente d'approbation` : ""}${failedCount > 0 ? ` — ${failedCount} partiellement échouée${failedCount !== 1 ? "s" : ""}` : ""}`}
        dataSource="live"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => startRefresh(() => router.refresh())}
              disabled={refreshing}
            >
              {refreshing ? <Spinner size="sm" /> : <RefreshCw className="size-4" />}
              Rafraîchir
            </Button>
            <CanView permission="wallet.grant.request">
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" />
                Nouvelle campagne
              </Button>
            </CanView>
          </div>
        }
      />

      {campaigns.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <p className="text-sm font-medium">Aucune campagne de crédit</p>
          <p className="max-w-sm text-xs text-[color:var(--muted-foreground)]">
            Créez une campagne pour créditer en masse des wallets chauffeurs ou passagers.
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-[color:var(--border)] text-left text-[11px] uppercase tracking-wider text-[color:var(--muted-foreground)]">
                <th className="px-5 py-2.5 font-medium">Libellé</th>
                <th className="px-5 py-2.5 font-medium">Audience</th>
                <th className="px-5 py-2.5 font-medium">Balance</th>
                <th className="px-5 py-2.5 text-right font-medium">Par bénéf.</th>
                <th className="px-5 py-2.5 text-right font-medium">Total</th>
                <th className="px-5 py-2.5 font-medium">Statut</th>
                <th className="px-5 py-2.5 font-medium">Progression</th>
                <th className="px-5 py-2.5 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--border)]">
              {campaigns.map((c) => (
                <tr key={c.campaignId} className="hover:bg-[color:var(--muted)]/30">
                  <td className="px-5 py-3">
                    <Link
                      href={`/wallet/grants/${c.campaignId}`}
                      className="font-medium hover:text-[color:var(--primary)]"
                    >
                      {c.label}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-xs">{GRANT_AUDIENCE_LABELS[c.audience] ?? c.audience}</td>
                  <td className="px-5 py-3 text-xs">{GRANT_BALANCE_LABELS[c.balanceType as GrantBalanceType] ?? c.balanceType}</td>
                  <td className="px-5 py-3 text-right font-mono text-xs">{formatXof(c.amountPerBeneficiary)}</td>
                  <td className="px-5 py-3 text-right font-mono font-semibold">{formatXof(c.totalAmount)}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-5 py-3">
                    {c.status === "APPROVED" || c.status === "COMPLETED" || c.status === "PARTIALLY_FAILED" ? (
                      <div className="flex items-center gap-1.5 text-xs">
                        <CheckCircle2 className="size-3 text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400">{c.creditedCount}</span>
                        {c.failedCount > 0 && (
                          <>
                            <XCircle className="size-3 text-red-500" />
                            <span className="text-red-600 dark:text-red-400">{c.failedCount}</span>
                          </>
                        )}
                        <span className="text-[color:var(--muted-foreground)]">/ {c.beneficiaryCount}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-[color:var(--muted-foreground)]">
                        {c.beneficiaryCount} bénéf.
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-xs text-[color:var(--muted-foreground)]">
                    {formatDate(c.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <CreateGrantModal
        open={createOpen}
        onClose={() => { setCreateOpen(false); router.refresh(); }}
      />
    </div>
  );
}

// ─── Badge statut ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: WalletGrantCampaignStatus }) {
  const tone =
    status === "COMPLETED"        ? "success"
    : status === "APPROVED"       ? "info"
    : status === "PENDING_APPROVAL" ? "warning"
    : status === "PARTIALLY_FAILED" ? "danger"
    : "neutral";
  return <Badge tone={tone}>{GRANT_STATUS_LABELS[status] ?? status}</Badge>;
}

// ─── Wizard de création (2 étapes : formulaire → preview → confirm) ───────────

type WizardStep = "form" | "preview";

const DEFAULT_FORM: CreateGrantCampaignInput = {
  audience:             "DRIVER",
  label:                "",
  balanceType:          "MAIN",
  amountPerBeneficiary: 0,
  expiresAt:            null,
  targeting:            { mode: "FILTER", filters: {} },
};

function CreateGrantModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep]     = useState<WizardStep>("form");
  const [form, setForm]     = useState<CreateGrantCampaignInput>(DEFAULT_FORM);
  const [preview, setPreview] = useState<WalletGrantPreview | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setStep("form");
    setForm(DEFAULT_FORM);
    setPreview(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handlePreview() {
    if (!form.label.trim() || form.label.length < 10) {
      toast({ kind: "error", title: "Libellé trop court", description: "10 caractères minimum." });
      return;
    }
    if (form.amountPerBeneficiary <= 0) {
      toast({ kind: "error", title: "Montant invalide", description: "Le montant doit être > 0." });
      return;
    }
    startTransition(async () => {
      try {
        const result = await previewWalletGrant({
          audience:             form.audience,
          balanceType:          form.balanceType,
          amountPerBeneficiary: form.amountPerBeneficiary,
          targeting:            form.targeting,
        });
        setPreview(result);
        setStep("preview");
      } catch (err) {
        toast({ kind: "error", title: "Prévisualisation échouée", description: err instanceof Error ? err.message : "Erreur" });
      }
    });
  }

  function handleCreate() {
    startTransition(async () => {
      const res = await createGrantCampaignAction(form);
      if (res.success) {
        toast({
          kind: "success",
          title: "Campagne soumise",
          description: `${res.data?.beneficiaryCount} bénéficiaires · ${formatXof(res.data?.totalAmount ?? 0)} — en attente d'approbation.`,
        });
        handleClose();
      } else {
        toast({ kind: "error", title: "Création échouée", description: res.error });
      }
    });
  }

  const hasViolations = preview && preview.capViolations.length > 0;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      size="lg"
      title={step === "form" ? "Nouvelle campagne de crédit" : "Prévisualisation"}
      description={
        step === "form"
          ? "Définissez l'audience, le montant et le ciblage. La campagne sera soumise à approbation (maker/checker)."
          : "Vérifiez les détails avant de soumettre la campagne."
      }
      footer={
        step === "form" ? (
          <>
            <Button variant="ghost" onClick={handleClose} disabled={pending}>Annuler</Button>
            <Button onClick={handlePreview} disabled={pending || !form.label.trim() || form.amountPerBeneficiary <= 0}>
              {pending && <Spinner size="sm" />}
              Prévisualiser →
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={() => setStep("form")} disabled={pending}>← Modifier</Button>
            <Button
              onClick={handleCreate}
              disabled={pending || !!hasViolations}
              variant={hasViolations ? "danger" : "primary"}
            >
              {pending && <Spinner size="sm" />}
              Soumettre pour approbation
            </Button>
          </>
        )
      }
    >
      {step === "form" ? (
        <GrantFormStep form={form} onChange={setForm} />
      ) : preview ? (
        <GrantPreviewStep preview={preview} form={form} />
      ) : null}
    </Modal>
  );
}

// ─── Étape 1 : formulaire ─────────────────────────────────────────────────────

function GrantFormStep({
  form,
  onChange,
}: {
  form: CreateGrantCampaignInput;
  onChange: (f: CreateGrantCampaignInput) => void;
}) {
  const [explicitIds, setExplicitIds] = useState(
    form.targeting.mode === "EXPLICIT" ? (form.targeting.beneficiaryIds ?? []).join("\n") : "",
  );

  function setField<K extends keyof CreateGrantCampaignInput>(key: K, value: CreateGrantCampaignInput[K]) {
    onChange({ ...form, [key]: value });
  }

  function handleTargetingModeChange(mode: string) {
    if (mode === "EXPLICIT") {
      onChange({ ...form, targeting: { mode: "EXPLICIT", beneficiaryIds: [] } });
    } else {
      onChange({ ...form, targeting: { mode: "FILTER", filters: {} } });
    }
  }

  function handleExplicitIdsChange(raw: string) {
    setExplicitIds(raw);
    const ids = raw.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
    onChange({ ...form, targeting: { mode: "EXPLICIT", beneficiaryIds: ids } });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Input
          label="Libellé de la campagne (min. 10 caractères) *"
          required
          value={form.label}
          onChange={(e) => setField("label", e.target.value)}
          placeholder="Bonus rentrée septembre 2026 — pilotes actifs"
        />
      </div>
      <Combobox
        label="Audience *"
        options={[
          { value: "DRIVER",    label: "Chauffeurs (wallet EARNINGS)" },
          { value: "PASSENGER", label: "Passagers (wallet PAYMENT)"   },
        ]}
        value={form.audience}
        onChange={(v) => setField("audience", v as GrantAudience)}
      />
      <Combobox
        label="Sub-balance *"
        options={[
          { value: "MAIN",     label: "MAIN — principal"  },
          { value: "BONUS",    label: "BONUS — bonus"     },
          { value: "REFERRAL", label: "REFERRAL — parrain" },
        ]}
        value={form.balanceType}
        onChange={(v) => setField("balanceType", v as GrantBalanceType)}
      />
      <Input
        label="Montant par bénéficiaire (FCFA) *"
        type="number"
        min={1}
        value={form.amountPerBeneficiary || ""}
        onChange={(e) => setField("amountPerBeneficiary", Number(e.target.value))}
        placeholder="ex. 1000"
      />
      {form.balanceType === "BONUS" && (
        <Input
          label="Expiration du bonus"
          type="datetime-local"
          value={form.expiresAt ?? ""}
          onChange={(e) => setField("expiresAt", e.target.value || null)}
        />
      )}
      <div className="sm:col-span-2">
        <Combobox
          label="Mode de ciblage"
          options={[
            { value: "FILTER",   label: "FILTER — tous les membres de l'audience" },
            { value: "EXPLICIT", label: "EXPLICIT — liste d'IDs spécifiques"       },
          ]}
          value={form.targeting.mode}
          onChange={handleTargetingModeChange}
        />
      </div>
      {form.targeting.mode === "EXPLICIT" && (
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-[color:var(--foreground)]">
            IDs des bénéficiaires (un par ligne ou séparés par virgule)
          </label>
          <textarea
            className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] p-2.5 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)]"
            rows={5}
            value={explicitIds}
            onChange={(e) => handleExplicitIdsChange(e.target.value)}
            placeholder={"id1\nid2\nid3"}
          />
          <p className="mt-1 text-[10px] text-[color:var(--muted-foreground)]">
            {form.targeting.beneficiaryIds?.length ?? 0} IDs saisis
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Étape 2 : preview ────────────────────────────────────────────────────────

function GrantPreviewStep({
  preview,
  form,
}: {
  preview: WalletGrantPreview;
  form: CreateGrantCampaignInput;
}) {
  return (
    <div className="flex flex-col gap-5">
      {/* Violations (bloquantes) */}
      {preview.capViolations.length > 0 && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 dark:border-red-700 dark:bg-red-950/30">
          <p className="mb-2 text-sm font-semibold text-red-700 dark:text-red-400">
            Contraintes non respectées — soumission bloquée
          </p>
          <ul className="flex flex-col gap-1">
            {preview.capViolations.map((v, i) => (
              <li key={i} className="text-xs text-red-600 dark:text-red-400">
                <span className="font-mono font-semibold">{v.cap}</span> : limite {formatXof(v.limit)}, calculé {formatXof(v.actual)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Notes */}
      {preview.notes.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/30">
          <p className="mb-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
            Informations à prendre en compte
          </p>
          <ul className="flex flex-col gap-1">
            {preview.notes.map((n, i) => (
              <li key={i} className="text-xs text-amber-700 dark:text-amber-400">{n}</li>
            ))}
          </ul>
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Bénéficiaires",  value: preview.beneficiaryCount.toLocaleString("fr-FR") },
          { label: "Montant total",  value: formatXof(preview.totalAmount) },
          { label: "Par bénéficiaire", value: formatXof(form.amountPerBeneficiary) },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-[color:var(--border)] p-4 text-center">
            <p className="text-[11px] font-medium uppercase tracking-wider text-[color:var(--muted-foreground)]">{label}</p>
            <p className="mt-1 font-mono text-xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      {/* IDs inconnus */}
      {preview.unknownIds.length > 0 && (
        <div className="rounded-xl border border-[color:var(--border)] p-3">
          <p className="mb-1 text-xs font-medium text-[color:var(--muted-foreground)]">
            {preview.unknownIds.length} ID(s) non résolus
          </p>
          <p className="font-mono text-[10px] text-[color:var(--muted-foreground)]">
            {preview.unknownIds.slice(0, 5).join(", ")}
            {preview.unknownIds.length > 5 && ` +${preview.unknownIds.length - 5} autres`}
          </p>
        </div>
      )}

      {/* Overdraft (DRIVER MAIN) */}
      {preview.beneficiariesInOverdraft > 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          {preview.beneficiariesInOverdraft} chauffeur(s) en découvert — {formatXof(preview.amountAbsorbedByDebt)} absorbé par des dettes.
        </p>
      )}

      {/* Échantillon */}
      {preview.sample.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-[color:var(--muted-foreground)]">
            Échantillon ({preview.sample.length} bénéficiaires)
          </p>
          <div className="overflow-hidden rounded-lg border border-[color:var(--border)]">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[color:var(--border)] text-left text-[10px] uppercase text-[color:var(--muted-foreground)]">
                  <th className="px-3 py-2">ID bénéficiaire</th>
                  <th className="px-3 py-2 text-right">Solde actuel</th>
                  <th className="px-3 py-2 text-right">Crédit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border)]">
                {preview.sample.map((b) => (
                  <tr key={b.beneficiaryId}>
                    <td className="px-3 py-2 font-mono">{b.beneficiaryId.slice(0, 16)}…</td>
                    <td className="px-3 py-2 text-right font-mono">{formatXof(b.mainBalance)}</td>
                    <td className="px-3 py-2 text-right font-mono text-emerald-600 dark:text-emerald-400">+{formatXof(b.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
