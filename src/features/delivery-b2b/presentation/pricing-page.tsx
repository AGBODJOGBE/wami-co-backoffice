"use client";

import { Banknote, Info, Layers, MapPinned } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";

export function PricingPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Livraison B2B"
        title="Tarification livraison"
        dataSource="mock"
        dataSourceHint="Endpoint admin manquant — GET/PUT /api/admin/delivery/pricing à créer côté backend."
        description="Zones géographiques, tarifs de base, frais kilométriques et multiplicateurs par priorité."
      />

      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/30">
        <Info className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="text-xs text-amber-700 dark:text-amber-300">
          La tarification livraison n'a pas encore d'endpoints admin dédiés. Les modifications faites ici ne sont <strong>pas persistées</strong> — elles seront actives tant que le backend ne dispose pas de <code className="font-mono">GET/PUT /api/admin/delivery/pricing</code>.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-dashed">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MapPinned className="size-5 text-[color:var(--muted-foreground)]" />
                <CardTitle className="text-[color:var(--muted-foreground)]">Zones géographiques</CardTitle>
              </div>
              <Badge tone="neutral">Endpoint manquant</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <MapPinned className="size-12 text-[color:var(--muted-foreground)]" />
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-[color:var(--foreground)]">Zones de livraison et tarifs de base</p>
                <p className="text-xs text-[color:var(--muted-foreground)]">
                  Définition des zones (nom, distance min/max, prix de base, prix/km) — CRUD complet disponible une fois <code className="font-mono">GET/POST /api/admin/delivery/pricing/zones</code> créé côté backend.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Layers className="size-5 text-[color:var(--muted-foreground)]" />
                <CardTitle className="text-[color:var(--muted-foreground)]">Multiplicateurs</CardTitle>
              </div>
              <Badge tone="neutral">Endpoint manquant</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <Layers className="size-12 text-[color:var(--muted-foreground)]" />
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-[color:var(--foreground)]">Priorité & type de colis</p>
                <p className="text-xs text-[color:var(--muted-foreground)]">
                  Multiplicateurs de prix par priorité (NORMAL/EXPRESS/URGENT) et par type de colis (DOCUMENT, FOOD, FRAGILE…) — disponible avec <code className="font-mono">GET/PUT /api/admin/delivery/pricing/multipliers</code>.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-dashed lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Banknote className="size-5 text-[color:var(--muted-foreground)]" />
                <CardTitle className="text-[color:var(--muted-foreground)]">Endpoints backend à créer</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)]/20 px-4 py-3 text-xs">
              <ul className="flex flex-col gap-1 text-[color:var(--muted-foreground)]">
                <li><code className="font-mono">GET    /api/admin/delivery/pricing</code> — config complète (zones + multiplicateurs)</li>
                <li><code className="font-mono">POST   /api/admin/delivery/pricing/zones</code> — créer une zone</li>
                <li><code className="font-mono">PUT    /api/admin/delivery/pricing/zones/:id</code> — modifier une zone</li>
                <li><code className="font-mono">DELETE /api/admin/delivery/pricing/zones/:id</code> — supprimer une zone</li>
                <li><code className="font-mono">PUT    /api/admin/delivery/pricing/multipliers</code> — mettre à jour les multiplicateurs</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
