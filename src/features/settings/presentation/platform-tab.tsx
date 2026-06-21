"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, RefreshCw, Smartphone } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Modal } from "@/shared/ui/modal";
import { Spinner } from "@/shared/ui/spinner";
import { Textarea } from "@/shared/ui/textarea";
import { toast } from "@/shared/ui/toast";
import { formatDate } from "@/shared/lib/format";
import { upsertAppConfigAction } from "../application/actions";
import type { AppVersionConfig } from "../domain/admin-user";

// ─── Constants ────────────────────────────────────────────────────────────────

const APP_TYPE_LABELS: Record<string, string> = {
  DRIVER: "Driver",
  PASSENGER: "Passager",
};

const PLATFORM_TONE: Record<string, "success" | "info"> = {
  ANDROID: "success",
  IOS: "info",
};

// ─── Edit modal ───────────────────────────────────────────────────────────────

interface EditForm {
  latestVersion: string;
  minSupportedVersion: string;
  downloadUrl: string;
  releaseNotes: string;
}

function EditConfigModal({
  open,
  onClose,
  config,
}: {
  open: boolean;
  onClose: () => void;
  config: AppVersionConfig | null;
}) {
  const [form, setForm] = useState<EditForm>({
    latestVersion: "",
    minSupportedVersion: "",
    downloadUrl: "",
    releaseNotes: "",
  });
  const [pending, start] = useTransition();

  // Populate form when config changes
  useEffect(() => {
    if (config) {
      setForm({
        latestVersion: config.latestVersion,
        minSupportedVersion: config.minSupportedVersion,
        downloadUrl: config.downloadUrl,
        releaseNotes: config.releaseNotes ?? "",
      });
    }
  }, [config]);

  function set<K extends keyof EditForm>(k: K, v: EditForm[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function validate(v: string) {
    return /^\d+\.\d+\.\d+$/.test(v.trim());
  }

  function submit() {
    if (!config) return;
    if (!validate(form.latestVersion)) {
      toast({ kind: "error", title: "Version invalide", description: "Format attendu : X.Y.Z (ex: 1.2.0)" });
      return;
    }
    if (!validate(form.minSupportedVersion)) {
      toast({ kind: "error", title: "Version min. invalide", description: "Format attendu : X.Y.Z (ex: 1.0.0)" });
      return;
    }
    if (!form.downloadUrl.trim()) {
      toast({ kind: "error", title: "URL de téléchargement requise" });
      return;
    }
    start(async () => {
      const r = await upsertAppConfigAction(config.appType, config.platform, {
        latestVersion: form.latestVersion.trim(),
        minSupportedVersion: form.minSupportedVersion.trim(),
        downloadUrl: form.downloadUrl.trim(),
        releaseNotes: form.releaseNotes.trim() || undefined,
      });
      if (r.ok) {
        toast({ kind: "success", title: "Configuration mise à jour", description: r.message });
        onClose();
      } else {
        toast({ kind: "error", title: "Échec", description: r.message });
      }
    });
  }

  const title = config
    ? `${APP_TYPE_LABELS[config.appType] ?? config.appType} · ${config.platform}`
    : "";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Modifier la configuration — ${title}`}
      description="Met à jour les versions et l'URL de téléchargement de l'application."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>Annuler</Button>
          <Button onClick={submit} isLoading={pending}>
            {pending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Version actuelle *"
            value={form.latestVersion}
            onChange={(e) => set("latestVersion", e.target.value)}
            placeholder="1.2.0"
            hint="Format X.Y.Z"
            required
          />
          <Input
            label="Version min. supportée *"
            value={form.minSupportedVersion}
            onChange={(e) => set("minSupportedVersion", e.target.value)}
            placeholder="1.0.0"
            hint="Format X.Y.Z"
            required
          />
        </div>
        <Input
          label="URL de téléchargement *"
          value={form.downloadUrl}
          onChange={(e) => set("downloadUrl", e.target.value)}
          placeholder="https://play.google.com/store/..."
          required
        />
        <Textarea
          label="Notes de version"
          value={form.releaseNotes}
          onChange={(e) => set("releaseNotes", e.target.value)}
          placeholder="Résumé des changements…"
          rows={3}
        />
      </div>
    </Modal>
  );
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

export interface PlatformTabProps {
  configs: AppVersionConfig[];
  error?: string;
}

export function PlatformTab({ configs, error }: PlatformTabProps) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [editTarget, setEditTarget] = useState<AppVersionConfig | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Smartphone className="size-5 text-[color:var(--secondary)]" />
              <CardTitle>Versions des applications mobiles</CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => startRefresh(() => router.refresh())}
              disabled={refreshing}
            >
              {refreshing ? <Spinner size="sm" /> : <RefreshCw className="size-4" />}
              Rafraîchir
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-[color:var(--danger)]">{error}</p>
          ) : configs.length === 0 ? (
            <p className="text-sm text-[color:var(--muted-foreground)]">Aucune configuration disponible.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {configs.map((cfg) => (
                <div
                  key={cfg.id}
                  className="flex flex-col rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)]/20 p-4"
                >
                  {/* Header */}
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[color:var(--foreground)]">
                        {APP_TYPE_LABELS[cfg.appType] ?? cfg.appType}
                      </span>
                      <Badge tone={PLATFORM_TONE[cfg.platform] ?? "neutral"}>
                        {cfg.platform}
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditTarget(cfg)}
                    >
                      <Pencil className="size-3.5" />
                      Modifier
                    </Button>
                  </div>

                  {/* Details */}
                  <dl className="flex flex-col gap-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <dt className="text-[color:var(--muted-foreground)]">Version actuelle</dt>
                      <dd className="font-mono font-semibold text-[color:var(--foreground)]">
                        {cfg.latestVersion}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-[color:var(--muted-foreground)]">Version min. supportée</dt>
                      <dd className="font-mono text-[color:var(--foreground)]">
                        {cfg.minSupportedVersion}
                      </dd>
                    </div>
                    {cfg.releaseNotes ? (
                      <div className="mt-1 rounded-md bg-[color:var(--muted)] px-2 py-1.5 text-[color:var(--muted-foreground)]">
                        {cfg.releaseNotes}
                      </div>
                    ) : null}
                    <div className="mt-1 text-[color:var(--muted-foreground)]">
                      Mis à jour : {formatDate(cfg.updatedAt)}
                    </div>
                  </dl>

                  <a
                    href={cfg.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 block truncate text-xs text-[color:var(--primary)] hover:underline"
                  >
                    {cfg.downloadUrl}
                  </a>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <EditConfigModal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        config={editTarget}
      />
    </div>
  );
}
