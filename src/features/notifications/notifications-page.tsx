"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  Download,
  Eye,
  Megaphone,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Trash2,
  TrendingUp,
  X,
  XCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Combobox } from "@/shared/ui/combobox";
import { ConfirmModal } from "@/shared/ui/confirm-modal";
import { DataTable, PaginationFooter, type ColumnDef } from "@/shared/ui/data-table";
import { DropdownMenu } from "@/shared/ui/dropdown-menu";
import { Input } from "@/shared/ui/input";
import { Modal } from "@/shared/ui/modal";
import { PageHeader } from "@/shared/ui/page-header";
import { Tabs } from "@/shared/ui/tabs";
import { Textarea } from "@/shared/ui/textarea";
import { toast } from "@/shared/ui/toast";
import { StatCard } from "@/features/dashboard/presentation/components/stat-card";
import { type CsvColumn, downloadCsv, timestampedFilename } from "@/shared/lib/csv";
import { formatDateTime } from "@/shared/lib/format";
import {
  CHANNEL_META,
  NOTIFICATION_TYPE_GROUPS,
  PRIORITY_META,
  STATUS_META,
  type NotificationHistory,
  type NotificationItem,
  type NotificationStats,
} from "./domain/notification";
import { markNotificationReadAction } from "./application/actions";
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
  history: NotificationHistory;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AUDIENCE_OPTIONS = [
  { value: "ALL_PASSENGERS", label: "Tous les passagers", description: "Passagers actifs" },
  { value: "ALL_DRIVERS",    label: "Tous les drivers",   description: "Drivers actifs"   },
  { value: "VIP_PASSENGERS", label: "Passagers VIP"                                        },
  { value: "INACTIVE_30D",   label: "Passagers inactifs 30 j"                              },
];

const CATEGORY_OPTIONS = [
  { value: "Onboarding",    label: "Onboarding"    },
  { value: "Promo",         label: "Promo"         },
  { value: "Transactionnel",label: "Transactionnel"},
  { value: "Réactivation",  label: "Réactivation"  },
];

const TYPE_OPTIONS = [
  { value: "ALL", label: "Type : tous" },
  ...NOTIFICATION_TYPE_GROUPS.flatMap((g) =>
    g.types.map((t) => ({ value: t, label: t.replace(/_/g, " ").toLowerCase() })),
  ),
];

const CSV_COLUMNS: readonly CsvColumn<NotificationItem>[] = [
  { key: "createdAt", header: "Date",       value: (n) => formatDateTime(n.createdAt) },
  { key: "type",      header: "Type",       value: (n) => n.type },
  { key: "channel",   header: "Canal",      value: (n) => CHANNEL_META[n.channel]?.label ?? n.channel },
  { key: "priority",  header: "Priorité",   value: (n) => PRIORITY_META[n.priority]?.label ?? n.priority },
  { key: "status",    header: "Statut",     value: (n) => STATUS_META[n.status]?.label ?? n.status },
  { key: "message",   header: "Message",    value: (n) => n.message },
  { key: "isRead",    header: "Lu",         value: (n) => n.isRead ? "Oui" : "Non" },
  { key: "sentAt",    header: "Envoyé le",  value: (n) => n.sentAt ? formatDateTime(n.sentAt) : "" },
  { key: "entity",    header: "Entité liée",value: (n) => n.relatedEntity ? `${n.relatedEntity.type}:${n.relatedEntity.id}` : "" },
];

// ─── Journal tab (LIVE) ───────────────────────────────────────────────────────

