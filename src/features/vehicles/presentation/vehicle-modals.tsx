"use client";

import { useEffect, useState, useTransition } from "react";
import { Bike, Car, Truck } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Combobox } from "@/shared/ui/combobox";
import { ConfirmModal } from "@/shared/ui/confirm-modal";
import { DevNote } from "@/shared/ui/dev-note";
import { FileUpload, type FileUploadValue } from "@/shared/ui/file-upload";
import { Input } from "@/shared/ui/input";
import { Modal } from "@/shared/ui/modal";
import { Textarea } from "@/shared/ui/textarea";
import { toast } from "@/shared/ui/toast";
import { cn } from "@/shared/lib/cn";
import type { AdminDriver } from "@/features/drivers/domain/admin-driver";
import {
  assignVehicleAction,
  completeMaintenanceAction,
  createVehicleAction,
  deleteVehicleAction,
  rejectVehicleAction,
  retireVehicleAction,
  setVehicleActiveCategoriesAction,
  setVehicleCategoryAction,
  startMaintenanceAction,
  unassignVehicleAction,
  updateVehicleAction,
  verifyVehicleAction,
  type ActionResult,
} from "../application/actions";
import {
  SEAT_RANGE,
  VEHICLE_CATEGORY_LABELS,
  VEHICLE_CATEGORY_ORDER,
  VEHICLE_OWNERSHIP_LABELS,
  VEHICLE_STATUS_META,
  VEHICLE_TYPE_LABELS,
  type CreatePlatformVehicleInput,
  type UpdateVehicleInput,
  type VehicleCategory,
  type VehicleOwnership,
  type VehicleStatus,
  type VehicleSummary,
  type VehicleType,
} from "../domain/vehicle";

const CATEGORY_OPTIONS = (
  Object.keys(VEHICLE_CATEGORY_LABELS) as VehicleCategory[]
).map((c) => ({ value: c, label: VEHICLE_CATEGORY_LABELS[c] }));

const TYPE_CHIPS: Array<{
  value: VehicleType;
  label: string;
  icon: typeof Car;
}> = [
  { value: "MOTO", label: "Moto", icon: Bike },
  { value: "TRICYCLE", label: "Tricycle", icon: Truck },
  { value: "CAR", label: "Voiture", icon: Car },
];

const CATEGORY_CHIPS: VehicleCategory[] = ["ECO", "STANDARD", "PREMIUM", "VIP"];

const EDITABLE_STATUSES = [
  "AVAILABLE",
  "PENDING",
  "REJECTED",
  "MAINTENANCE",
  "ASSIGNED",
  "RETIRED",
] as const;
type EditableVehicleStatus = (typeof EDITABLE_STATUSES)[number];

const EDIT_STATUS_OPTIONS = EDITABLE_STATUSES.map((s) => ({
  value: s as string,
  label: VEHICLE_STATUS_META[s as VehicleStatus].label,
}));

const OWNERSHIP_CHIPS: Array<{ value: VehicleOwnership; label: string }> = [
  { value: "PLATFORM", label: VEHICLE_OWNERSHIP_LABELS["PLATFORM"] },
  { value: "DRIVER", label: VEHICLE_OWNERSHIP_LABELS["DRIVER"] },
];

/** Returns a seat value guaranteed to be within `SEAT_RANGE[type]`. Used
 *  whenever the type changes so a Moto (max 2) doesn't keep showing the
 *  Voiture-default of 5. */
function clampSeats(seats: number, type: VehicleType): number {
  const [min, max] = SEAT_RANGE[type];
  if (seats < min) return min;
  if (seats > max) return max;
  return seats;
}

/** Lightweight section wrapper — reused inside the modals to break the
 *  form into scannable groups (Type · Identité · Documents · Achat). */
