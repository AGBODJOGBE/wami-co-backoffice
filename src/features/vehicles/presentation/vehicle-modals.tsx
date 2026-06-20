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
import {
  assignVehicleAction,
  completeMaintenanceAction,
  createVehicleAction,
  deleteVehicleAction,
  rejectVehicleAction,
  retireVehicleAction,
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
  VEHICLE_TYPE_LABELS,
  type CreatePlatformVehicleInput,
  type UpdateVehicleInput,
  type VehicleCategory,
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
  { value: "VOITURE", label: "Voiture", icon: Car },
];

const CATEGORY_CHIPS: VehicleCategory[] = ["ECO", "STANDARD", "PREMIUM", "VIP"];

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
    type: "VOITURE",
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

  useEffect(() => {
    if (open) setForm(makeEmptyCreate());
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
    if (!form.registration?.url || !form.insurance?.url) {
      toast({
        kind: "error",
        title: "Documents manquants",
        description: "Carte grise + assurance sont obligatoires.",
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
      registrationCardUrl: form.registration.url,
      insuranceUrl: form.insurance.url,
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
              value={form.registration}
              onChange={(v) => set("registration", v)}
            />
            <FileUpload
              label="Attestation d'assurance"
              required
              documentType="INSURANCE"
              ownerType="VEHICLE"
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
  make: string;
  model: string;
  year: number | "";
  color: string;
  seats: number | "";
  insuranceExpiryDate: string;
  registration: FileUploadValue | null;
  insurance: FileUploadValue | null;
}

export function VehicleEditModal({ open, vehicle, onClose }: EditModalProps) {
  const [form, setForm] = useState<EditFormState>({
    make: "",
    model: "",
    year: "",
    color: "",
    seats: "",
    insuranceExpiryDate: "",
    registration: null,
    insurance: null,
  });
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open || !vehicle) return;
    setForm({
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      color: vehicle.color,
      seats: vehicle.seats,
      insuranceExpiryDate: vehicle.insuranceExpiryDate
        ? vehicle.insuranceExpiryDate.slice(0, 10)
        : "",
      registration: null,
      insurance: null,
    });
  }, [open, vehicle]);

  if (!vehicle) return null;

  function set<K extends keyof EditFormState>(
    key: K,
    value: EditFormState[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
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
    const [min, max] = SEAT_RANGE[vehicle.type] ?? [1, 10];
    if (form.seats < min || form.seats > max) {
      toast({
        kind: "error",
        title: "Sièges invalides",
        description: `Pour un ${VEHICLE_TYPE_LABELS[vehicle.type]}, entre ${min} et ${max}.`,
      });
      return;
    }
    const payload: UpdateVehicleInput = {
      make: form.make,
      model: form.model,
      year: form.year as number,
      color: form.color,
      seats: form.seats as number,
      insuranceExpiryDate: form.insuranceExpiryDate || undefined,
      // Only send a new URL when the admin actually uploaded a replacement —
      // otherwise leave the field undefined so the backend keeps the
      // existing document untouched.
      registrationCardUrl: form.registration?.url,
      insuranceUrl: form.insurance?.url,
    };
    start(async () => {
      const r = await updateVehicleAction(vehicle.id, payload);
      notify(r, "Véhicule mis à jour");
      if (r.ok) onClose();
    });
  }

  const [seatMin, seatMax] = SEAT_RANGE[vehicle.type] ?? [1, 10];

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
                set(
                  "year",
                  e.target.value === "" ? "" : Number(e.target.value),
                )
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
                set(
                  "seats",
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
              hint={`Entre ${seatMin} et ${seatMax} pour un ${VEHICLE_TYPE_LABELS[vehicle.type]}`}
            />
            <Input
              label="Expiration assurance"
              type="date"
              value={form.insuranceExpiryDate}
              onChange={(e) => set("insuranceExpiryDate", e.target.value)}
            />
          </div>
        </Section>

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
  onClose: () => void;
}

export function VehicleAssignModal({
  open,
  vehicle,
  onClose,
}: AssignModalProps) {
  const [driverId, setDriverId] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    if (open) setDriverId("");
  }, [open]);

  if (!vehicle) return null;

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
      title="Assigner à un driver"
      description="Renseigne l'UUID du driver."
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
      <div className="flex flex-col gap-3">
        <Input
          label="Driver ID"
          value={driverId}
          onChange={(e) => setDriverId(e.target.value)}
          placeholder="bed23218-a8f9-41da-b325-920e6cee0a9e"
          autoFocus
        />
        <DevNote>
          Remplacer l&apos;input UUID par un combobox driver dès que{" "}
          <code>GET /api/admin/drivers</code> renverra une liste filtrable.
        </DevNote>
      </div>
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
      description="L'admin peut dépasser le verifiedCategory du driver."
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
  const [pending, start] = useTransition();

  useEffect(() => {
    if (open && vehicle) setMileage(vehicle.mileage ?? 0);
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
      const r = await completeMaintenanceAction(vehicle.id, mileage);
      notify(r, "Maintenance terminée");
      if (r.ok) onClose();
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
      <Input
        label="Kilométrage (km)"
        type="number"
        min={0}
        value={mileage}
        onChange={(e) => setMileage(Number(e.target.value))}
        required
      />
    </Modal>
  );
}

export type SimpleConfirmKind =
  | "unassign"
  | "startMaintenance"
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
  startMaintenance: {
    title: "Mettre en maintenance ?",
    confirmLabel: "Mettre en maintenance",
    tone: "primary",
    successTitle: "Maintenance démarrée",
    description: (v) => `${v.make} ${v.model} · ${v.licensePlate}`,
    run: startMaintenanceAction,
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
