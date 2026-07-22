"use client";

import { Building2, Users } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";

export function SendersListPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Livraison B2B"
        title="Expéditeurs / Partenaires"
        dataSource="mock"
        dataSourceHint="Endpoint admin manquant — GET /api/admin/delivery/senders ou GET /api/admin/partners à créer."
        description="Gestion des partenaires expéditeurs B2B — profil, entrepôts, historique de commandes."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-dashed">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Building2 className="size-5 text-[color:var(--muted-foreground)]" />
                <CardTitle className="text-[color:var(--muted-foreground)]">Partenaires expéditeurs</CardTitle>
              </div>
              <Badge tone="neutral">Endpoint manquant</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <Building2 className="size-12 text-[color:var(--muted-foreground)]" />
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-[color:var(--foreground)]">
                  Nécessite un endpoint admin partenaires
                </p>
                <p className="text-xs text-[color:var(--muted-foreground)]">
                  Le backend dispose de routes partenaires authentifiées (<code className="font-mono">/api/delivery/warehouses</code>, <code className="font-mono">/api/delivery/orders</code>) mais pas encore d'une vue admin listant tous les partenaires avec leurs stats.
                </p>
              </div>
              <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)]/30 px-4 py-3 text-left text-xs">
                <p className="mb-1 font-semibold text-[color:var(--foreground)]">Routes B2B existantes (côté partenaire) :</p>
                <ul className="flex flex-col gap-0.5 text-[color:var(--muted-foreground)]">
                  <li><code className="font-mono">GET   /api/delivery/warehouses</code> — entrepôts du partenaire</li>
                  <li><code className="font-mono">GET   /api/delivery/orders</code> — commandes du partenaire</li>
                  <li><code className="font-mono">POST  /api/delivery/orders/calculate-price</code> — estimation</li>
                </ul>
                <p className="mt-2 font-semibold text-[color:var(--foreground)]">À créer :</p>
                <ul className="flex flex-col gap-0.5 text-[color:var(--muted-foreground)]">
                  <li><code className="font-mono">GET   /api/admin/delivery/senders</code> — liste admin partenaires</li>
                  <li><code className="font-mono">GET   /api/admin/delivery/senders/:id</code> — détail + stats</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="size-5 text-[color:var(--muted-foreground)]" />
                <CardTitle className="text-[color:var(--muted-foreground)]">Entrepôts partenaires</CardTitle>
              </div>
              <Badge tone="neutral">Bientôt</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <Users className="size-12 text-[color:var(--muted-foreground)]" />
              <p className="text-sm text-[color:var(--muted-foreground)]">
                Vue des entrepôts par partenaire (adresse, zones de couverture, statut actif/inactif) disponible une fois l'endpoint admin déployé.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
