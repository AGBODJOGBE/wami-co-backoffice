"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/shared/ui/button";
import { Combobox } from "@/shared/ui/combobox";
import { Input } from "@/shared/ui/input";
import { Modal } from "@/shared/ui/modal";
import { Select } from "@/shared/ui/select";
import { toast } from "@/shared/ui/toast";
import type { AdminDriver } from "@/features/drivers/domain/admin-driver";
import type { VehicleSummary } from "@/features/vehicles/domain/vehicle";
import { createContractAction } from "../application/actions";
import {
  PAYMENT_FREQUENCY_OPTIONS,
  formatXof,
  type CreateContractInput,
  type PaymentFrequency,
} from "../domain/contract";

// ─── Annuity calc ─────────────────────────────────────────────────────────────

function calcEcheance(input: CreateContractInput): number {
  const { montantTotal, apport, tauxInteret, dureeMois, frequencePaiement } = input;
  const capital = montantTotal - apport;
  if (capital <= 0 || dureeMois <= 0) return 0;

  const periodsPerYear =
    frequencePaiement === "DAILY"
      ? 365
      : frequencePaiement === "WEEKLY"
        ? 52
        : frequencePaiement === "QUARTERLY"
          ? 4
          : 12;

  const nbPeriods = Math.round((dureeMois / 12) * periodsPerYear);
  const ratePerPeriod = tauxInteret / periodsPerYear;

  if (ratePerPeriod === 0) return Math.round(capital / nbPeriods);

  const echeance =
    (capital * ratePerPeriod * Math.pow(1 + ratePerPeriod, nbPeriods)) /
    (Math.pow(1 + ratePerPeriod, nbPeriods) - 1);

  return Math.round(echeance);
}

