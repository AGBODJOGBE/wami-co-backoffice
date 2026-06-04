"use client";

import {
  AlertTriangle,
  Award,
  CreditCard,
  History,
  Star,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { DevNote } from "@/shared/ui/dev-note";

/**
 * Design-only enrichment of the driver detail page (US-G04 / US-F01 /
 * sanctions). Shows the layout the screen will hold once the backend
 * exposes the corresponding endpoints. Every value here is a placeholder.
 */
export function DriverDesignSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="size-5 text-[color:var(--primary)]" />
              <CardTitle>Statistiques (design)</CardTitle>
            </div>
          </CardHeader>

          <CardContent>
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-[color:var(--muted-foreground)]">Courses</dt>
              <dd className="text-right font-semibold">—</dd>
              <dt className="text-[color:var(--muted-foreground)]">
                Note moyenne
              </dt>
              <dd className="flex items-center justify-end gap-1 font-semibold">
                — <Star className="size-3.5 text-[color:var(--warning)]" />
              </dd>
              <dt className="text-[color:var(--muted-foreground)]">
                Taux d&apos;acceptation
              </dt>
              <dd className="text-right">—</dd>
              <dt className="text-[color:var(--muted-foreground)]">
                Annulations
              </dt>
              <dd className="text-right">—</dd>
            </dl>
          </CardContent>
          
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="size-5 text-[color:var(--success)]" />
              <CardTitle>Wallet (design)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-[color:var(--muted-foreground)]">
                Solde principal
              </dt>
              <dd className="text-right font-semibold">— FCFA</dd>
              <dt className="text-[color:var(--muted-foreground)]">
                Garantie
              </dt>
              <dd className="text-right">— FCFA</dd>
              <dt className="text-[color:var(--muted-foreground)]">
                Cashback
              </dt>
              <dd className="text-right">— FCFA</dd>
              <dt className="text-[color:var(--muted-foreground)]">
                Dernier retrait
              </dt>
              <dd className="text-right">—</dd>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-[color:var(--warning)]" />
              <CardTitle>Sanctions (design)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2 text-sm">
              <li className="flex items-center justify-between rounded-md border border-dashed border-[color:var(--border)] p-2">
                <span className="text-[color:var(--muted-foreground)]">
                  Aucune sanction active
                </span>
                <Badge tone="success">RAS</Badge>
              </li>
              <li className="text-xs italic text-[color:var(--muted-foreground)]">
                L&apos;historique d&apos;avertissements et de suspensions
                apparaîtra ici.
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="size-5 text-[color:var(--secondary)]" />
            <CardTitle>Historique des courses (design)</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col divide-y divide-[color:var(--border)]">
            {Array.from({ length: 4 }).map((_, i) => (
              <li
                key={i}
                className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-2.5"
              >
                <div className="flex size-8 items-center justify-center rounded-md bg-[color:var(--muted)]">
                  <Award className="size-4 text-[color:var(--muted-foreground)]" />
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-medium text-[color:var(--foreground)]">
                    Course #—
                  </span>
                  <span className="text-xs text-[color:var(--muted-foreground)]">
                    Pickup → Destination · — km · — min
                  </span>
                </div>
                <span className="text-sm font-semibold">— FCFA</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <DevNote>
        Prochaine tâche : Rajouter les sections « Statistiques », « Wallet », « Sanctions » et «
        Historique » à brancher dès que server expose{" "}
        <code>GET /api/admin/drivers/&#123;driverId&#125;</code> (avec
        agrégats), <code>GET /api/admin/wallets/&#123;userId&#125;</code> et{" "}
        <code>GET /api/admin/drivers/&#123;driverId&#125;/sanctions</code>.
      </DevNote>
    </div>
  );
}