function Section({
  title,
  helper,
  children,
}: {
  title: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between border-b border-[color:var(--border)] pb-1.5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[color:var(--foreground)]">
          {title}
        </h3>
        {helper ? (
          <span className="text-[11px] text-[color:var(--muted-foreground)]">
            {helper}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function notify(result: ActionResult<unknown>, successTitle?: string) {
  if (result.ok) {
    toast({
      kind: "success",
      title: successTitle ?? "Opération réussie",
      description: result.message,
    });
  } else {
    toast({ kind: "error", title: "Échec", description: result.message });
  }
}

const todayIso = () => new Date().toISOString().slice(0, 10);

interface CreateModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Internal create-form state. Numeric fields use `string | number` to let
 * the user delete the last digit while typing (the previous `Number(...)`
 * cast turned an empty string into 0 — unrecoverable for the user).
 * Validation runs on submit, not on every keystroke.
 */
interface CreateFormState {
  type: VehicleType;
  category: VehicleCategory;
  make: string;
  model: string;
  year: number | "";
  color: string;
  licensePlate: string;
  seats: number | "";
  insuranceExpiryDate: string;
  purchaseDate: string;
  purchasePrice: number | "";
  registration: FileUploadValue | null;
  insurance: FileUploadValue | null;
}

function makeEmptyCreate(): CreateFormState {
  return {
    type: "CAR",
    category: "STANDARD",
    make: "",
    model: "",
    year: new Date().getFullYear(),
    color: "",
    licensePlate: "",
    seats: 5,
    insuranceExpiryDate: "",
    purchaseDate: "",
    purchasePrice: "",
    registration: null,
    insurance: null,
  };
}

export function VehicleCreateModal({ open, onClose }: CreateModalProps) {
  const [form, setForm] = useState<CreateFormState>(makeEmptyCreate);
  const [pending, start] = useTransition();
  // Generate a vehicleId UUID once per modal session — passed to FileUpload
  // so documents are associated to the vehicle BEFORE it is created.
  const [vehicleId, setVehicleId] = useState<string>(() => crypto.randomUUID());

  useEffect(() => {
    if (open) {
      setForm(makeEmptyCreate());
      setVehicleId(crypto.randomUUID());
    }
  }, [open]);

  function set<K extends keyof CreateFormState>(
    key: K,
    value: CreateFormState[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  /** When the vehicle type changes, the legal seat range changes too —
   *  clamp the current value so a Moto never shows 5 seats on screen. */
  function selectType(t: VehicleType) {
    setForm((f) => {
      const current =
        typeof f.seats === "number" ? f.seats : SEAT_RANGE[t][0];
      return { ...f, type: t, seats: clampSeats(current, t) };
    });
  }

  function handleSubmit() {
    const required: Array<[keyof CreateFormState, string]> = [
      ["make", "Marque"],
      ["model", "Modèle"],
      ["color", "Couleur"],
      ["licensePlate", "Plaque"],
      ["insuranceExpiryDate", "Expiration assurance"],
      ["purchaseDate", "Date d'achat"],
    ];
    for (const [key, label] of required) {
      if (!String(form[key] ?? "").trim()) {
        toast({
          kind: "error",
          title: `${label} requis`,
          description: "Renseigne ce champ pour continuer.",
        });
        return;
      }
    }
    if (form.year === "" || form.seats === "" || form.purchasePrice === "") {
      toast({
        kind: "error",
        title: "Champs numériques requis",
        description: "Année, sièges et prix d'achat doivent être renseignés.",
      });
      return;
    }
    const [min, max] = SEAT_RANGE[form.type];
    if (form.seats < min || form.seats > max) {
      toast({
        kind: "error",
        title: "Sièges invalides",
        description: `Pour un ${VEHICLE_TYPE_LABELS[form.type]}, entre ${min} et ${max} sièges.`,
      });
      return;
    }
    if (!form.registration || !form.insurance) {
      toast({
        kind: "error",
        title: "Documents manquants",
        description: "Carte grise + assurance sont obligatoires.",
      });
      return;
    }

    // For private R2 documents the backend returns a fileKey (not a direct URL).
    // The vehicle-creation endpoint stores the fileKey — fall back to url for
    // public documents that don't have a fileKey.
    const registrationCardUrl =
      form.registration.fileKey ?? form.registration.url;
    const insuranceUrl = form.insurance.fileKey ?? form.insurance.url;

    if (!registrationCardUrl || !insuranceUrl) {
      toast({
        kind: "error",
        title: "Documents manquants",
        description: "Upload de la carte grise et de l'assurance requis.",
      });
      return;
    }

    const payload: CreatePlatformVehicleInput = {
      type: form.type,
      category: form.category,
      make: form.make.trim(),
      model: form.model.trim(),
      year: form.year as number,
      color: form.color.trim(),
      licensePlate: form.licensePlate.trim().toUpperCase(),
      seats: form.seats as number,
      registrationCardUrl,
      insuranceUrl,
      insuranceExpiryDate: form.insuranceExpiryDate,
      purchaseDate: form.purchaseDate,
      purchasePrice: form.purchasePrice as number,
    };

    start(async () => {
      const r = await createVehicleAction(payload);
      notify(r, "Véhicule créé");
      if (r.ok) onClose();
    });
  }

  const [seatMin, seatMax] = SEAT_RANGE[form.type];

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Nouveau véhicule plateforme"
      description="Identité, documents légaux et achat — tout est requis."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} isLoading={pending}>
            Créer le véhicule
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <Section title="Type & catégorie">
          <div className="grid gap-2 sm:grid-cols-3">
            {TYPE_CHIPS.map((t) => {
              const Icon = t.icon;
              const selected = form.type === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => selectType(t.value)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-lg border p-3 transition cursor-pointer",
                    selected
                      ? "border-[color:var(--primary)] bg-[color:var(--primary-soft)] text-[color:var(--primary)] ring-2 ring-[color:var(--primary)]/30"
                      : "border-[color:var(--border)] bg-[color:var(--background)] text-[color:var(--foreground)] hover:border-[color:var(--primary)]/50",
                  )}
                >
                  <Icon className="size-6" />
                  <span className="text-sm font-medium">{t.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_CHIPS.map((c) => {
              const selected = form.category === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => set("category", c)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition cursor-pointer",
                    selected
                      ? "border-[color:var(--primary)] bg-[color:var(--primary)] text-[color:var(--primary-foreground)]"
                      : "border-[color:var(--border)] bg-[color:var(--background)] text-[color:var(--foreground)] hover:border-[color:var(--primary)]/50",
                  )}
                >
                  {VEHICLE_CATEGORY_LABELS[c]}
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="Identité">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Marque"
              required
              value={form.make}
              onChange={(e) => set("make", e.target.value)}
              placeholder="Toyota"
            />
            <Input
              label="Modèle"
              required
              value={form.model}
              onChange={(e) => set("model", e.target.value)}
              placeholder="Corolla"
            />
            <Input
              label="Plaque"
              required
              value={form.licensePlate}
              onChange={(e) =>
                set("licensePlate", e.target.value.toUpperCase())
              }
              placeholder="PL-0001-BJ"
            />
            <Input
              label="Couleur"
              required
              value={form.color}
              onChange={(e) => set("color", e.target.value)}
              placeholder="Blanc"
            />
            <Input
              label="Année"
              type="number"
              inputMode="numeric"
              value={form.year === "" ? "" : form.year}
              onChange={(e) =>
                set(
                  "year",
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
              placeholder={String(new Date().getFullYear())}
            />
            <Input
              label="Sièges"
              type="number"
              inputMode="numeric"
              min={seatMin}
              max={seatMax}
              value={form.seats === "" ? "" : form.seats}
              onChange={(e) =>
                set(
                  "seats",
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
              hint={`Entre ${seatMin} et ${seatMax} pour un ${VEHICLE_TYPE_LABELS[form.type]}`}
            />
          </div>
        </Section>

        <Section title="Documents légaux" helper="JPG · PNG · PDF · max 10 Mo">
          <div className="grid gap-3 sm:grid-cols-2">
            <FileUpload
              label="Carte grise"
              required
              documentType="REGISTRATION_CARD"
              ownerType="VEHICLE"
              vehicleId={vehicleId}
              value={form.registration}
              onChange={(v) => set("registration", v)}
            />
            <FileUpload
              label="Attestation d'assurance"
              required
              documentType="INSURANCE"
              ownerType="VEHICLE"
              vehicleId={vehicleId}
              expiresAt={form.insuranceExpiryDate || undefined}
              value={form.insurance}
              onChange={(v) => set("insurance", v)}
            />
          </div>
          <Input
            label="Expiration de l'assurance"
            required
            type="date"
            value={form.insuranceExpiryDate}
            onChange={(e) => set("insuranceExpiryDate", e.target.value)}
            className="sm:col-span-2"
          />
        </Section>

        <Section title="Achat (interne)">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Date d'achat"
              required
              type="date"
              value={form.purchaseDate}
              max={todayIso()}
              onChange={(e) => set("purchaseDate", e.target.value)}
            />
            <Input
              label="Prix d'achat (FCFA)"
              required
              type="number"
              inputMode="numeric"
              min={0}
              value={form.purchasePrice === "" ? "" : form.purchasePrice}
              onChange={(e) =>
                set(
                  "purchasePrice",
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
              placeholder="1 500 000"
            />
          </div>
        </Section>
      </div>
    </Modal>
  );
}

interface EditModalProps {
  open: boolean;
  vehicle: VehicleSummary | null;
  onClose: () => void;
}

interface EditFormState {
  type: VehicleType;
  category: VehicleCategory;
  make: string;
  model: string;
  licensePlate: string;
  year: number | "";
  color: string;
  seats: number | "";
  status: EditableVehicleStatus;
  ownership: VehicleOwnership;
  insuranceExpiryDate: string;
  registration: FileUploadValue | null;
  insurance: FileUploadValue | null;
  mileage: number | "";
  lastMaintenanceDate: string;
  nextMaintenanceDate: string;
  purchasePrice: number | "";
  currentValue: number | "";
  thirdPartyOwnerName: string;
  thirdPartyOwnerPhone: string;
  thirdPartyNote: string;
}

export function VehicleEditModal({ open, vehicle, onClose }: EditModalProps) {
  const [form, setForm] = useState<EditFormState>({
    type: "CAR",
    category: "STANDARD",
    make: "",
    model: "",
    licensePlate: "",
    year: "",
    color: "",
    seats: "",
    status: "AVAILABLE",
    ownership: "PLATFORM",
    insuranceExpiryDate: "",
    registration: null,
    insurance: null,
    mileage: "",
    lastMaintenanceDate: "",
    nextMaintenanceDate: "",
    purchasePrice: "",
    currentValue: "",
    thirdPartyOwnerName: "",
    thirdPartyOwnerPhone: "",
    thirdPartyNote: "",
  });
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open || !vehicle) return;
    const statusIsEditable = (EDITABLE_STATUSES as readonly string[]).includes(vehicle.status);
    setForm({
      type: vehicle.type,
      category: vehicle.category ?? "STANDARD",
      make: vehicle.make,
      model: vehicle.model,
      licensePlate: vehicle.licensePlate,
      year: vehicle.year,
      color: vehicle.color,
      seats: vehicle.seats,
      status: statusIsEditable ? (vehicle.status as EditableVehicleStatus) : "AVAILABLE",
      ownership: vehicle.ownership,
      insuranceExpiryDate: vehicle.insuranceExpiryDate
        ? vehicle.insuranceExpiryDate.slice(0, 10)
        : "",
      registration: null,
      insurance: null,
      mileage: vehicle.mileage ?? "",
      lastMaintenanceDate: "",
      nextMaintenanceDate: vehicle.nextMaintenanceDate
        ? vehicle.nextMaintenanceDate.slice(0, 10)
        : "",
      purchasePrice: vehicle.purchasePrice ?? "",
      currentValue: vehicle.currentValue ?? "",
      thirdPartyOwnerName: vehicle.thirdPartyOwnerName ?? "",
      thirdPartyOwnerPhone: vehicle.thirdPartyOwnerPhone ?? "",
      thirdPartyNote: vehicle.thirdPartyNote ?? "",
    });
  }, [open, vehicle]);

  if (!vehicle) return null;

  function set<K extends keyof EditFormState>(key: K, value: EditFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function selectType(t: VehicleType) {
    setForm((f) => {
      const current = typeof f.seats === "number" ? f.seats : SEAT_RANGE[t][0];
      return { ...f, type: t, seats: clampSeats(current, t) };
    });
  }

  function handleSubmit() {
    if (!vehicle) return;
    if (form.year === "" || form.seats === "") {
      toast({
        kind: "error",
        title: "Année et sièges requis",
        description: "Renseigne au moins un nombre.",
      });
      return;
    }
    const [min, max] = SEAT_RANGE[form.type] ?? [1, 10];
    if ((form.seats as number) < min || (form.seats as number) > max) {
      toast({
        kind: "error",
        title: "Sièges invalides",
        description: `Pour un ${VEHICLE_TYPE_LABELS[form.type]}, entre ${min} et ${max}.`,
      });
      return;
    }
    const payload: UpdateVehicleInput = {
      type: form.type,
      category: form.category,
      make: form.make,
      model: form.model,
      licensePlate: form.licensePlate.trim().toUpperCase() || undefined,
      year: form.year as number,
      color: form.color,
      seats: form.seats as number,
      status: form.status,
      ownership: form.ownership,
      insuranceExpiryDate: form.insuranceExpiryDate || undefined,
      registrationCardUrl: form.registration
        ? (form.registration.fileKey ?? form.registration.url)
        : undefined,
      insuranceUrl: form.insurance
        ? (form.insurance.fileKey ?? form.insurance.url)
        : undefined,
      mileage: form.mileage !== "" ? (form.mileage as number) : undefined,
      lastMaintenanceDate: form.lastMaintenanceDate || undefined,
      nextMaintenanceDate: form.nextMaintenanceDate || undefined,
      purchasePrice: form.purchasePrice !== "" ? (form.purchasePrice as number) : undefined,
      currentValue: form.currentValue !== "" ? (form.currentValue as number) : undefined,
      // Le backend rejette ces 3 champs (422) pour un véhicule qui n'est pas
      // THIRD_PARTY — ne les envoyer que dans ce cas. Chaîne vide → null
      // (efface explicitement), jamais omis (undefined = inchangé serait
      // trompeur alors que l'admin vient de vider le champ à l'écran).
      ...(vehicle.ownership === "THIRD_PARTY"
        ? {
            thirdPartyOwnerName: form.thirdPartyOwnerName.trim() || null,
            thirdPartyOwnerPhone: form.thirdPartyOwnerPhone.trim() || null,
            thirdPartyNote: form.thirdPartyNote.trim() || null,
          }
        : {}),
    };
    start(async () => {
      const r = await updateVehicleAction(vehicle.id, payload);
      notify(r, "Véhicule mis à jour");
      if (r.ok) onClose();
    });
  }

  const [seatMin, seatMax] = SEAT_RANGE[form.type] ?? [1, 10];

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Modifier le véhicule"
      description={`${vehicle.make} ${vehicle.model} · ${vehicle.licensePlate}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} isLoading={pending}>
            Enregistrer
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <Section title="Type & catégorie">
          <div className="grid gap-2 sm:grid-cols-3">
            {TYPE_CHIPS.map((t) => {
              const Icon = t.icon;
              const selected = form.type === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => selectType(t.value)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-lg border p-3 transition cursor-pointer",
                    selected
                      ? "border-[color:var(--primary)] bg-[color:var(--primary-soft)] text-[color:var(--primary)] ring-2 ring-[color:var(--primary)]/30"
                      : "border-[color:var(--border)] bg-[color:var(--background)] text-[color:var(--foreground)] hover:border-[color:var(--primary)]/50",
                  )}
                >
                  <Icon className="size-6" />
                  <span className="text-sm font-medium">{t.label}</span>
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_CHIPS.map((c) => {
              const selected = form.category === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => set("category", c)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition cursor-pointer",
                    selected
                      ? "border-[color:var(--primary)] bg-[color:var(--primary)] text-[color:var(--primary-foreground)]"
                      : "border-[color:var(--border)] bg-[color:var(--background)] text-[color:var(--foreground)] hover:border-[color:var(--primary)]/50",
                  )}
                >
                  {VEHICLE_CATEGORY_LABELS[c]}
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="Identité">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Marque"
              value={form.make}
              onChange={(e) => set("make", e.target.value)}
            />
            <Input
              label="Modèle"
              value={form.model}
              onChange={(e) => set("model", e.target.value)}
            />
            <Input
              label="Plaque"
              value={form.licensePlate}
              onChange={(e) => set("licensePlate", e.target.value.toUpperCase())}
              placeholder="PL-0001-BJ"
            />
            <Input
              label="Couleur"
              value={form.color}
              onChange={(e) => set("color", e.target.value)}
            />
            <Input
              label="Année"
              type="number"
              inputMode="numeric"
              value={form.year === "" ? "" : form.year}
              onChange={(e) =>
                set("year", e.target.value === "" ? "" : Number(e.target.value))
              }
            />
            <Input
              label="Sièges"
              type="number"
              inputMode="numeric"
              min={seatMin}
              max={seatMax}
              value={form.seats === "" ? "" : form.seats}
              onChange={(e) =>
                set("seats", e.target.value === "" ? "" : Number(e.target.value))
              }
              hint={`Entre ${seatMin} et ${seatMax} pour un ${VEHICLE_TYPE_LABELS[form.type]}`}
            />
          </div>
        </Section>

        <Section title="Statut & propriété">
          <div className="grid gap-3 sm:grid-cols-2">
            <Combobox
              label="Statut"
              options={EDIT_STATUS_OPTIONS}
              value={form.status}
              onChange={(v) => set("status", v as EditableVehicleStatus)}
            />
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-[color:var(--foreground)]">
                Propriété
              </span>
              {vehicle.ownership === "THIRD_PARTY" ? (
                <div className="flex items-center gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)]/30 px-3 py-2 text-sm text-[color:var(--muted-foreground)]">
                  Tiers — non modifiable depuis cet écran
                </div>
              ) : (
                <div className="flex gap-2">
                  {OWNERSHIP_CHIPS.map((o) => {
                    const selected = form.ownership === o.value;
                    return (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => set("ownership", o.value)}
                        className={cn(
                          "flex-1 rounded-lg border py-2 text-sm font-medium transition cursor-pointer",
                          selected
                            ? "border-[color:var(--primary)] bg-[color:var(--primary-soft)] text-[color:var(--primary)] ring-2 ring-[color:var(--primary)]/30"
                            : "border-[color:var(--border)] bg-[color:var(--background)] text-[color:var(--foreground)] hover:border-[color:var(--primary)]/50",
                        )}
                      >
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </Section>

        {vehicle.ownership === "THIRD_PARTY" && (
          <Section title="Propriétaire (tiers)" helper="Jamais visible du chauffeur">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Nom"
                value={form.thirdPartyOwnerName}
                onChange={(e) => set("thirdPartyOwnerName", e.target.value)}
                maxLength={100}
              />
              <Input
                label="Téléphone"
                value={form.thirdPartyOwnerPhone}
                onChange={(e) => set("thirdPartyOwnerPhone", e.target.value)}
              />
            </div>
            <Textarea
              label="Note"
              value={form.thirdPartyNote}
              onChange={(e) => set("thirdPartyNote", e.target.value)}
              rows={2}
              maxLength={500}
            />
          </Section>
        )}

        <Section
          title="Documents légaux"
          helper="Laisse vide pour conserver les documents existants"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <FileUpload
              label="Remplacer la carte grise"
              documentType="REGISTRATION_CARD"
              ownerType="VEHICLE"
              vehicleId={vehicle.id}
              value={form.registration}
              onChange={(v) => set("registration", v)}
              hint={
                vehicle.registrationCardUrl
                  ? "Carte grise existante conservée si laissée vide"
                  : undefined
              }
            />
            <FileUpload
              label="Remplacer l'assurance"
              documentType="INSURANCE"
              ownerType="VEHICLE"
              vehicleId={vehicle.id}
              expiresAt={form.insuranceExpiryDate || undefined}
              value={form.insurance}
              onChange={(v) => set("insurance", v)}
              hint={
                vehicle.insuranceUrl
                  ? "Assurance existante conservée si laissée vide"
                  : undefined
              }
            />
          </div>
          <Input
            label="Expiration assurance"
            type="date"
            value={form.insuranceExpiryDate}
            onChange={(e) => set("insuranceExpiryDate", e.target.value)}
          />
        </Section>

        <Section title="Maintenance">
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              label="Kilométrage (km)"
              type="number"
              inputMode="numeric"
              min={0}
              value={form.mileage === "" ? "" : form.mileage}
              onChange={(e) =>
                set("mileage", e.target.value === "" ? "" : Number(e.target.value))
              }
              placeholder="Ex : 45 000"
            />
            <Input
              label="Dernière maintenance"
              type="date"
              value={form.lastMaintenanceDate}
              max={todayIso()}
              onChange={(e) => set("lastMaintenanceDate", e.target.value)}
            />
            <Input
              label="Prochaine maintenance"
              type="date"
              value={form.nextMaintenanceDate}
              onChange={(e) => set("nextMaintenanceDate", e.target.value)}
            />
          </div>
        </Section>

        <Section title="Valorisation (interne)">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Prix d'achat (FCFA)"
              type="number"
              inputMode="numeric"
              min={0}
              value={form.purchasePrice === "" ? "" : form.purchasePrice}
              onChange={(e) =>
                set("purchasePrice", e.target.value === "" ? "" : Number(e.target.value))
              }
              placeholder="Ex : 1 500 000"
            />
            <Input
              label="Valeur actuelle (FCFA)"
              type="number"
              inputMode="numeric"
              min={0}
              value={form.currentValue === "" ? "" : form.currentValue}
              onChange={(e) =>
                set("currentValue", e.target.value === "" ? "" : Number(e.target.value))
              }
              placeholder="Ex : 1 200 000"
            />
          </div>
        </Section>
      </div>
    </Modal>
  );
}

interface VerifyModalProps {
  open: boolean;
  vehicle: VehicleSummary | null;
  onClose: () => void;
}

export function VehicleVerifyModal({
  open,
  vehicle,
  onClose,
}: VerifyModalProps) {
  const [category, setCategory] = useState<VehicleCategory>("STANDARD");
  const [pending, start] = useTransition();

  useEffect(() => {
    if (open && vehicle) setCategory(vehicle.category ?? "STANDARD");
  }, [open, vehicle]);

  if (!vehicle) return null;

  function submit() {
    if (!vehicle) return;
    start(async () => {
      const r = await verifyVehicleAction(vehicle.id, category);
      notify(r, "Véhicule vérifié");
      if (r.ok) onClose();
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Vérifier le véhicule"
      description="La catégorie attribuée devient aussi le plafond verifiedCategory."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Annuler
          </Button>
          <Button onClick={submit} isLoading={pending}>
            Vérifier
          </Button>
        </>
      }
    >
      <Combobox
        label="Catégorie attribuée"
        options={CATEGORY_OPTIONS}
        value={category}
        onChange={(v) => setCategory(v as VehicleCategory)}
        required
      />
    </Modal>
  );
}

interface RejectModalProps {
  open: boolean;
  vehicle: VehicleSummary | null;
  onClose: () => void;
}

export function VehicleRejectModal({
  open,
  vehicle,
  onClose,
}: RejectModalProps) {
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  if (!vehicle) return null;

  function submit() {
    if (!vehicle) return;
    if (reason.trim().length < 5) {
      toast({
        kind: "error",
        title: "Raison requise",
        description: "Décris le motif (au moins 5 caractères).",
      });
      return;
    }
    start(async () => {
      const r = await rejectVehicleAction(vehicle.id, reason.trim());
      notify(r, "Véhicule rejeté");
      if (r.ok) onClose();
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Rejeter le véhicule"
      description={`${vehicle.make} ${vehicle.model} · ${vehicle.licensePlate}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Annuler
          </Button>
          <Button variant="danger" onClick={submit} isLoading={pending}>
            Rejeter
          </Button>
        </>
      }
    >
      <Textarea
        label="Raison du rejet"
        rows={4}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Documents manquants, plaque illisible…"
        required
      />
    </Modal>
  );
}

interface AssignModalProps {
  open: boolean;
  vehicle: VehicleSummary | null;
  drivers: AdminDriver[];
  onClose: () => void;
}

export function VehicleAssignModal({
  open,
  vehicle,
  drivers,
  onClose,
}: AssignModalProps) {
  const [driverId, setDriverId] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    if (open) setDriverId("");
  }, [open]);

  if (!vehicle) return null;

  const driverOptions = drivers.map((d) => ({
    value: d.driverId,
    label: `${d.firstName ?? ""} ${d.lastName ?? ""}`.trim() || d.driverId,
    description: d.phoneNumber ?? d.driverId,
  }));

  function submit() {
    if (!vehicle) return;
    if (!driverId.trim()) return;
    start(async () => {
      const r = await assignVehicleAction(vehicle.id, driverId.trim());
      notify(r, "Véhicule assigné");
      if (r.ok) onClose();
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Assigner à un pilote"
      description="Sélectionne le pilote auquel assigner ce véhicule."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Annuler
          </Button>
          <Button onClick={submit} isLoading={pending} disabled={!driverId.trim()}>
            Assigner
          </Button>
        </>
      }
    >
      <Combobox
        label="Pilote"
        placeholder="Rechercher par nom ou téléphone…"
        searchPlaceholder="Nom, prénom, téléphone…"
        emptyMessage="Aucun pilote trouvé."
        options={driverOptions}
        value={driverId}
        onChange={setDriverId}
        allowClear
        required
      />
    </Modal>
  );
}

interface CategoryModalProps {
  open: boolean;
  vehicle: VehicleSummary | null;
  onClose: () => void;
}

export function VehicleCategoryModal({
  open,
  vehicle,
  onClose,
}: CategoryModalProps) {
  const [category, setCategory] = useState<VehicleCategory>("STANDARD");
  const [pending, start] = useTransition();

  useEffect(() => {
    if (open && vehicle) setCategory(vehicle.category ?? "STANDARD");
  }, [open, vehicle]);

  if (!vehicle) return null;

  function submit() {
    if (!vehicle) return;
    start(async () => {
      const r = await setVehicleCategoryAction(vehicle.id, category);
      notify(r, "Catégorie mise à jour");
      if (r.ok) onClose();
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Changer la catégorie"
      description="L'admin peut dépasser le verifiedCategory du pilote."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Annuler
          </Button>
          <Button onClick={submit} isLoading={pending}>
            Mettre à jour
          </Button>
        </>
      }
    >
      <Combobox
        label="Nouvelle catégorie"
        options={CATEGORY_OPTIONS}
        value={category}
        onChange={(v) => setCategory(v as VehicleCategory)}
        required
      />
    </Modal>
  );
}

export function VehicleActiveCategoriesModal({
  open,
  vehicle,
  onClose,
}: CategoryModalProps) {
  const [selected, setSelected] = useState<VehicleCategory[]>([]);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (open && vehicle) {
      setSelected(
        vehicle.activeCategories && vehicle.activeCategories.length > 0
          ? vehicle.activeCategories
          : vehicle.category
            ? [vehicle.category]
            : [],
      );
    }
  }, [open, vehicle]);

  if (!vehicle) return null;

  const ceiling = vehicle.verifiedCategory;
  const ceilingIdx = ceiling ? VEHICLE_CATEGORY_ORDER.indexOf(ceiling) : -1;
  const exceeding = selected.filter(
    (c) => ceilingIdx >= 0 && VEHICLE_CATEGORY_ORDER.indexOf(c) > ceilingIdx,
  );

  function toggle(c: VehicleCategory) {
    setSelected((cur) =>
      cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c],
    );
  }

  function submit() {
    if (!vehicle) return;
    if (selected.length === 0) return;
    const ordered = VEHICLE_CATEGORY_ORDER.filter((c) => selected.includes(c));
    start(async () => {
      const r = await setVehicleActiveCategoriesAction(vehicle.id, ordered);
      notify(r, "Catégories actives mises à jour");
      if (r.ok) onClose();
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Catégories actives"
      description="Le véhicule reçoit des courses de toutes les catégories cochées, sans priorité entre elles. Chaque course est payée au tarif de sa propre catégorie."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Annuler
          </Button>
          <Button onClick={submit} isLoading={pending} disabled={selected.length === 0}>
            Enregistrer
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          {VEHICLE_CATEGORY_ORDER.map((c) => {
            const over = ceilingIdx >= 0 && VEHICLE_CATEGORY_ORDER.indexOf(c) > ceilingIdx;
            return (
              <label
                key={c}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-[color:var(--border)] px-3 py-2 hover:bg-[color:var(--muted)]"
              >
                <span className="flex items-center gap-2 text-sm text-[color:var(--foreground)]">
                  <input
                    type="checkbox"
                    checked={selected.includes(c)}
                    onChange={() => toggle(c)}
                    className="size-4 rounded border-[color:var(--border)]"
                  />
                  {VEHICLE_CATEGORY_LABELS[c]}
                </span>
                {over ? (
                  <span className="text-[10px] text-[color:var(--warning)]">
                    au-dessus du plafond
                  </span>
                ) : null}
              </label>
            );
          })}
        </div>
        {selected.length === 0 ? (
          <p className="text-xs text-[color:var(--danger)]">
            Au moins une catégorie doit rester cochée.
          </p>
        ) : null}
        {exceeding.length > 0 ? (
          <p className="rounded-md border border-[color:var(--warning)]/30 bg-[color:var(--warning)]/10 px-3 py-2 text-xs text-[color:var(--warning)]">
            {exceeding.map((c) => VEHICLE_CATEGORY_LABELS[c]).join(", ")} dépasse le
            plafond validé ({ceiling ? VEHICLE_CATEGORY_LABELS[ceiling] : "—"}) : en tant
            qu'admin tu peux le faire, le plafond sera alors relevé.
          </p>
        ) : null}
      </div>
    </Modal>
  );
}

interface MaintenanceStartModalProps {
  open: boolean;
  vehicle: VehicleSummary | null;
  onClose: () => void;
}

export function VehicleMaintenanceStartModal({
  open,
  vehicle,
  onClose,
}: MaintenanceStartModalProps) {
  const [reason, setReason] = useState("");
  const [estimatedCost, setEstimatedCost] = useState<number | "">("");
  const [pending, start] = useTransition();

  useEffect(() => {
    if (open) {
      setReason("");
      setEstimatedCost("");
    }
  }, [open]);

  if (!vehicle) return null;

  function submit() {
    if (!vehicle) return;
    if (!reason.trim()) {
      toast({ kind: "error", title: "Motif requis", description: "Décris la raison de la mise en maintenance." });
      return;
    }
    start(async () => {
      const r = await startMaintenanceAction(
        vehicle.id,
        reason.trim(),
        estimatedCost !== "" ? Number(estimatedCost) : undefined,
      );
      notify(r, "Maintenance démarrée");
      if (r.ok) onClose();
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Mettre en maintenance"
      description={`${vehicle.make} ${vehicle.model} · ${vehicle.licensePlate}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Annuler
          </Button>
          <Button onClick={submit} isLoading={pending}>
            Démarrer
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Textarea
          label="Motif de la maintenance"
          placeholder="Ex : Vidange + freins avant à remplacer"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          required
        />
        <Input
          label="Coût estimé (FCFA, optionnel)"
          type="number"
          min={0}
          value={estimatedCost}
          onChange={(e) => setEstimatedCost(e.target.value === "" ? "" : Number(e.target.value))}
          placeholder="Ex : 25000"
        />
      </div>
    </Modal>
  );
}

interface MaintenanceCompleteModalProps {
  open: boolean;
  vehicle: VehicleSummary | null;
  onClose: () => void;
}

export function VehicleMaintenanceCompleteModal({
  open,
  vehicle,
  onClose,
}: MaintenanceCompleteModalProps) {
  const [mileage, setMileage] = useState<number>(0);
  const [actualCost, setActualCost] = useState<number | "">("");
  const [pending, start] = useTransition();

  useEffect(() => {
    if (open && vehicle) {
      setMileage(vehicle.mileage ?? 0);
      setActualCost(vehicle.currentMaintenance?.estimatedCost ?? "");
    }
  }, [open, vehicle]);

  if (!vehicle) return null;

  function submit() {
    if (!vehicle) return;
    if (mileage <= 0) {
      toast({
        kind: "error",
        title: "Kilométrage requis",
        description: "Renseigne un nombre positif.",
      });
      return;
    }
    start(async () => {
      const r = await completeMaintenanceAction(
        vehicle.id,
        mileage,
        actualCost !== "" ? Number(actualCost) : undefined,
      );
      if (r.ok && r.data) {
        const next = new Date(r.data.nextMaintenanceDate).toLocaleDateString("fr-FR");
        toast({
          kind: "success",
          title: "Maintenance terminée",
          description: `Kilométrage enregistré : ${r.data.mileage.toLocaleString("fr-FR")} km · Prochaine maintenance : ${next}`,
        });
        onClose();
      } else {
        notify(r, "Maintenance terminée");
      }
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Terminer la maintenance"
      description={`${vehicle.make} ${vehicle.model} · ${vehicle.licensePlate}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Annuler
          </Button>
          <Button onClick={submit} isLoading={pending}>
            Clôturer
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input
          label="Kilométrage (km)"
          type="number"
          min={0}
          value={mileage}
          onChange={(e) => setMileage(Number(e.target.value))}
          required
        />
        <Input
          label="Coût réel (FCFA, optionnel)"
          type="number"
          min={0}
          value={actualCost}
          onChange={(e) => setActualCost(e.target.value === "" ? "" : Number(e.target.value))}
          placeholder={vehicle.currentMaintenance?.estimatedCost != null
            ? `Estimé : ${vehicle.currentMaintenance.estimatedCost.toLocaleString("fr-FR")} FCFA`
            : "Ex : 30000"}
        />
      </div>
    </Modal>
  );
}

export type SimpleConfirmKind =
  | "unassign"
  | "retire"
  | "delete";

interface SimpleConfirmProps {
  kind: SimpleConfirmKind | null;
  vehicle: VehicleSummary | null;
  onClose: () => void;
}

const CONFIRM_META: Record<
  SimpleConfirmKind,
  {
    title: string;
    confirmLabel: string;
    tone: "primary" | "danger";
    successTitle: string;
    description: (v: VehicleSummary) => string;
    run: (id: string) => Promise<ActionResult>;
  }
> = {
  unassign: {
    title: "Désassigner ce véhicule ?",
    confirmLabel: "Désassigner",
    tone: "primary",
    successTitle: "Véhicule désassigné",
    description: (v) => `${v.make} ${v.model} · ${v.licensePlate}`,
    run: unassignVehicleAction,
  },
  retire: {
    title: "Retirer définitivement ?",
    confirmLabel: "Retirer définitivement",
    tone: "danger",
    successTitle: "Véhicule retiré",
    description: (v) =>
      `Action irréversible. ${v.make} ${v.model} · ${v.licensePlate}`,
    run: retireVehicleAction,
  },
  delete: {
    title: "Supprimer ce véhicule ?",
    confirmLabel: "Supprimer définitivement",
    tone: "danger",
    successTitle: "Véhicule supprimé",
    description: (v) => `${v.make} ${v.model} · ${v.licensePlate}`,
    run: deleteVehicleAction,
  },
};

export function VehicleSimpleConfirm({
  kind,
  vehicle,
  onClose,
}: SimpleConfirmProps) {
  const [pending, start] = useTransition();
  if (!kind || !vehicle) return null;
  const meta = CONFIRM_META[kind];
  return (
    <ConfirmModal
      open
      onClose={onClose}
      onConfirm={() =>
        start(async () => {
          const r = await meta.run(vehicle.id);
          notify(r, meta.successTitle);
          if (r.ok) onClose();
        })
      }
      title={meta.title}
      description={<p>{meta.description(vehicle)}</p>}
      confirmLabel={meta.confirmLabel}
      tone={meta.tone}
      isLoading={pending}
    />
  );
}
