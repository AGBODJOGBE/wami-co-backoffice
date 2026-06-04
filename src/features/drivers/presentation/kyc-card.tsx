"use client";

import { Check, FileText, X } from "lucide-react";
import { Avatar } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { VEHICLE_TYPE_LABELS } from "@/features/rides/domain/ride";
import type { DriverRow } from "../domain/driver";

const REQUIRED_DOCS = [
  "Permis de conduire",
  "Carte d'identité",
  "Casier judiciaire",
  "Carte grise",
  "Assurance",
];

export interface KycCardProps {
  driver: DriverRow;
  onApprove: () => void;
  onRequestDocs: () => void;
  onReject: () => void;
}

export function KycCard({ driver, onApprove, onRequestDocs, onReject }: KycCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar name={driver.fullName} className="size-12 text-base" />
          <div className="flex flex-col leading-tight">
            <p className="text-base font-semibold text-[color:var(--foreground)]">
              {driver.fullName}
            </p>
            <p className="text-xs text-[color:var(--muted-foreground)]">
              {driver.phone} · {driver.city}
            </p>
          </div>
        </div>
        <Badge tone="warning">{driver.registeredAgo}</Badge>
      </div>

      <div className="mt-4 grid gap-2 rounded-lg bg-[color:var(--muted)] p-3 text-xs sm:grid-cols-3">
        <div className="flex flex-col">
          <span className="text-[color:var(--muted-foreground)]">Catégorie</span>
          <span className="font-medium text-[color:var(--foreground)]">
            {VEHICLE_TYPE_LABELS[driver.category]}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[color:var(--muted-foreground)]">Véhicule</span>
          <span className="font-medium text-[color:var(--foreground)]">
            {driver.vehicle}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[color:var(--muted-foreground)]">Plaque</span>
          <span className="font-mono uppercase text-[color:var(--foreground)]">
            {driver.plate}
          </span>
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
          Pièces ({REQUIRED_DOCS.length - driver.missingDocuments.length}/{REQUIRED_DOCS.length})
        </p>
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {REQUIRED_DOCS.map((doc) => {
            const missing = driver.missingDocuments.includes(doc);
            return (
              <li
                key={doc}
                className="flex items-center gap-2 rounded-md border border-[color:var(--border)] px-3 py-1.5 text-sm"
              >
                <FileText className="size-3.5 shrink-0 text-[color:var(--muted-foreground)]" />
                <span className="flex-1 truncate text-[color:var(--foreground)]">{doc}</span>
                {missing ? (
                  <span
                    className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                    aria-label="Manquant"
                  >
                    <X className="size-3" />
                  </span>
                ) : (
                  <span
                    className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                    aria-label="Reçu"
                  >
                    <Check className="size-3" />
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-5 flex items-center gap-2 border-t border-[color:var(--border)] pt-4">
        <Button
          size="sm"
          disabled={driver.missingDocuments.length > 0}
          onClick={onApprove}
        >
          Approuver
        </Button>
        <Button variant="outline" size="sm" onClick={onRequestDocs}>
          Demander un complément
        </Button>
        <span className="flex-1" />
        <Button variant="danger" size="sm" onClick={onReject}>
          Rejeter
        </Button>
      </div>
    </Card>
  );
}
