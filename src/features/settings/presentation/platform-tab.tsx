"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Smartphone } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Spinner } from "@/shared/ui/spinner";
import { formatDate } from "@/shared/lib/format";
import type { AppVersionConfig } from "../domain/admin-user";

const APP_TYPE_LABELS: Record<string, string> = {
  DRIVER: "Driver",
  PASSENGER: "Passager",
};

const PLATFORM_TONE: Record<string, "success" | "info"> = {
  ANDROID: "success",
  IOS: "info",
};

export interface PlatformTabProps {
  configs: AppVersionConfig[];
  error?: string;
}

export function PlatformTab({ configs, error }: PlatformTabProps) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();

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
                  className="rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)]/20 p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-[color:var(--foreground)]">
                      {APP_TYPE_LABELS[cfg.appType] ?? cfg.appType}
                    </span>
                    <Badge tone={PLATFORM_TONE[cfg.platform] ?? "neutral"}>
                      {cfg.platform}
                    </Badge>
                  </div>
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

      <div className="rounded-lg border border-dashed border-[color:var(--border)] bg-[color:var(--muted)]/10 px-4 py-3 text-xs text-[color:var(--muted-foreground)]">
        ℹ️ Les sections Identité légale, Sécurité et Multi-villes seront disponibles lorsque les routes backend correspondantes seront exposées.
      </div>
    </div>
  );
}
