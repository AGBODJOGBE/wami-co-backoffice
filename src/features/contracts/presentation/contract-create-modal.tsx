"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/shared/ui/button";
import { Combobox } from "@/shared/ui/combobox";
import { Input } from "@/shared/ui/input";
import { Modal } from "@/shared/ui/modal";
import { Select } from "@/shared/ui/select";
import { Spinner } from "@/shared/ui/spinner";
import { Textarea } from "@/shared/ui/textarea";
import { toast } from "@/shared/ui/toast";
import type { AdminDriver } from "@/features/drivers/domain/admin-driver";
import {
  VEHICLE_CATEGORY_LABELS,
  VEHICLE_TYPE_LABELS,
  type VehicleSummary,
} from "@/features/vehicles/domain/vehicle";
import { createContractAction } from "../application/actions";
import {
  formatXof,
  PAYMENT_FREQUENCY_OPTIONS,
  type CreateContractInput,
  type PaymentFrequency,
} from "../domain/contract";

// ─── Default form ─────────────────────────────────────────────────────────────

function defaultForm(): CreateContractInput {
  const today = new Date().toISOString().slice(0, 10);
  return {
    driverId: "",
    vehicleId: "",
    dateDebut: today,
    dureeMois: 24,
    montantCaution: 0,
    frequenceEcheances: "MENSUEL",
    marginPct: 20,
    notes: "",
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
  const [vehicleDetail, setVehicleDetail] = useState<VehicleSummary | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Reset on open
  useEffect(() => {
    if (open) {
      setForm(defaultForm());
      setVehicleDetail(null);
    }
  }, [open]);

  // Fetch vehicle detail when vehicleId changes
  useEffect(() => {
    if (!form.vehicleId) { setVehicleDetail(null); return; }
    setLoadingDetail(true);
    fetch(`/api/_proxy/vehicles/${form.vehicleId}`)
      .then((r) => r.json())
      .then((json) => {
        const data = json?.data ?? json;
        setVehicleDetail(data as VehicleSummary);
      })
      .catch(() => setVehicleDetail(null))
      .finally(() => setLoadingDetail(false));
  }, [form.vehicleId]);

  function set<K extends keyof CreateContractInput>(
    key: K,
    value: CreateContractInput[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // ── Driver options — sans véhicule en propre, non suspendus ────────────────
  // Backend (CreateContractUseCase.checkPreconditions) n'exige que
  // isDocumentsVerified + status !== SUSPENDED : isApproved n'est pas un
  // critère serveur, uniquement une restriction produit d'origine — un
  // driver déjà approuvé mais sans véhicule à lui reste un candidat valide.
  const driverOptions = useMemo(
    () =>
      drivers
        .filter((d) => !d.isVehicleOwner && d.status !== "SUSPENDED")
        .map((d) => ({
          value: d.driverId,
          label: `${d.firstName} ${d.lastName}`.trim() || d.driverId,
          description: `${d.phoneNumber} · ${d.isDocumentsVerified ? "✓ Documents vérifiés" : "⚠ Documents non vérifiés"} · ${d.isApproved ? "Approuvé" : "Non approuvé"}`,
        })),
    [drivers],
  );

  const selectedDriver = useMemo(
    () => drivers.find((d) => d.driverId === form.driverId) ?? null,
    [drivers, form.driverId],
  );

  // ── Vehicle options — plateforme, vérifiés, non assignés ──────────────────
  const vehicleOptions = useMemo(() => {
    if (!form.driverId) return [];
    return vehicles
      .filter(
        (v) =>
          v.ownership === "PLATFORM" &&
          v.isVerified &&
          v.status === "AVAILABLE" &&
          !v.assignedToDriverId,
      )
      .map((v) => ({
        value: v.id,
        label: v.licensePlate,
        description: `${v.make} ${v.model} ${v.year} · ${v.type}`,
      }));
  }, [vehicles, form.driverId]);

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === form.vehicleId) ?? null,
    [vehicles, form.vehicleId],
  );

  function onDriverChange(driverId: string) {
    setForm((f) => ({ ...f, driverId, vehicleId: "" }));
  }

  // ── Date fin estimée ───────────────────────────────────────────────────────
  const dateFin = useMemo(() => {
    if (!form.dateDebut || form.dureeMois < 1) return null;
    const d = new Date(form.dateDebut);
    d.setMonth(d.getMonth() + form.dureeMois);
    return d.toLocaleDateString("fr-FR");
  }, [form.dateDebut, form.dureeMois]);

  // ── Simulation financière ──────────────────────────────────────────────────
  const simulation = useMemo(() => {
    const purchasePrice = vehicleDetail?.purchasePrice;
    const marginPct = form.marginPct ?? 20;
    if (!purchasePrice || purchasePrice <= 0 || form.dureeMois < 1) return null;

    const montantTotal = Math.round(purchasePrice * (1 + marginPct / 100));

    const nbEcheances =
      form.frequenceEcheances === "JOURNALIER"
        ? form.dureeMois * 30
        : form.frequenceEcheances === "HEBDOMADAIRE"
          ? form.dureeMois * 4
          : form.dureeMois;

    const montantEcheance = Math.round(montantTotal / nbEcheances);

    return { montantTotal, montantEcheance, nbEcheances };
  }, [vehicleDetail?.purchasePrice, form.marginPct, form.dureeMois, form.frequenceEcheances]);

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
    if (form.dureeMois < 1) {
      toast({ kind: "error", title: "Durée invalide", description: "La durée doit être d'au moins 1 mois." });
      return;
    }
    if (!form.montantCaution || form.montantCaution < 1) {
      toast({ kind: "error", title: "Caution requise", description: "Le montant de la caution est obligatoire (min 1 FCFA)." });
      return;
    }

    start(async () => {
      const payload: CreateContractInput = {
        ...form,
        dureeMois:      Math.floor(form.dureeMois) || 1,
        montantCaution: Math.floor(form.montantCaution) || 0,
        marginPct:      form.marginPct !== undefined ? (isNaN(form.marginPct) ? 20 : form.marginPct) : undefined,
        notes:          form.notes?.trim() || undefined,
      };
      const r = await createContractAction(payload);
      if (r.ok) {
        toast({ kind: "success", title: "Contrat créé", description: r.message });
        onClose();
      } else {
        const isEligibilityError =
          r.message.toLowerCase().includes("eligible") ||
          r.message.toLowerCase().includes("documents verified");
        toast({
          kind: "error",
          title: isEligibilityError ? "Driver non éligible" : "Échec de création",
          description: isEligibilityError
            ? "Les documents du driver doivent être vérifiés avant de créer un contrat."
            : r.message,
        });
      }
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Nouveau contrat de location-vente"
      description="Le backend calcule le montant total à partir du prix d'acquisition du véhicule et de la marge."
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
              emptyMessage="Aucun driver éligible trouvé."
              options={driverOptions}
              value={form.driverId}
              onChange={onDriverChange}
              allowClear
              required
              hint="Drivers sans véhicule en propre (approuvés ou non) — documents vérifiés requis pour créer le contrat."
            />

            <Combobox
              label="Véhicule *"
              placeholder={
                form.driverId
                  ? "Sélectionner par immatriculation…"
                  : "Sélectionnez d'abord un driver"
              }
              searchPlaceholder="Rechercher par immatriculation…"
              emptyMessage="Aucun véhicule plateforme vérifié disponible."
              options={vehicleOptions}
              value={form.vehicleId}
              onChange={(id) => set("vehicleId", id)}
              allowClear
              disabled={!form.driverId}
              required
            />
          </div>

          {/* Alerte documents non vérifiés */}
          {selectedDriver && !selectedDriver.isDocumentsVerified && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-600/40 dark:bg-amber-500/10">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-400">
                ⚠ Documents non vérifiés
              </p>
              <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-500">
                Le backend refusera la création tant que les documents ne sont pas vérifiés.
              </p>
            </div>
          )}

          {/* Vehicle info card */}
          {selectedVehicle ? (
            <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)]/40 px-4 py-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
                  Informations du véhicule
                </p>
                {loadingDetail && <Spinner size="sm" />}
              </div>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-xs text-[color:var(--muted-foreground)]">Marque</dt>
                  <dd className="font-medium">{selectedVehicle.make}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[color:var(--muted-foreground)]">Modèle</dt>
                  <dd className="font-medium">{selectedVehicle.model}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[color:var(--muted-foreground)]">Année</dt>
                  <dd className="font-medium">{selectedVehicle.year}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[color:var(--muted-foreground)]">Immatriculation</dt>
                  <dd className="font-mono font-medium">{selectedVehicle.licensePlate}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[color:var(--muted-foreground)]">Type</dt>
                  <dd className="font-medium">{VEHICLE_TYPE_LABELS[selectedVehicle.type] ?? selectedVehicle.type}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[color:var(--muted-foreground)]">Catégorie</dt>
                  <dd className="font-medium">
                    {selectedVehicle.category ? VEHICLE_CATEGORY_LABELS[selectedVehicle.category] : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[color:var(--muted-foreground)]">Couleur</dt>
                  <dd className="font-medium">{selectedVehicle.color ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[color:var(--muted-foreground)]">Sièges</dt>
                  <dd className="font-medium">{selectedVehicle.seats ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[color:var(--muted-foreground)]">Kilométrage</dt>
                  <dd className="font-medium">
                    {selectedVehicle.mileage != null
                      ? `${selectedVehicle.mileage.toLocaleString("fr-FR")} km`
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[color:var(--muted-foreground)]">Prochaine maint.</dt>
                  <dd className="font-medium">
                    {selectedVehicle.nextMaintenanceDate
                      ? new Date(selectedVehicle.nextMaintenanceDate).toLocaleDateString("fr-FR")
                      : "—"}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs text-[color:var(--muted-foreground)]">Prix d'achat</dt>
                  <dd className="text-base font-bold text-[color:var(--foreground)]">
                    {loadingDetail
                      ? "…"
                      : vehicleDetail?.purchasePrice != null
                        ? formatXof(vehicleDetail.purchasePrice)
                        : "—"}
                  </dd>
                </div>
                {vehicleDetail?.currentValue != null && (
                  <div className="col-span-2">
                    <dt className="text-xs text-[color:var(--muted-foreground)]">Valeur actuelle</dt>
                    <dd className="font-medium text-[color:var(--foreground)]">
                      {formatXof(vehicleDetail.currentValue)}
                    </dd>
                  </div>
                )}
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
              hint={dateFin ? `Fin estimée : ${dateFin}` : undefined}
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
            <Input
              label="Caution de garantie (FCFA) *"
              type="number"
              min={1}
              value={form.montantCaution}
              onChange={(e) => set("montantCaution", Math.floor(Number(e.target.value)) || 0)}
              hint="Montant de la caution séparé du prix de vente."
              required
            />
            <Input
              label="Marge (%)"
              type="number"
              min={0}
              max={200}
              step={0.01}
              value={form.marginPct ?? 20}
              onChange={(e) => { const v = parseFloat(e.target.value); set("marginPct", isNaN(v) ? 0 : v); }}
              hint="Ex : 12.5 pour 12,5%. montantTotal = prix_achat × (1 + marge/100)."
            />
            <Select
              label="Fréquence des échéances"
              id="contract-freq"
              options={PAYMENT_FREQUENCY_OPTIONS}
              value={form.frequenceEcheances ?? "MENSUEL"}
              onChange={(e) =>
                set("frequenceEcheances", e.target.value as PaymentFrequency)
              }
            />
          </div>

          {/* ── Simulation montant total ─────────────────────────────── */}
          {simulation ? (
            <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)]/40 px-4 py-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
                Simulation (estimation)
              </p>
              <dl className="grid grid-cols-3 gap-x-4 gap-y-1 text-sm">
                <div>
                  <dt className="text-xs text-[color:var(--muted-foreground)]">Montant total</dt>
                  <dd className="text-base font-bold text-[color:var(--foreground)]">
                    {formatXof(simulation.montantTotal)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[color:var(--muted-foreground)]">Par échéance</dt>
                  <dd className="text-base font-bold text-[color:var(--foreground)]">
                    {formatXof(simulation.montantEcheance)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[color:var(--muted-foreground)]">Nb. échéances</dt>
                  <dd className="text-base font-bold text-[color:var(--foreground)]">
                    {simulation.nbEcheances}
                  </dd>
                </div>
              </dl>
            </div>
          ) : vehicleDetail && !vehicleDetail.purchasePrice ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-600/40 dark:bg-amber-500/10">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-400">
                ⚠ Prix d'achat manquant
              </p>
              <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-500">
                Ce véhicule n'a pas de prix d'achat défini. La création du contrat échouera.
              </p>
            </div>
          ) : null}
        </div>


        {/* ── Notes ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
            Notes (optionnel)
          </p>
          <Textarea
            label=""
            value={form.notes ?? ""}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Remarques internes, conditions particulières, accord verbal…"
            rows={3}
          />
        </div>
      </div>
    </Modal>
  );
}