function JournalTab({
  history,
}: {
  history: NotificationHistory;
}) {
  const router = useRouter();
  const [search,         setSearch]         = useState("");
  const [channelFilter,  setChannelFilter]  = useState("ALL");
  const [statusFilter,   setStatusFilter]   = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [typeFilter,     setTypeFilter]     = useState("ALL");
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return history.notifications.filter((n) => {
      if (channelFilter  !== "ALL" && n.channel  !== channelFilter)  return false;
      if (statusFilter   !== "ALL" && n.status   !== statusFilter)   return false;
      if (priorityFilter !== "ALL" && n.priority !== priorityFilter) return false;
      if (typeFilter     !== "ALL" && n.type     !== typeFilter)     return false;
      if (q) {
        const hay = `${n.message} ${n.type} ${n.id}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [history.notifications, search, channelFilter, statusFilter, priorityFilter, typeFilter]);

  const hasFilters = search || channelFilter !== "ALL" || statusFilter !== "ALL" ||
    priorityFilter !== "ALL" || typeFilter !== "ALL";

  function clearFilters() {
    setSearch(""); setChannelFilter("ALL"); setStatusFilter("ALL");
    setPriorityFilter("ALL"); setTypeFilter("ALL");
  }

  async function handleMarkRead(id: string) {
    const res = await markNotificationReadAction(id);
    if (res.success) {
      toast({ kind: "success", title: "Marquée comme lue" });
      startTransition(() => router.refresh());
    } else {
      toast({ kind: "error", title: "Erreur", description: res.error });
    }
  }

  const columns: ColumnDef<NotificationItem>[] = [
    {
      key: "createdAt",
      header: "Date",
      sortAccessor: (row) => row.createdAt,
      render: (row) => (
        <span className="text-xs text-[color:var(--muted-foreground)]">
          {formatDateTime(row.createdAt)}
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (row) => (
        <span className="text-xs font-mono text-[color:var(--foreground)]">
          {row.type.replace(/_/g, " ").toLowerCase()}
        </span>
      ),
    },
    {
      key: "channel",
      header: "Canal",
      render: (row) => {
        const m = CHANNEL_META[row.channel];
        return <Badge tone={m?.tone ?? "neutral"}>{m?.label ?? row.channel}</Badge>;
      },
    },
    {
      key: "priority",
      header: "Priorité",
      render: (row) => {
        const m = PRIORITY_META[row.priority];
        return <Badge tone={m?.tone ?? "neutral"}>{m?.label ?? row.priority}</Badge>;
      },
    },
    {
      key: "message",
      header: "Message",
      render: (row) => (
        <span className="block max-w-[280px] truncate text-xs text-[color:var(--muted-foreground)]">
          {row.message}
        </span>
      ),
    },
    {
      key: "status",
      header: "Statut",
      render: (row) => {
        const m = STATUS_META[row.status];
        const Icon = row.status === "DELIVERED" ? CheckCircle2
          : row.status === "FAILED"    ? XCircle
          : row.status === "SENT"      ? Send
          : Clock;
        return (
          <span className="inline-flex items-center gap-1">
            <Icon className={`size-3.5 ${
              row.status === "DELIVERED" ? "text-emerald-500"
              : row.status === "FAILED"  ? "text-red-500"
              : "text-amber-500"
            }`} />
            <Badge tone={m?.tone ?? "neutral"}>{m?.label ?? row.status}</Badge>
          </span>
        );
      },
    },
    {
      key: "isRead",
      header: "Lu",
      render: (row) =>
        row.isRead ? (
          <CheckCheck className="size-4 text-emerald-500" />
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleMarkRead(row.id)}
            disabled={isPending}
            className="h-6 px-2 text-xs"
          >
            Marquer lu
          </Button>
        ),
    },
    {
      key: "entity",
      header: "Entité",
      render: (row) =>
        row.relatedEntity ? (
          <span className="text-xs text-[color:var(--muted-foreground)]">
            {row.relatedEntity.type}
          </span>
        ) : (
          <span className="text-xs text-[color:var(--muted-foreground)]">—</span>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Filtres */}
      <div className="flex flex-col gap-3 rounded-xl border border-[color:var(--border)] bg-white p-4 dark:bg-[color:var(--muted)]">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            leftIcon={<Search className="size-4" />}
            placeholder="Rechercher type, message, ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:flex-1 sm:min-w-64"
          />
          <Combobox
            options={[
              { value: "ALL",       label: "Canal : tous"  },
              { value: "PUSH",      label: "Push FCM"      },
              { value: "SMS",       label: "SMS"           },
              { value: "EMAIL",     label: "Email"         },
              { value: "WEBSOCKET", label: "WebSocket"     },
            ]}
            value={channelFilter}
            onChange={setChannelFilter}
            className="sm:w-40"
          />
          <Combobox
            options={[
              { value: "ALL",       label: "Statut : tous" },
              { value: "DELIVERED", label: "Livrée"        },
              { value: "SENT",      label: "Envoyée"       },
              { value: "PENDING",   label: "En attente"    },
              { value: "FAILED",    label: "Échouée"       },
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
            className="sm:w-40"
          />
          <Combobox
            options={[
              { value: "ALL",      label: "Priorité : toutes" },
              { value: "CRITICAL", label: "Critique"          },
              { value: "HIGH",     label: "Élevée"            },
              { value: "NORMAL",   label: "Normale"           },
              { value: "LOW",      label: "Faible"            },
            ]}
            value={priorityFilter}
            onChange={setPriorityFilter}
            className="sm:w-44"
          />
          <Combobox
            options={TYPE_OPTIONS.slice(0, 20)}
            value={typeFilter}
            onChange={setTypeFilter}
            className="sm:w-52"
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-[color:var(--muted-foreground)]">
            {filtered.length.toLocaleString()} notification{filtered.length > 1 ? "s" : ""} affichée{filtered.length > 1 ? "s" : ""}
            {hasFilters ? ` (sur ${history.notifications.length.toLocaleString()})` : ""}
            {history.total > history.notifications.length
              ? ` · ${history.total.toLocaleString()} au total`
              : ""}
          </span>
          <div className="flex items-center gap-2">
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="size-3.5" />
                Effacer
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadCsv(timestampedFilename("notifications"), CSV_COLUMNS, filtered)}
              disabled={filtered.length === 0}
            >
              <Download className="size-4" />
              CSV
            </Button>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <DataTable
          rows={filtered}
          columns={columns}
          rowKey={(row) => row.id}
          defaultSort={{ key: "createdAt", direction: "desc" }}
        />
        <PaginationFooter total={history.total} shown={filtered.length} />
      </Card>
    </div>
  );
}

// ─── Composer tab (UI seulement — pas de route broadcast côté backend) ────────

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

  // Pré-remplir depuis un template
  const [, startTransition] = useTransition();
  if (prefilledTemplate) {
    startTransition(() => {
      setTitle(prefilledTemplate.name);
      setBody(prefilledTemplate.preview);
      onConsumeTemplate();
    });
  }

  function handleSend() {
    if (!title.trim() || !body.trim()) {
      toast({ kind: "error", title: "Push incomplet", description: "Titre et corps obligatoires." });
      return;
    }
    sendBroadcast({ title: title.trim(), body: body.trim(), audience, channel });
    toast({ kind: "success", title: scheduling === "NOW" ? "Push envoyé" : "Push programmé", description: title.trim() });
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

        <Combobox label="Audience" options={AUDIENCE_OPTIONS} value={audience} onChange={(v) => setAudience(v as Audience)} />

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
              { value: "NOW",       label: "Envoyer maintenant"      },
              { value: "SCHEDULED", label: "Programmer pour plus tard"},
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
  const templates     = useNotificationsStore((s) => s.templates);
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
                      { label: "Modifier",   icon: Pencil, onSelect: () => { setFormMode("edit"); setFormTarget(tpl); setFormOpen(true); } },
                      { label: "Supprimer",  icon: Trash2, onSelect: () => setConfirm({ open: true, target: tpl }), danger: true },
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

export function NotificationsPage({ stats, history }: NotificationsPageProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [prefilled,  setPrefilled]  = useState<NotifTemplate | null>(null);
  const [activeTab,  setActiveTab]  = useState<"journal" | "composer" | "templates">("journal");

  // KPIs réels depuis le backend
  const delivered  = stats.counts.DELIVERED ?? 0;
  const sent       = stats.counts.SENT      ?? 0;
  const failed     = stats.counts.FAILED    ?? 0;
  const pending    = stats.counts.PENDING   ?? 0;
  const unread     = history.notifications.filter((n) => !n.isRead).length;

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

      {/* KPI Stats — données réelles */}
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
          label="Non lues"
          value={unread.toLocaleString("fr-FR")}
          helper={`sur ${history.notifications.length} chargées`}
          icon={Bell}
          tone="warning"
        />
        <StatCard
          label="Échecs"
          value={failed.toLocaleString("fr-FR")}
          helper={`${pending} en attente`}
          trend={failed > 0 ? { value: `${stats.failureRate.toFixed(1)} %`, direction: "down" } : undefined}
          icon={XCircle}
          tone={failed > 0 ? "danger" : "neutral"}
        />
      </section>

      {/* Breakdowns statuts */}
      {stats.total > 0 && (
        <Card className="overflow-hidden p-0">
          <CardHeader className="px-5 py-4">
            <CardTitle>Répartition par statut</CardTitle>
            <CardDescription>Toutes notifications confondues · {stats.total.toLocaleString()} au total</CardDescription>
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

      <Tabs
        key={activeTab}
        defaultValue={activeTab}
        tabs={[
          {
            value: "journal",
            label: "Journal système",
            badge: unread > 0 ? { count: unread, tone: "warning" as const } : undefined,
            content: <JournalTab history={history} />,
          },
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
            content: <TemplatesTab onUseTemplate={(tpl) => { setPrefilled(tpl); setActiveTab("composer"); }} />,
          },
        ]}
      />
    </div>
  );
}
