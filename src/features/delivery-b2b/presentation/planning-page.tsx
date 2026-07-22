"use client";

import { ClipboardList, Route as RouteIcon } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";

export function PlanningPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Livraison B2B"
        title="Tournées & planning"
        dataSource="mock"
        dataSourceHint="Endpoint admin manquant — GET /api/admin/delivery/rounds à créer côté backend."
        description="Création et suivi des tournées B2B — groupes de stops, livreur assigné, progression."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-dashed">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <RouteIcon className="size-5 text-[color:var(--muted-foreground)]" />
                <CardTitle className="text-[color:var(--muted-foreground)]">Tournées actives</CardTitle>
              </div>
              <Badge tone="neutral">Endpoint manquant</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <RouteIcon className="size-12 text-[color:var(--muted-foreground)]" />
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-[color:var(--foreground)]">
                  Nécessite un endpoint admin
                </p>
                <p className="text-xs text-[color:var(--muted-foreground)]">
                  Le backend B2B dispose de <code className="font-mono">POST /api/delivery/rounds</code> (création par admin) et des routes driver pour le lifecycle, mais pas encore de <code className="font-mono">GET /api/admin/delivery/rounds</code> pour lister les tournées côté admin.
                </p>
              </div>
              <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)]/30 px-4 py-3 text-left text-xs">
                <p className="mb-1 font-semibold text-[color:var(--foreground)]">Routes B2B existantes (backend prêt) :</p>
                <ul className="flex flex-col gap-0.5 text-[color:var(--muted-foreground)]">
                  <li><code className="font-mono">POST   /api/delivery/rounds</code> — créer une tournée</li>
                  <li><code className="font-mono">PATCH  /api/delivery/rounds/:id/accept</code> — driver accepte</li>
                  <li><code className="font-mono">PATCH  /api/delivery/rounds/:id/start</code> — départ entrepôt</li>
                  <li><code className="font-mono">PATCH  /api/delivery/rounds/:id/start-tour</code> — début livraisons</li>
                  <li><code className="font-mono">PATCH  /api/delivery/rounds/:id/complete</code> — tournée terminée</li>
                </ul>
                <p className="mt-2 font-semibold text-[color:var(--foreground)]">À créer :</p>
                <ul className="flex flex-col gap-0.5 text-[color:var(--muted-foreground)]">
                  <li><code className="font-mono">GET    /api/admin/delivery/rounds</code> — liste admin</li>
                  <li><code className="font-mono">GET    /api/admin/delivery/rounds/:id</code> — détail</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ClipboardList className="size-5 text-[color:var(--muted-foreground)]" />
                <CardTitle className="text-[color:var(--muted-foreground)]">Créer une tournée</CardTitle>
              </div>
              <Badge tone="neutral">Bientôt</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <ClipboardList className="size-12 text-[color:var(--muted-foreground)]" />
              <p className="text-sm text-[color:var(--muted-foreground)]">
                Formulaire de création de tournée (sélection d'ordres B2B, assignation livreur, séquençage des stops) disponible une fois l'endpoint de listing déployé.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
