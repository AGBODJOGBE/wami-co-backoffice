"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  RefreshCw,
  Settings,
  Users,
} from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Modal } from "@/shared/ui/modal";
import { PageHeader } from "@/shared/ui/page-header";
import { Spinner } from "@/shared/ui/spinner";
import { toast } from "@/shared/ui/toast";
import { formatDate, formatXof } from "@/shared/lib/format";
import { CanView } from "@/shared/ui/can-view";
import {
  createAffiliateAction,
  type CreateAffiliateInput,
} from "../application/actions";
import {
  AFFILIATE_STATUS_LABELS,
  type AffiliateListItem,
} from "../domain/affiliate";

interface Props {
  affiliates: AffiliateListItem[];
}

export function AffiliateListPage({ affiliates }: Props) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return affiliates.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.phoneNumber.includes(q) ||
        a.socialNetwork.toLowerCase().includes(q),
    );
  }, [affiliates, search]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Marketing"
        title="Affiliés"
        description={`${affiliates.length} influenceur${affiliates.length !== 1 ? "s" : ""} enregistré${affiliates.length !== 1 ? "s" : ""}`}
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
            <CanView permission="affiliate.config.manage">
              <Link
                href="/affiliate/config"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--border)] bg-white px-3 py-1.5 text-sm font-medium text-[color:var(--foreground)] hover:bg-[color:var(--muted)] dark:bg-transparent"
              >
                <Settings className="size-4" />
                Configuration
              </Link>
            </CanView>
            <CanView permission="affiliate.manage">
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" />
                Nouvel affilié
              </Button>
            </CanView>
          </div>
        }
      />

      {affiliates.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <Users className="size-10 opacity-30" />
          <p className="text-sm font-medium">Aucun affilié</p>
          <p className="max-w-sm text-xs text-[color:var(--muted-foreground)]">
            Créez le premier profil affilié pour démarrer le programme d&apos;affiliation.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 rounded-xl border border-[color:var(--border)] bg-white p-3 dark:bg-[color:var(--muted)]">
            <Input
              placeholder="Rechercher par nom, téléphone, réseau…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
            <span className="ml-auto text-xs text-[color:var(--muted-foreground)]">
              {filtered.length} / {affiliates.length}
            </span>
          </div>

          <Card className="overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-[color:var(--border)] text-left text-[11px] uppercase tracking-wider text-[color:var(--muted-foreground)]">
                  <th className="px-5 py-2.5 font-medium">Affilié</th>
                  <th className="px-5 py-2.5 font-medium">Réseau</th>
                  <th className="px-5 py-2.5 font-medium">Statut</th>
                  <th className="px-5 py-2.5 text-right font-medium">Taux eff.</th>
                  <th className="px-5 py-2.5 text-right font-medium">À payer</th>
                  <th className="px-5 py-2.5 font-medium">Codes</th>
                  <th className="px-5 py-2.5 font-medium">Créé le</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border)]">
                {filtered.map((a) => (
                  <tr key={a.affiliateId} className="hover:bg-[color:var(--muted)]/30">
                    <td className="px-5 py-3">
                      <Link
                        href={`/affiliate/${a.affiliateId}`}
                        className="flex flex-col leading-tight hover:text-[color:var(--primary)]"
                      >
                        <span className="font-medium">{a.name}</span>
                        <span className="font-mono text-[10px] text-[color:var(--muted-foreground)]">
                          {a.phoneNumber}
                        </span>
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-sm">{a.socialNetwork}</td>
                    <td className="px-5 py-3">
                      <Badge
                        tone={a.status === "ACTIVE" ? "success" : "danger"}
                      >
                        {AFFILIATE_STATUS_LABELS[a.status] ?? a.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-sm">
                      {a.effectiveCommissionRate}%
                    </td>
                    <td className="px-5 py-3 text-right font-mono font-semibold">
                      {a.outstandingPayable > 0
                        ? formatXof(a.outstandingPayable)
                        : <span className="text-[color:var(--muted-foreground)]">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      {a.codes.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {a.codes.slice(0, 3).map((c) => (
                            <span
                              key={c.promoCodeId}
                              className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${
                                c.isCurrentlyUsable
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                                  : "bg-[color:var(--muted)] text-[color:var(--muted-foreground)]"
                              }`}
                            >
                              {c.code}
                            </span>
                          ))}
                          {a.codes.length > 3 && (
                            <span className="text-xs text-[color:var(--muted-foreground)]">
                              +{a.codes.length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-[color:var(--muted-foreground)]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-[color:var(--muted-foreground)]">
                      {formatDate(a.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      <CreateAffiliateModal
        open={createOpen}
        onClose={() => { setCreateOpen(false); router.refresh(); }}
      />
    </div>
  );
}

// ─── Modale de création ───────────────────────────────────────────────────────

function CreateAffiliateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<CreateAffiliateInput>({
    phoneNumber: "",
    name: "",
    socialNetwork: "",
    audienceSize: null,
    commissionRate: null,
  });

  function handleSubmit() {
    if (!form.phoneNumber.trim() || !form.name.trim() || !form.socialNetwork.trim()) {
      toast({ kind: "error", title: "Champs requis", description: "Téléphone, nom et réseau social sont obligatoires." });
      return;
    }
    startTransition(async () => {
      const res = await createAffiliateAction(form);
      if (res.success) {
        toast({ kind: "success", title: "Affilié créé", description: `${form.name} — mot de passe provisoire envoyé par SMS.` });
        onClose();
      } else {
        toast({ kind: "error", title: "Création échouée", description: res.error });
      }
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Créer un affilié"
      description="Le mot de passe provisoire sera envoyé par SMS au numéro renseigné."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={pending || !form.phoneNumber || !form.name || !form.socialNetwork}>
            {pending && <Spinner size="sm" />}
            Créer
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Téléphone *"
          required
          value={form.phoneNumber}
          onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
          placeholder="+22961234567"
        />
        <Input
          label="Nom *"
          required
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Aïcha K."
        />
        <Input
          label="Réseau social *"
          required
          value={form.socialNetwork}
          onChange={(e) => setForm((f) => ({ ...f, socialNetwork: e.target.value }))}
          placeholder="Instagram, TikTok…"
        />
        <Input
          label="Taille d'audience"
          type="number"
          value={form.audienceSize ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, audienceSize: e.target.value ? Number(e.target.value) : null }))}
          placeholder="ex. 50000"
        />
        <Input
          label="Taux de commission (%)"
          type="number"
          value={form.commissionRate ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, commissionRate: e.target.value ? Number(e.target.value) : null }))}
          placeholder="ex. 15 (vide = taux par défaut)"
          className="sm:col-span-2"
        />
      </div>
    </Modal>
  );
}
