"use client";

import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  History,
  MinusCircle,
  PlusCircle,
  Search,
  Wallet,
} from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { DevNote } from "@/shared/ui/dev-note";
import { Input } from "@/shared/ui/input";

/**
 * Design-only sections for US-F01 (consult wallet), US-F02 (manual
 * credit/debit) and US-F03 (withdrawals history). The forms are wired
 * to local state only — no backend call. Plug into real endpoints when
 * the backend ships them.
 */
export function WalletAdminDesign() {
  const [userId, setUserId] = useState("");

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Wallet className="size-5 text-[color:var(--primary)]" />
            <CardTitle>Wallet d&apos;un utilisateur (design)</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <div className="flex items-end gap-2">
              <Input
                label="User ID ou téléphone"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="bed23218-… ou +229 61 00 00 00"
                leftIcon={<Search className="size-4" />}
                className="flex-1"
              />
              <Button disabled>Consulter</Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-dashed border-[color:var(--border)] p-3">
                <p className="text-[10px] uppercase tracking-wider text-[color:var(--muted-foreground)]">
                  Solde principal
                </p>
                <p className="mt-1 text-xl font-semibold">— FCFA</p>
              </div>
              <div className="rounded-lg border border-dashed border-[color:var(--border)] p-3">
                <p className="text-[10px] uppercase tracking-wider text-[color:var(--muted-foreground)]">
                  Garantie
                </p>
                <p className="mt-1 text-xl font-semibold">— FCFA</p>
              </div>
              <div className="rounded-lg border border-dashed border-[color:var(--border)] p-3">
                <p className="text-[10px] uppercase tracking-wider text-[color:var(--muted-foreground)]">
                  Cashback
                </p>
                <p className="mt-1 text-xl font-semibold">— FCFA</p>
              </div>
            </div>

            <DevNote>
              Brancher sur <code>GET /api/admin/wallets/&#123;userId&#125;</code> et{" "}
              <code>GET /api/admin/wallets/&#123;userId&#125;/transactions</code>{" "}
              pour afficher le solde réel, l&apos;historique filtrable par
              type et période, et les sous-balances.
            </DevNote>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <PlusCircle className="size-5 text-[color:var(--success)]" />
              <CardTitle>Crédit manuel (design)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <Input label="Montant (FCFA)" type="number" disabled />
              <Input
                label="Motif (obligatoire)"
                placeholder="Bonus exceptionnel pour…"
                disabled
              />
              <Button variant="outline" disabled>
                <PlusCircle className="size-4" />
                Créditer
              </Button>
              <DevNote>
                Brancher sur{" "}
                <code>POST /api/admin/wallets/&#123;userId&#125;/adjust</code>{" "}
                avec le motif (audit trail).
              </DevNote>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MinusCircle className="size-5 text-[color:var(--danger)]" />
              <CardTitle>Débit manuel (design)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <Input label="Montant (FCFA)" type="number" disabled />
              <Input
                label="Motif (obligatoire)"
                placeholder="Pénalité no-show…"
                disabled
              />
              <Button variant="outline" disabled>
                <MinusCircle className="size-4" />
                Débiter
              </Button>
              <DevNote>
                Même endpoint que le crédit avec un montant négatif (ou flag
                <code>type: DEBIT</code> selon ce que retient le backend).
              </DevNote>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="size-5 text-[color:var(--secondary)]" />
            <CardTitle>Historique des retraits (design)</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2 text-xs">
              <Input
                placeholder="Driver"
                disabled
                className="sm:w-44"
              />
              <Input
                type="date"
                disabled
                className="sm:w-36"
              />
              <Input
                type="date"
                disabled
                className="sm:w-36"
              />
              <Input
                placeholder="Opérateur (MoMo, Flooz…)"
                disabled
                className="sm:w-44"
              />
            </div>
            <ul className="flex flex-col divide-y divide-[color:var(--border)] rounded-md border border-dashed border-[color:var(--border)]">
              {Array.from({ length: 4 }).map((_, i) => (
                <li
                  key={i}
                  className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 px-3 py-2.5"
                >
                  <ArrowUpRight className="size-4 text-[color:var(--muted-foreground)]" />
                  <div className="flex flex-col leading-tight">
                    <span className="text-sm">Driver #—</span>
                    <span className="text-[10px] text-[color:var(--muted-foreground)]">
                      MoMo · — FCFA
                    </span>
                  </div>
                  <Badge tone="neutral">—</Badge>
                  <Badge tone="success">Réglé</Badge>
                </li>
              ))}
            </ul>
            <DevNote>
              Brancher sur <code>GET /api/admin/withdrawals</code> avec
              filtres (driver, période, opérateur, montant). Penser à
              ajouter le bouton « Export CSV » via{" "}
              <code>downloadCsv()</code>.
            </DevNote>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ArrowDownLeft className="size-5 text-[color:var(--info)]" />
            <CardTitle>Recharges (design)</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[color:var(--muted-foreground)]">
            La liste des recharges utilisateurs apparaîtra ici, avec total
            agrégé et entrée par opérateur.
          </p>
        </CardContent>
      </Card>

      <DevNote>
        L&apos;ensemble du module Wallet/Finance est en attente côté backend.
        Endpoints à demander : list balances, transactions filtrables,
        ajustement manuel avec motif, historique des retraits, recharges.
      </DevNote>
    </div>
  );
}
