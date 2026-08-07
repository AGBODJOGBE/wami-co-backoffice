"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCircle2,
  Megaphone,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  XCircle,
} from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Combobox } from "@/shared/ui/combobox";
import { ConfirmModal } from "@/shared/ui/confirm-modal";
import { DropdownMenu } from "@/shared/ui/dropdown-menu";
import { Input } from "@/shared/ui/input";
import { Modal } from "@/shared/ui/modal";
import { PageHeader } from "@/shared/ui/page-header";
import { Tabs } from "@/shared/ui/tabs";
import { Textarea } from "@/shared/ui/textarea";
import { toast } from "@/shared/ui/toast";
import { StatCard } from "@/features/dashboard/presentation/components/stat-card";
import { STATUS_META, type NotificationStats } from "./domain/notification";
import {
  useNotificationsStore,
  type Audience,
  type Channel,
  type NewTemplateInput,
  type NotifTemplate,
  type TemplateCategory,
} from "./store";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface NotificationsPageProps {
  stats: NotificationStats;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AUDIENCE_OPTIONS = [
  { value: "ALL_PASSENGERS", label: "Tous les passagers", description: "Passagers actifs" },
  { value: "ALL_DRIVERS",    label: "Tous les drivers",   description: "Drivers actifs"   },
  { value: "VIP_PASSENGERS", label: "Passagers VIP"                                        },
  { value: "INACTIVE_30D",   label: "Passagers inactifs 30 j"                              },
];

const CATEGORY_OPTIONS = [
  { value: "Onboarding",     label: "Onboarding"     },
  { value: "Promo",          label: "Promo"           },
  { value: "Transactionnel", label: "Transactionnel"  },
  { value: "Réactivation",   label: "Réactivation"    },
];

// ─── Composer tab ─────────────────────────────────────────────────────────────

function ComposerTab({
  prefilledTemplate,
  onConsumeTemplate,
}: {
  prefilledTemplate: NotifTemplate | null;
  onConsumeTemplate: () => void;
}) {
  const sendBroadcast = useNotificationsStore((s) => s.sendBroadcast);
  const [audience,   setAudience]   = useState<Audience>("ALL_PASSENGERS");
  const [channel,    setChannel]    = useState<Channel>("PUSH");
  const [scheduling, setScheduling] = useState("NOW");
  const [title,      setTitle]      = useState("");
  const [body,       setBody]       = useState("");
  const [deeplink,   setDeeplink]   = useState("");

  if (prefilledTemplate) {
    setTitle(prefilledTemplate.name);
    setBody(prefilledTemplate.preview);
    onConsumeTemplate();
  }

  function handleSend() {
    if (!title.trim() || !body.trim()) {
      toast({ kind: "error", title: "Push incomplet", description: "Titre et corps obligatoires." });
      return;
    }
    sendBroadcast({ title: title.trim(), body: body.trim(), audience, channel });
    toast({
      kind: "success",
      title: scheduling === "NOW" ? "Push envoyé" : "Push programmé",
      description: title.trim(),
    });
    setTitle(""); setBody(""); setDeeplink("");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <Card className="flex flex-col gap-5 p-6">
        <div>
          <h3 className="text-base font-semibold text-[color:var(--foreground)]">
            Composer une notification push
          </h3>
          <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
            Envoi via Firebase Cloud Messaging — visible sur Android et iOS.
          </p>
        </div>

        <Combobox
          label="Audience"
          options={AUDIENCE_OPTIONS}
          value={audience}
          onChange={(v) => setAudience(v as Audience)}
        />

        <Input
          label="Titre"
          maxLength={70}
          hint="70 caractères max — visible sur l'écran de verrouillage."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Promo WEEKEND-2K active dès maintenant"
        />

        <Textarea
          label="Corps du message"
          rows={4}
          maxLength={200}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Profitez de −2 000 FCFA dès 5 000 FCFA, ce week-end seulement."
          hint='Variables disponibles : {{firstName}}, {{walletBalance}}.'
        />

        <Input
          label="Deeplink (optionnel)"
          placeholder="foryou://promos/WEEKEND-2K"
          hint="Schéma supporté côté mobile : foryou://"
          value={deeplink}
          onChange={(e) => setDeeplink(e.target.value)}
        />

        <div className="flex flex-wrap gap-3">
          <Combobox
            label="Canal"
            options={[
              { value: "PUSH",     label: "Push uniquement"        },
              { value: "PUSH_SMS", label: "Push + SMS de fallback" },
            ]}
            value={channel}
            onChange={(v) => setChannel(v as Channel)}
            className="sm:w-56"
          />
          <Combobox
            label="Programmation"
            options={[
              { value: "NOW",       label: "Envoyer maintenant"       },
              { value: "SCHEDULED", label: "Programmer pour plus tard" },
            ]}
            value={scheduling}
            onChange={setScheduling}
            className="sm:w-56"
          />
        </div>

        <div className="flex items-center gap-3 border-t border-[color:var(--border)] pt-4">
          <Button variant="outline" size="sm">Sauvegarder en brouillon</Button>
          <span className="flex-1" />
          <Button variant="ghost" size="sm">Tester sur mon device</Button>
          <Button size="sm" onClick={handleSend}>
            <Send className="size-4" />
            Envoyer
          </Button>
        </div>
      </Card>

      {/* Aperçu */}
      <Card className="flex flex-col gap-4 self-start p-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">Aperçu push</p>
          <h3 className="text-base font-semibold text-[color:var(--foreground)]">Sur l&apos;écran du passager</h3>
        </div>
        <div className="rounded-xl border border-[color:var(--border)] bg-gradient-to-b from-[color:var(--primary-soft)] to-transparent p-4">
          <div className="rounded-2xl bg-white p-4 shadow-md dark:bg-[color:var(--muted)]">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-md bg-[color:var(--primary)] text-xs font-bold text-white">4U</span>
              <span className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">ForYou · maintenant</span>
            </div>
            <p className="mt-2 text-sm font-semibold text-[color:var(--foreground)]">{title || "Titre du push…"}</p>
            <p className="mt-0.5 text-sm text-[color:var(--muted-foreground)]">{body || "Corps du message…"}</p>
          </div>
        </div>
        <p className="text-xs text-[color:var(--muted-foreground)]">
          Sur iOS, le titre s&apos;affiche en gras et le corps en texte secondaire.
        </p>
      </Card>
    </div>
  );
}

// ─── Templates tab ────────────────────────────────────────────────────────────

function TemplateFormModal({
  open, mode, template, onClose,
}: { open: boolean; mode: "create" | "edit"; template?: NotifTemplate; onClose: () => void }) {
  const create = useNotificationsStore((s) => s.createTemplate);
  const update = useNotificationsStore((s) => s.updateTemplate);
  const empty: NewTemplateInput = { name: "", category: "Promo", description: "", preview: "" };
  const [form, setForm] = useState<NewTemplateInput>(empty);

  function set<K extends keyof NewTemplateInput>(key: K, value: NewTemplateInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit() {
    if (!form.name || !form.preview) {
      toast({ kind: "error", title: "Champs manquants", description: "Nom et preview obligatoires." });
      return;
    }
    if (mode === "create") {
      create(form);
      toast({ kind: "success", title: "Template créé", description: form.name });
    } else if (template) {
      update(template.id, form);
      toast({ kind: "success", title: "Template mis à jour", description: form.name });
    }
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={mode === "create" ? "Nouveau template" : "Modifier le template"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSubmit}>{mode === "create" ? "Créer" : "Enregistrer"}</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Nom" required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Bienvenue passager" />
        <Combobox label="Catégorie" options={CATEGORY_OPTIONS} value={form.category} onChange={(v) => set("category", v as TemplateCategory)} />
        <Input label="Description courte" value={form.description} onChange={(e) => set("description", e.target.value)} className="sm:col-span-2" placeholder="Envoyé à la fin du flow register" />
        <Textarea label="Preview / corps du push" required rows={4} value={form.preview} onChange={(e) => set("preview", e.target.value)} className="sm:col-span-2" hint="Variables {{firstName}}, {{driverName}}, {{eta}}, etc." />
      </div>
    </Modal>
  );
}

function TemplatesTab({ onUseTemplate }: { onUseTemplate: (tpl: NotifTemplate) => void }) {
  const templates      = useNotificationsStore((s) => s.templates);
  const removeTemplate = useNotificationsStore((s) => s.removeTemplate);
  const [formOpen,   setFormOpen]   = useState(false);
  const [formMode,   setFormMode]   = useState<"create" | "edit">("create");
  const [formTarget, setFormTarget] = useState<NotifTemplate | undefined>(undefined);
  const [confirm,    setConfirm]    = useState<{ open: boolean; target: NotifTemplate | null }>({ open: false, target: null });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[color:var(--muted-foreground)]">
          {templates.length} templates · cliquez « Utiliser » pour pré-remplir le composer.
        </p>
        <Button size="sm" onClick={() => { setFormMode("create"); setFormTarget(undefined); setFormOpen(true); }}>
          <Plus className="size-4" />
          Nouveau template
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {templates.map((tpl) => (
          <Card key={tpl.id} className="flex flex-col gap-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex size-9 items-center justify-center rounded-lg bg-[color:var(--primary-soft)] text-[color:var(--primary)]">
                  <Sparkles className="size-4" />
                </span>
                <div className="leading-tight">
                  <p className="text-sm font-semibold text-[color:var(--foreground)]">{tpl.name}</p>
                  <p className="text-xs text-[color:var(--muted-foreground)]">{tpl.description}</p>
                </div>
              </div>
              <Badge tone="info">{tpl.category}</Badge>
            </div>
            <p className="rounded-md bg-[color:var(--muted)] p-3 text-xs text-[color:var(--muted-foreground)]">{tpl.preview}</p>
            <div className="flex items-center justify-between border-t border-[color:var(--border)] pt-3 text-xs text-[color:var(--muted-foreground)]">
              <span>Utilisé {tpl.usageCount.toLocaleString("fr-FR")} fois</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => onUseTemplate(tpl)}>Utiliser</Button>
                <DropdownMenu
                  groups={[{
                    items: [
                      { label: "Modifier",  icon: Pencil, onSelect: () => { setFormMode("edit"); setFormTarget(tpl); setFormOpen(true); } },
                      { label: "Supprimer", icon: Trash2, onSelect: () => setConfirm({ open: true, target: tpl }), danger: true },
                    ],
                  }]}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <TemplateFormModal open={formOpen} mode={formMode} template={formTarget} onClose={() => setFormOpen(false)} />
      <ConfirmModal
        open={confirm.open}
        onClose={() => setConfirm({ open: false, target: null })}
        onConfirm={() => {
          if (!confirm.target) return;
          removeTemplate(confirm.target.id);
          toast({ kind: "info", title: "Template supprimé", description: confirm.target.name });
          setConfirm({ open: false, target: null });
        }}
        title="Supprimer ce template ?"
        description={confirm.target ? <p className="font-medium">{confirm.target.name}</p> : null}
        confirmLabel="Supprimer"
        tone="danger"
      />
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export function NotificationsPage({ stats }: NotificationsPageProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [prefilled, setPrefilled] = useState<NotifTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<"composer" | "templates">("composer");

  const delivered = stats.counts.DELIVERED ?? 0;
  const sent      = stats.counts.SENT      ?? 0;
  const failed    = stats.counts.FAILED    ?? 0;
  const pending   = stats.counts.PENDING   ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Marketing"
        title="Notifications"
        dataSource="live"
        description={`${stats.total.toLocaleString()} notifications totales — taux de livraison ${stats.successRate.toFixed(1)} %.`}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => startTransition(() => router.refresh())}
            >
              <RefreshCw className="size-4" />
              Actualiser
            </Button>
            <Button size="sm" onClick={() => setActiveTab("composer")}>
              <Send className="size-4" />
              Composer
            </Button>
          </>
        }
      />

      {/* KPI Stats — données réelles backend */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total notifications"
          value={stats.total.toLocaleString("fr-FR")}
          icon={Megaphone}
          tone="primary"
        />
        <StatCard
          label="Livrées"
          value={delivered.toLocaleString("fr-FR")}
          helper={`+ ${sent.toLocaleString()} envoyées`}
          trend={{ value: `${stats.successRate.toFixed(1)} %`, direction: "up" }}
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard
          label="En attente"
          value={pending.toLocaleString("fr-FR")}
          icon={Bell}
          tone="warning"
        />
        <StatCard
          label="Échecs"
          value={failed.toLocaleString("fr-FR")}
          trend={failed > 0 ? { value: `${stats.failureRate.toFixed(1)} %`, direction: "down" } : undefined}
          icon={XCircle}
          tone={failed > 0 ? "danger" : "neutral"}
        />
      </section>

      {/* Breakdown par statut */}
      {stats.total > 0 && (
        <Card className="overflow-hidden p-0">
          <CardHeader className="px-5 py-4">
            <CardTitle>Répartition par statut</CardTitle>
            <CardDescription>
              {stats.total.toLocaleString()} notifications au total · taux d&apos;échec {stats.failureRate.toFixed(1)} %
            </CardDescription>
          </CardHeader>
          <div className="grid divide-y divide-[color:var(--border)] sm:grid-cols-4 sm:divide-x sm:divide-y-0">
            {(["DELIVERED", "SENT", "PENDING", "FAILED"] as const).map((s) => {
              const count = stats.counts[s] ?? 0;
              const pct   = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
              const meta  = STATUS_META[s];
              return (
                <div key={s} className="flex flex-col items-center gap-1 px-5 py-4">
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                  <p className="font-mono text-2xl font-bold text-[color:var(--foreground)]">
                    {count.toLocaleString("fr-FR")}
                  </p>
                  <div className="h-1.5 w-full max-w-[120px] rounded-full bg-[color:var(--muted)]">
                    <div className="h-1.5 rounded-full bg-[color:var(--primary)]" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-[color:var(--muted-foreground)]">{pct}%</p>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Note info */}
      <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)]/40 px-4 py-3 text-xs text-[color:var(--muted-foreground)]">
        <span className="font-medium text-[color:var(--foreground)]">Historique par utilisateur</span>
        {" "}— Les notifications individuelles (SMS OTP, Push course, email partenaire…) sont consultables
        directement sur la fiche du chauffeur ou du passager concerné.
      </div>

      {/* Onglets Composer + Templates */}
      <Tabs
        key={activeTab}
        defaultValue={activeTab}
        tabs={[
          {
            value: "composer",
            label: "Composer",
            content: (
              <ComposerTab
                prefilledTemplate={prefilled}
                onConsumeTemplate={() => setPrefilled(null)}
              />
            ),
          },
          {
            value: "templates",
            label: "Templates",
            content: (
              <TemplatesTab
                onUseTemplate={(tpl) => {
                  setPrefilled(tpl);
                  setActiveTab("composer");
                }}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