// ─── Default form ─────────────────────────────────────────────────────────────

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

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ContractCreateModalProps {
  open: boolean;
  onClose: () => void;
  drivers: AdminDriver[];
  vehicles: VehicleSummary[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ContractCreateModal({
  open,
  onClose,
  drivers,
  vehicles,
}: ContractCreateModalProps) {
  const [form, setForm] = useState<CreateContractInput>(defaultForm());
  const [pending, start] = useTransition();

  // Reset on open
  useEffect(() => {
    if (open) setForm(defaultForm());
  }, [open]);

  function set<K extends keyof CreateContractInput>(
    key: K,
    value: CreateContractInput[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // ── Driver options — approved, not vehicle owner, no vehicle assigned ───────
  const driverOptions = useMemo(
    () =>
      drivers
        .filter((d) => d.isApproved && !d.isVehicleOwner && !d.vehicle)
        .map((d) => ({
          value: d.driverId,
          label: `${d.firstName} ${d.lastName}`.trim() || d.driverId,
          description: d.phoneNumber,
        })),
    [drivers],
  );

  // ── Vehicle options — platform vehicles: verified and not yet assigned ──────
  const vehicleOptions = useMemo(() => {
    if (!form.driverId) return [];
    return vehicles
      .filter(
        (v) =>
          v.ownership === "PLATFORM" &&
          v.isVerified &&
          !v.assignedToDriverId,
      )
      .map((v) => ({
        value: v.id,
        label: v.licensePlate,
        description: `${v.make} ${v.model} ${v.year} · ${v.type}`,
      }));
  }, [vehicles, form.driverId]);

  // ── Selected vehicle (for info card + price auto-fill) ─────────────────────
  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === form.vehicleId) ?? null,
    [vehicles, form.vehicleId],
  );

  // Auto-fill montantTotal from vehicle purchasePrice when vehicle is picked
  useEffect(() => {
    if (selectedVehicle?.purchasePrice) {
      set("montantTotal", selectedVehicle.purchasePrice);
    }
  }, [selectedVehicle]);

  // Clear vehicle when driver changes
  function onDriverChange(driverId: string) {
    setForm((f) => ({
      ...f,
      driverId,
      vehicleId: "",
      montantTotal: 0,
      apport: 0,
    }));
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const echeance = calcEcheance(form);
  const capital = form.montantTotal - form.apport;
  const priceFromVehicle = !!selectedVehicle?.purchasePrice;

  // ── Validation & submit ───────────────────────────────────────────────────
  function submit() {
    if (!form.driverId) {
      toast({ kind: "error", title: "Champ requis", description: "Veuillez sélectionner un driver." });
      return;
    }
    if (!form.vehicleId) {
      toast({ kind: "error", title: "Champ requis", description: "Veuillez sélectionner un véhicule." });
      return;
    }
    if (form.montantTotal <= 0) {
      toast({ kind: "error", title: "Montant invalide", description: "Le prix de revente doit être supérieur à 0." });
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

        {/* ── Parties ────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
            Parties
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Combobox
              label="Driver *"
              placeholder="Sélectionner un driver…"
              searchPlaceholder="Rechercher par nom ou téléphone…"
              emptyMessage="Aucun driver approuvé trouvé."
              options={driverOptions}
              value={form.driverId}
              onChange={onDriverChange}
              allowClear
              required
              hint="Drivers approuvés, sans véhicule (propriétaire = Non)."
            />

            <div className="flex flex-col gap-1.5">
              <Combobox
                label="Véhicule *"
                placeholder={
                  form.driverId
                    ? "Sélectionner par immatriculation…"
                    : "Sélectionnez d'abord un driver"
                }
                searchPlaceholder="Rechercher par immatriculation…"
                emptyMessage="Aucun véhicule plateforme vérifié et non assigné disponible."
                options={vehicleOptions}
                value={form.vehicleId}
                onChange={(id) => set("vehicleId", id)}
                allowClear
                disabled={!form.driverId}
                required
              />
            </div>
          </div>

          {/* Vehicle info card */}
          {selectedVehicle ? (
            <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)]/40 px-4 py-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
                Informations du véhicule
              </p>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-xs text-[color:var(--muted-foreground)]">Marque</dt>
                  <dd className="font-medium text-[color:var(--foreground)]">{selectedVehicle.make}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[color:var(--muted-foreground)]">Modèle</dt>
                  <dd className="font-medium text-[color:var(--foreground)]">{selectedVehicle.model}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[color:var(--muted-foreground)]">Année</dt>
                  <dd className="font-medium text-[color:var(--foreground)]">{selectedVehicle.year}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[color:var(--muted-foreground)]">Type</dt>
                  <dd className="font-medium text-[color:var(--foreground)]">{selectedVehicle.type}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[color:var(--muted-foreground)]">Immatriculation</dt>
                  <dd className="font-mono font-medium text-[color:var(--foreground)]">
                    {selectedVehicle.licensePlate}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[color:var(--muted-foreground)]">Couleur</dt>
                  <dd className="font-medium text-[color:var(--foreground)]">{selectedVehicle.color}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[color:var(--muted-foreground)]">Catégorie</dt>
                  <dd className="font-medium text-[color:var(--foreground)]">
                    {selectedVehicle.category ?? "—"}
                  </dd>
                </div>
                {selectedVehicle.purchasePrice ? (
                  <div>
                    <dt className="text-xs text-[color:var(--muted-foreground)]">Prix d'achat</dt>
                    <dd className="font-semibold text-[color:var(--foreground)]">
                      {formatXof(selectedVehicle.purchasePrice)}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </div>
          ) : null}
        </div>

        {/* ── Durée ──────────────────────────────────────────────────────── */}
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
              hint={
                form.dateDebut
                  ? `Fin estimée : ${new Date(
                      new Date(form.dateDebut).setMonth(
                        new Date(form.dateDebut).getMonth() + form.dureeMois,
                      ),
                    ).toLocaleDateString("fr-FR")}`
                  : undefined
              }
              required
            />
          </div>
        </div>

        {/* ── Conditions financières ─────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
            Conditions financières
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Prix de revente — read-only si vient du véhicule, éditable sinon */}
            {priceFromVehicle ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-[color:var(--foreground)]">
                  Prix de revente (FCFA)
                </span>
                <div className="flex h-10 items-center rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)]/40 px-3 text-sm font-semibold text-[color:var(--foreground)]">
                  {formatXof(form.montantTotal)}
                </div>
                <p className="text-xs text-[color:var(--muted-foreground)]">
                  Issu des données du véhicule — non modifiable ici.
                </p>
              </div>
            ) : (
              <Input
                label="Prix de revente (FCFA) *"
                type="number"
                min={0}
                step={10000}
                value={form.montantTotal}
                onChange={(e) => set("montantTotal", Number(e.target.value))}
                hint={form.montantTotal > 0 ? formatXof(form.montantTotal) : "Prix négocié avec le driver"}
                required
              />
            )}

            <Input
              label="Apport initial (FCFA) *"
              type="number"
              min={0}
              step={10000}
              value={form.apport}
              onChange={(e) => set("apport", Number(e.target.value))}
              hint={`Capital restant : ${formatXof(Math.max(0, capital))}`}
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

        {/* ── Simulation ─────────────────────────────────────────────────── */}
        {form.montantTotal > 0 && form.apport < form.montantTotal && (
          <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)]/40 px-4 py-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
              Simulation de l'échéancier
            </p>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs text-[color:var(--muted-foreground)]">Capital financé</dt>
                <dd className="font-semibold text-[color:var(--foreground)]">{formatXof(capital)}</dd>
              </div>
              <div>
                <dt className="text-xs text-[color:var(--muted-foreground)]">Échéance</dt>
                <dd className="font-semibold text-[color:var(--foreground)]">{formatXof(echeance)}</dd>
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
