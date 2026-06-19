"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Modal } from "@/shared/ui/modal";
import { Select } from "@/shared/ui/select";
import { toast } from "@/shared/ui/toast";
import { createContractAction } from "../application/actions";
import {
  PAYMENT_FREQUENCY_OPTIONS,
  formatXof,
  type CreateContractInput,
  type PaymentFrequency,
} from "../domain/contract";

function defaultForm(): CreateContractInput {
  const today = new Date().toISOString().slice(0, 10);
  return {
    driverId: "",
    vehicleId: "",
    dateDebut: today,
    dureeMois: 24,
    montantTotal: 0,
    apport: 0,
    tauxInteret: 0.05,
    frequencePaiement: "MONTHLY",
  };
}

function calcMensualite(input: CreateContractInput): number {
  const { montantTotal, apport, tauxInteret, dureeMois, frequencePaiement } = input;
  const capital = montantTotal - apport;
  if (capital <= 0 || dureeMois <= 0) return 0;

  const periodsPerYear = frequencePaiement === "WEEKLY" ? 52 : frequencePaiement === "QUARTERLY" ? 4 : 12;
  const nbPeriods = Math.round((dureeMois / 12) * periodsPerYear);
  const ratePerPeriod = tauxInteret / periodsPerYear;

  if (ratePerPeriod === 0) return Math.round(capital / nbPeriods);

  // Standard annuity formula
  const mensualite =
    (capital * ratePerPeriod * Math.pow(1 + ratePerPeriod, nbPeriods)) /
    (Math.pow(1 + ratePerPeriod, nbPeriods) - 1);

  return Math.round(mensualite);
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ContractCreateModal({ open, onClose }: Props) {
  const [form, setForm] = useState<CreateContractInput>(defaultForm());
  const [pending, start] = useTransition();

  useEffect(() => {
    if (open) setForm(defaultForm());
  }, [open]);

  function set<K extends keyof CreateContractInput>(
    key: K,
    value: CreateContractInput[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const mensualite = calcMensualite(form);
  const capital = form.montantTotal - form.apport;

  function submit() {
    if (!form.driverId.trim()) {
      toast({ kind: "error", title: "Champ requis", description: "L'identifiant du driver est requis." });
      return;
    }
    if (!form.vehicleId.trim()) {
      toast({ kind: "error", title: "Champ requis", description: "L'identifiant du véhicule est requis." });
      return;
    }
    if (form.montantTotal <= 0) {
      toast({ kind: "error", title: "Montant invalide", description: "Le montant total doit être supérieur à 0." });
      return;
    }
    if (form.apport >= form.montantTotal) {
      toast({ kind: "error", title: "Apport invalide", description: "L'apport doit être inférieur au montant total." });
      return;
    }
    if (form.dureeMois < 1) {
      toast({ kind: "error", title: "Durée invalide", description: "La durée doit être d'au moins 1 mois." });
      return;
    }

    start(async () => {
      const r = await createContractAction(form);
      if (r.ok) {
        toast({ kind: "success", title: "Contrat créé", description: r.message });
        onClose();
      } else {
        toast({ kind: "error", title: "Échec", description: r.message });
      }
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Nouveau contrat de location-vente"
      description="Le driver doit être approuvé et ses documents vérifiés pour être éligible."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Annuler
          </Button>
          <Button onClick={submit} isLoading={pending}>
            {pending ? "Création…" : "Créer le contrat"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        {/* Parties */}
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
            Parties
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="ID du driver *"
              value={form.driverId}
              onChange={(e) => set("driverId", e.target.value.trim())}
              placeholder="UUID du driverProfile"
              hint="Copier depuis la liste des drivers"
              required
            />
            <Input
              label="ID du véhicule *"
              value={form.vehicleId}
              onChange={(e) => set("vehicleId", e.target.value.trim())}
              placeholder="UUID du véhicule"
              hint="vehicleId rattaché au driver"
              required
            />
          </div>
        </div>

        {/* Durée */}
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
            Durée du contrat
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Date de début *"
              type="date"
              value={form.dateDebut}
              onChange={(e) => set("dateDebut", e.target.value)}
              required
            />
            <Input
              label="Durée (mois) *"
              type="number"
              min={1}
              max={120}
              value={form.dureeMois}
              onChange={(e) => set("dureeMois", Math.max(1, Number(e.target.value)))}
              hint={`Fin estimée : ${
                form.dateDebut
                  ? new Date(
                      new Date(form.dateDebut).setMonth(
                        new Date(form.dateDebut).getMonth() + form.dureeMois,
                      ),
                    ).toLocaleDateString("fr-FR")
                  : "—"
              }`}
              required
            />
          </div>
        </div>

        {/* Finances */}
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
            Conditions financières
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Montant total (FCFA) *"
              type="number"
              min={0}
              step={10000}
              value={form.montantTotal}
              onChange={(e) => set("montantTotal", Number(e.target.value))}
              hint={formatXof(form.montantTotal)}
              required
            />
            <Input
              label="Apport initial (FCFA) *"
              type="number"
              min={0}
              step={10000}
              value={form.apport}
              onChange={(e) => set("apport", Number(e.target.value))}
              hint={`Capital restant : ${formatXof(capital)}`}
              required
            />
            <Input
              label="Taux d'intérêt annuel *"
              type="number"
              min={0}
              max={1}
              step={0.005}
              value={form.tauxInteret}
              onChange={(e) => set("tauxInteret", Number(e.target.value))}
              hint={`${(form.tauxInteret * 100).toFixed(1)} % / an`}
              required
            />
            <Select
              label="Fréquence de paiement *"
              id="contract-freq"
              options={PAYMENT_FREQUENCY_OPTIONS}
              value={form.frequencePaiement}
              onChange={(e) =>
                set("frequencePaiement", e.target.value as PaymentFrequency)
              }
            />
          </div>
        </div>

        {/* Résumé simulé */}
        {form.montantTotal > 0 && form.apport < form.montantTotal && (
          <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)]/40 px-4 py-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
              Simulation
            </p>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs text-[color:var(--muted-foreground)]">Capital financé</dt>
                <dd className="font-semibold text-[color:var(--foreground)]">{formatXof(capital)}</dd>
              </div>
              <div>
                <dt className="text-xs text-[color:var(--muted-foreground)]">Échéance</dt>
                <dd className="font-semibold text-[color:var(--foreground)]">{formatXof(mensualite)}</dd>
              </div>
              <div>
                <dt className="text-xs text-[color:var(--muted-foreground)]">Durée</dt>
                <dd className="font-semibold text-[color:var(--foreground)]">{form.dureeMois} mois</dd>
              </div>
              <div>
                <dt className="text-xs text-[color:var(--muted-foreground)]">Fréquence</dt>
                <dd className="font-semibold text-[color:var(--foreground)]">
                  {PAYMENT_FREQUENCY_OPTIONS.find((o) => o.value === form.frequencePaiement)?.label}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </Modal>
  );
}
