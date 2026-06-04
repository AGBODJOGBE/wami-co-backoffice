"use client";

import { useState } from "react";
import { Map, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { DevNote } from "@/shared/ui/dev-note";
import { cn } from "@/shared/lib/cn";
import { BeninMapClient, type LivePin } from "./benin-map-wrapper";
import { PendingValidations } from "./components/pending-validations";
import type { PendingDriver } from "@/features/drivers/domain/admin-driver";

export interface DashboardMapPanelProps {
  /** Live pins computed server-side from GET /api/admin/drivers/online. */
  livePins?: LivePin[];
  /** True when the live fetch succeeded (even with 0 drivers). */
  isLive?: boolean;
  /** Error returned by the live fetch, if any. */
  liveError?: string;
  /** Drivers awaiting KYC, from GET /api/admin/drivers/pending. */
  pendingDrivers?: PendingDriver[];
  /** Error from the pending fetch, if any. */
  pendingError?: string;
}

/**
 * Top-of-dashboard panel: 60% carte / 40% validations en attente par défaut
 * (grid 5 colonnes), avec un bouton « Agrandir » qui passe la carte en
 * pleine largeur et fait passer les validations en dessous.
 */
export function DashboardMapPanel({
  livePins,
  isLive,
  liveError,
  pendingDrivers = [],
  pendingError,
}: DashboardMapPanelProps = {}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section
      className={cn(
        "grid gap-6",
        expanded ? "grid-cols-1" : "lg:grid-cols-5",
      )}
    >
      <Card className={expanded ? undefined : "lg:col-span-3"}>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Map className="size-5 text-[color:var(--primary)]" />
              <CardTitle>Carte des drivers — Bénin</CardTitle>
              {isLive && livePins && livePins.length > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--success)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--success)]">
                  <span className="size-1.5 animate-pulse rounded-full bg-[color:var(--success)]" />
                  Live · {livePins.length} drivers
                </span>
              ) : null}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? (
                <>
                  <Minimize2 className="size-4" />
                  Réduire
                </>
              ) : (
                <>
                  <Maximize2 className="size-4" />
                  Agrandir
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <BeninMapClient livePins={livePins} />
          {liveError ? (
            <DevNote className="mt-4">
              Carte en mode démo — l&apos;appel{" "}
              <code>GET /api/admin/drivers/online</code> a échoué :{" "}
              <strong>{liveError}</strong>. Les pins affichés sont des
              données de seed.
            </DevNote>
          ) : !livePins || livePins.length === 0 ? (
            <DevNote className="mt-4">
              Aucun driver en ligne renvoyé par{" "}
              <code>/api/admin/drivers/online</code>. Affichage en mode
              démo. Les positions live apparaîtront ici dès que des drivers
              seront connectés.
            </DevNote>
          ) : null}
        </CardContent>
      </Card>

      <div className={expanded ? undefined : "lg:col-span-2"}>
        <PendingValidations
          drivers={pendingDrivers}
          error={pendingError}
        />
      </div>
    </section>
  );
}
