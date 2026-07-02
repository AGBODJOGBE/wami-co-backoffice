"use client";

import { useState, useTransition } from "react";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Modal } from "@/shared/ui/modal";
import { createVehicleAction } from "../application/actions";
import type { CreatePlatformVehicleInput } from "../domain/vehicle";

// URL placeholder utilisée comme document temporaire
const PLACEHOLDER_DOC = "https://placehold.co/600x400.png";

interface BulkVehicle {
  licensePlate: string;
  status: "idle" | "loading" | "ok" | "error";
  message?: string;
}

export interface BulkVehicleConfig {
  title: string;
  plates: string[];
  baseData: Omit<CreatePlatformVehicleInput, "licensePlate">;
}

export const TVS_TRICYCLE_CONFIG: BulkVehicleConfig = {
  title: "Import — 10 TVS KING DELUXE (Tricycles)",
  plates: [
    "2FM 3803 RB",
    "2FM 3799 RB",
    "2FM 3826 RB",
    "2FM 3797 RB",
    "2FF 9791 RB",
    "2FM 3811 RB",
    "2FM 3792 RB",
    "2FL 7278 RB",
    "2FL 7251 RB",
    "2FM 3804 RB",
  ],
  baseData: {
    type: "TRICYCLE",
    category: "STANDARD",
    make: "TVS",
    model: "KING DELUXE",
    year: 2025,
    color: "Bleu",
    seats: 3,
    registrationCardUrl: PLACEHOLDER_DOC,
    insuranceUrl: PLACEHOLDER_DOC,
    insuranceExpiryDate: "2027-06-20",
    purchaseDate: "2025-05-02",
    purchasePrice: 1500000,
  },
};

export const TVS_CAR_CONFIG: BulkVehicleConfig = {
  title: "Import — 4 TVS KING DELUXE (Voitures)",
  plates: [
    "CJ 6607 RB",
    "CJ 6608 RB",
    "CJ 6905 RB",
    "CJ 6906 RB",
  ],
  baseData: {
    type: "CAR",
    category: "STANDARD",
    make: "TVS",
    model: "KING DELUXE",
    year: 2025,
    color: "Bleu",
    seats: 5,
    registrationCardUrl: PLACEHOLDER_DOC,
    insuranceUrl: PLACEHOLDER_DOC,
    insuranceExpiryDate: "2027-06-20",
    purchaseDate: "2025-05-02",
    purchasePrice: 1500000,
  },
};

interface Props {
  open: boolean;
  onClose: () => void;
  config: BulkVehicleConfig;
}

export function VehicleBulkCreateModal({ open, onClose, config }: Props) {
  const [rows, setRows] = useState<BulkVehicle[]>(
    config.plates.map((p) => ({ licensePlate: p, status: "idle" })),
  );
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);

  function updateRow(plate: string, patch: Partial<BulkVehicle>) {
    setRows((prev) =>
      prev.map((r) => (r.licensePlate === plate ? { ...r, ...patch } : r)),
    );
  }

  function handleStart() {
    setRows(config.plates.map((p) => ({ licensePlate: p, status: "idle" })));
    setDone(false);

    start(async () => {
      for (const plate of config.plates) {
        updateRow(plate, { status: "loading" });
        const r = await createVehicleAction({
          ...config.baseData,
          licensePlate: plate,
        });
        updateRow(plate, {
          status: r.ok ? "ok" : "error",
          message: r.message,
        });
      }
      setDone(true);
    });
  }

  const okCount = rows.filter((r) => r.status === "ok").length;
  const errCount = rows.filter((r) => r.status === "error").length;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={config.title}
      description="Crée les véhicules avec des documents placeholder. Tu pourras mettre à jour les vrais documents via le formulaire d'édition."
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <div className="text-sm text-[color:var(--muted-foreground)]">
            {done && (
              <span>
                {okCount} créés · {errCount} erreurs
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} disabled={pending}>
              Fermer
            </Button>
            {!done && (
              <Button onClick={handleStart} disabled={pending} isLoading={pending}>
                {pending ? "Création en cours…" : "Lancer l'import"}
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-1">
        {/* Résumé données communes */}
        <div className="mb-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)]/40 px-4 py-3 text-sm">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
            Données communes
          </p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
            <span><span className="text-[color:var(--muted-foreground)]">Marque :</span> {config.baseData.make}</span>
            <span><span className="text-[color:var(--muted-foreground)]">Modèle :</span> {config.baseData.model}</span>
            <span><span className="text-[color:var(--muted-foreground)]">Type :</span> {config.baseData.type}</span>
            <span><span className="text-[color:var(--muted-foreground)]">Couleur :</span> {config.baseData.color}</span>
            <span><span className="text-[color:var(--muted-foreground)]">Année :</span> {config.baseData.year}</span>
            <span><span className="text-[color:var(--muted-foreground)]">Sièges :</span> {config.baseData.seats}</span>
            <span><span className="text-[color:var(--muted-foreground)]">Prix d'achat :</span> {config.baseData.purchasePrice.toLocaleString("fr-FR")} FCFA</span>
            <span><span className="text-[color:var(--muted-foreground)]">Date d'achat :</span> {config.baseData.purchaseDate}</span>
            <span><span className="text-[color:var(--muted-foreground)]">Exp. assurance :</span> {config.baseData.insuranceExpiryDate}</span>
          </div>
        </div>

        {/* Liste véhicules */}
        <div className="divide-y divide-[color:var(--border)] rounded-lg border border-[color:var(--border)]">
          {rows.map((row) => (
            <div
              key={row.licensePlate}
              className="flex items-center justify-between px-4 py-2.5"
            >
              <span className="font-mono text-sm font-medium">
                {row.licensePlate}
              </span>
              <div className="flex items-center gap-2 text-sm">
                {row.status === "idle" && (
                  <span className="text-[color:var(--muted-foreground)]">En attente</span>
                )}
                {row.status === "loading" && (
                  <Loader2 className="size-4 animate-spin text-[color:var(--primary)]" />
                )}
                {row.status === "ok" && (
                  <span className="flex items-center gap-1 text-[color:var(--success,#16a34a)]">
                    <CheckCircle className="size-4" /> Créé
                  </span>
                )}
                {row.status === "error" && (
                  <span className="flex items-center gap-1 text-[color:var(--danger)]" title={row.message}>
                    <XCircle className="size-4" /> {row.message ?? "Erreur"}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
