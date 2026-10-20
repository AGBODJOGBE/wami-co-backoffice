"use client";

import { useEffect, useState, useTransition } from "react";
import { Bike, Car, Truck, Upload, X } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Combobox } from "@/shared/ui/combobox";
import { Input } from "@/shared/ui/input";
import { Modal } from "@/shared/ui/modal";
import { Textarea } from "@/shared/ui/textarea";
import { toast } from "@/shared/ui/toast";
import { cn } from "@/shared/lib/cn";
import type { AdminDriver } from "@/features/drivers/domain/admin-driver";
import { fullName } from "@/features/drivers/domain/admin-driver";
import {
  adminAddDriverVehicleAction,
  addThirdPartyVehicleAction,
  adminUploadVehicleDocumentsAction,
  type ActionResult,
} from "../application/actions";
import {
  SEAT_RANGE,
  VEHICLE_CATEGORY_LABELS,
  VEHICLE_TYPE_LABELS,
  type VehicleCategory,
  type VehicleType,
} from "../domain/vehicle";

function notify(result: ActionResult<unknown>, successTitle: string) {
  if (result.ok) toast({ kind: "success", title: successTitle, description: result.message });
  else toast({ kind: "error", title: "Échec", description: result.message });
}

function Section({ title, helper, children }: { title: string; helper?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between border-b border-[color:var(--border)] pb-1.5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[color:var(--foreground)]">{title}</h3>
        {helper ? <span className="text-[11px] text-[color:var(--muted-foreground)]">{helper}</span> : null}
      </div>
      {children}
    </section>
  );
}

const TYPE_CHIPS: Array<{ value: VehicleType; label: string; icon: typeof Car }> = [
  { value: "MOTO", label: "Moto", icon: Bike },
  { value: "TRICYCLE", label: "Tricycle", icon: Truck },
  { value: "CAR", label: "Voiture", icon: Car },
];

function clampSeats(seats: number, type: VehicleType): number {
  const [min, max] = SEAT_RANGE[type];
  if (seats < min) return min;
  if (seats > max) return max;
  return seats;
}

/** Sélecteur de fichier minimal — pas d'auto-upload (contrairement à
 * `FileUpload`), le fichier brut est envoyé directement dans le multipart
 * de la route d'onboarding au submit du formulaire. */
function SimpleFilePicker({
  label,
  required,
  value,
  onChange,
  hint,
}: {
  label: string;
  required?: boolean;
  value: File | null;
  onChange: (f: File | null) => void;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-[color:var(--foreground)]">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {value ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)]/30 px-3 py-2">
          <span className="truncate text-xs text-[color:var(--foreground)]">{value.name}</span>
          <button type="button" onClick={() => onChange(null)} className="shrink-0 text-[color:var(--muted-foreground)] hover:text-[color:var(--danger)]">
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[color:var(--border)] px-3 py-2.5 text-xs text-[color:var(--muted-foreground)] hover:border-[color:var(--primary)]/50 hover:text-[color:var(--primary)]">
          <Upload className="size-3.5" />
          Choisir un fichier
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            onChange={(e) => onChange(e.target.files?.[0] ?? null)}
          />
        </label>
      )}
      {hint && <span className="text-[11px] text-[color:var(--muted-foreground)]">{hint}</span>}
    </div>
  );
}

// ─── Véhicule pour un chauffeur ────────────────────────────────────────────

interface DriverVehicleFormState {
  driverId: string;
  type: VehicleType;
  make: string;
  model: string;
  year: number | "";
  color: string;
  licensePlate: string;
  seats: number | "";
  insuranceExpiryDate: string;
  insurance: File | null;
  registrationCard: File | null;
}

function emptyDriverForm(): DriverVehicleFormState {
  return {
    driverId: "",
    type: "CAR",
    make: "",
    model: "",
    color: "",
    licensePlate: "",
    year: new Date().getFullYear(),
    seats: 5,
    insuranceExpiryDate: "",
    insurance: null,
    registrationCard: null,
  };
}

export function VehicleAddForDriverModal({
  open,
  drivers,
  onClose,
}: {
  open: boolean;
  drivers: AdminDriver[];
  onClose: () => void;
}) {
  const [form, setForm] = useState<DriverVehicleFormState>(emptyDriverForm);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (open) setForm(emptyDriverForm());
  }, [open]);

  function set<K extends keyof DriverVehicleFormState>(key: K, value: DriverVehicleFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function selectType(t: VehicleType) {
    setForm((f) => {
      const current = typeof f.seats === "number" ? f.seats : SEAT_RANGE[t][0];
      return { ...f, type: t, seats: clampSeats(current, t) };
    });
  }

  const driverOptions = drivers.map((d) => ({
    value: d.driverId,
    label: fullName(d) || d.driverId,
    description: d.phoneNumber ?? d.driverId,
  }));

  function submit() {
    if (!form.driverId) {
      toast({ kind: "error", title: "Chauffeur requis" });
      return;
    }
    const required: Array<[keyof DriverVehicleFormState, string]> = [
      ["make", "Marque"], ["model", "Modèle"], ["color", "Couleur"], ["licensePlate", "Plaque"],
    ];
    for (const [key, label] of required) {
      if (!String(form[key] ?? "").trim()) {
        toast({ kind: "error", title: `${label} requis` });
        return;
      }
    }
    if (form.year === "" || form.seats === "") {
      toast({ kind: "error", title: "Année et sièges requis" });
      return;
    }
    const [min, max] = SEAT_RANGE[form.type];
    if (form.seats < min || form.seats > max) {
      toast({ kind: "error", title: "Sièges invalides", description: `Entre ${min} et ${max} pour un ${VEHICLE_TYPE_LABELS[form.type]}.` });
      return;
    }
    if (!form.insurance) {
      toast({ kind: "error", title: "Assurance requise", description: "Le fichier d'assurance est obligatoire." });
      return;
    }

    start(async () => {
      const r = await adminAddDriverVehicleAction({
        driverId: form.driverId,
        type: form.type,
        make: form.make.trim(),
        model: form.model.trim(),
        year: form.year as number,
        color: form.color.trim(),
        licensePlate: form.licensePlate.trim().toUpperCase(),
        seats: form.seats as number,
        insuranceExpiryDate: form.insuranceExpiryDate || undefined,
        insuranceFile: form.insurance!,
        registrationCardFile: form.registrationCard ?? undefined,
      });
      notify(r, "Véhicule ajouté");
      if (r.ok) onClose();
    });
  }

  const [seatMin, seatMax] = SEAT_RANGE[form.type];

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Véhicule pour un chauffeur"
      description="Le véhicule appartient au chauffeur (comme s'il l'avait ajouté lui-même). Il ne devient pas son véhicule actif automatiquement — le chauffeur l'active une fois vérifié."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>Annuler</Button>
          <Button onClick={submit} isLoading={pending}>Créer le véhicule</Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <Section title="Chauffeur">
          <Combobox
            label="Chauffeur *"
            placeholder="Sélectionner un chauffeur…"
            searchPlaceholder="Rechercher par nom ou téléphone…"
            options={driverOptions}
            value={form.driverId}
            onChange={(v) => set("driverId", v)}
            allowClear
          />
        </Section>

        <Section title="Type">
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
        </Section>

        <Section title="Identité">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Marque *" value={form.make} onChange={(e) => set("make", e.target.value)} placeholder="Toyota" />
            <Input label="Modèle *" value={form.model} onChange={(e) => set("model", e.target.value)} placeholder="Corolla" />
            <Input label="Plaque *" value={form.licensePlate} onChange={(e) => set("licensePlate", e.target.value.toUpperCase())} placeholder="PL-0001-BJ" />
            <Input label="Couleur *" value={form.color} onChange={(e) => set("color", e.target.value)} placeholder="Blanc" />
            <Input
              label="Année *" type="number" inputMode="numeric"
              value={form.year === "" ? "" : form.year}
              onChange={(e) => set("year", e.target.value === "" ? "" : Number(e.target.value))}
              placeholder={String(new Date().getFullYear())}
            />
            <Input
              label="Sièges *" type="number" inputMode="numeric" min={seatMin} max={seatMax}
              value={form.seats === "" ? "" : form.seats}
              onChange={(e) => set("seats", e.target.value === "" ? "" : Number(e.target.value))}
              hint={`Entre ${seatMin} et ${seatMax} pour un ${VEHICLE_TYPE_LABELS[form.type]}`}
            />
          </div>
        </Section>

        <Section title="Documents" helper="JPG · PNG · PDF · max 10 Mo">
          <div className="grid gap-3 sm:grid-cols-2">
            <SimpleFilePicker label="Assurance" required value={form.insurance} onChange={(f) => set("insurance", f)} />
            <SimpleFilePicker label="Carte grise" value={form.registrationCard} onChange={(f) => set("registrationCard", f)} hint="Optionnel — ajoutable plus tard" />
          </div>
          <Input
            label="Expiration de l'assurance"
            type="date"
            value={form.insuranceExpiryDate}
            onChange={(e) => set("insuranceExpiryDate", e.target.value)}
          />
        </Section>
      </div>
    </Modal>
  );
}

// ─── Documents sur un véhicule existant ─────────────────────────────────────

export function VehicleUploadDocumentsModal({
  open,
  vehicleId,
  onClose,
}: {
  open: boolean;
  vehicleId: string;
  onClose: () => void;
}) {
  const [insurance, setInsurance] = useState<File | null>(null);
  const [registrationCard, setRegistrationCard] = useState<File | null>(null);
  const [insuranceExpiryDate, setInsuranceExpiryDate] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    if (open) {
      setInsurance(null);
      setRegistrationCard(null);
      setInsuranceExpiryDate("");
    }
  }, [open]);

  function submit() {
    if (!insurance && !registrationCard) {
      toast({ kind: "error", title: "Au moins un fichier requis" });
      return;
    }
    start(async () => {
      const r = await adminUploadVehicleDocumentsAction({
        vehicleId,
        insuranceFile: insurance ?? undefined,
        registrationCardFile: registrationCard ?? undefined,
        insuranceExpiryDate: insuranceExpiryDate || undefined,
      });
      notify(r, "Documents ajoutés");
      if (r.ok) onClose();
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ajouter des documents"
      description="Si un document de ce type existe déjà pour ce véhicule, utilisez plutôt « Remplacer » sur le document existant."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>Annuler</Button>
          <Button onClick={submit} isLoading={pending}>Envoyer</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <SimpleFilePicker label="Assurance" value={insurance} onChange={setInsurance} />
        <SimpleFilePicker label="Carte grise" value={registrationCard} onChange={setRegistrationCard} />
        <Input
          label="Expiration de l'assurance"
          type="date"
          value={insuranceExpiryDate}
          onChange={(e) => setInsuranceExpiryDate(e.target.value)}
          hint="Uniquement pris en compte si un fichier d'assurance est fourni."
        />
      </div>
    </Modal>
  );
}

// ─── Véhicule tiers ─────────────────────────────────────────────────────────

interface ThirdPartyFormState {
  type: VehicleType;
  category: VehicleCategory | "";
  make: string;
  model: string;
  year: number | "";
  color: string;
  licensePlate: string;
  seats: number | "";
  insuranceExpiryDate: string;
  ownerName: string;
  ownerPhone: string;
  ownerNote: string;
  insurance: File | null;
  registrationCard: File | null;
}

function emptyThirdPartyForm(): ThirdPartyFormState {
  return {
    type: "CAR",
    category: "",
    make: "",
    model: "",
    color: "",
    licensePlate: "",
    year: new Date().getFullYear(),
    seats: 5,
    insuranceExpiryDate: "",
    ownerName: "",
    ownerPhone: "",
    ownerNote: "",
    insurance: null,
    registrationCard: null,
  };
}

const CATEGORY_OPTIONS = (Object.keys(VEHICLE_CATEGORY_LABELS) as VehicleCategory[]).map((c) => ({
  value: c,
  label: VEHICLE_CATEGORY_LABELS[c],
}));

export function VehicleAddThirdPartyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState<ThirdPartyFormState>(emptyThirdPartyForm);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (open) setForm(emptyThirdPartyForm());
  }, [open]);

  function set<K extends keyof ThirdPartyFormState>(key: K, value: ThirdPartyFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function selectType(t: VehicleType) {
    setForm((f) => {
      const current = typeof f.seats === "number" ? f.seats : SEAT_RANGE[t][0];
      return { ...f, type: t, seats: clampSeats(current, t) };
    });
  }

  function submit() {
    const required: Array<[keyof ThirdPartyFormState, string]> = [
      ["make", "Marque"], ["model", "Modèle"], ["color", "Couleur"], ["licensePlate", "Plaque"],
    ];
    for (const [key, label] of required) {
      if (!String(form[key] ?? "").trim()) {
        toast({ kind: "error", title: `${label} requis` });
        return;
      }
    }
    if (form.year === "" || form.seats === "") {
      toast({ kind: "error", title: "Année et sièges requis" });
      return;
    }
    const [min, max] = SEAT_RANGE[form.type];
    if (form.seats < min || form.seats > max) {
      toast({ kind: "error", title: "Sièges invalides", description: `Entre ${min} et ${max} pour un ${VEHICLE_TYPE_LABELS[form.type]}.` });
      return;
    }
    if (form.ownerPhone && !/^[\d\s+]{8,17}$/.test(form.ownerPhone.trim())) {
      toast({ kind: "error", title: "Téléphone invalide", description: "8 à 15 chiffres (espaces et + tolérés)." });
      return;
    }

    start(async () => {
      const r = await addThirdPartyVehicleAction({
        type: form.type,
        make: form.make.trim(),
        model: form.model.trim(),
        year: form.year as number,
        color: form.color.trim(),
        licensePlate: form.licensePlate.trim().toUpperCase(),
        seats: form.seats as number,
        category: form.category || undefined,
        insuranceExpiryDate: form.insuranceExpiryDate || undefined,
        ownerName: form.ownerName.trim() || undefined,
        ownerPhone: form.ownerPhone.trim() || undefined,
        ownerNote: form.ownerNote.trim() || undefined,
        insuranceFile: form.insurance ?? undefined,
        registrationCardFile: form.registrationCard ?? undefined,
      });
      notify(r, "Véhicule tiers créé");
      if (r.ok) onClose();
    });
  }

  const [seatMin, seatMax] = SEAT_RANGE[form.type];

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Véhicule tiers"
      description="Véhicule n'appartenant ni à ForYou ni à un chauffeur (partenaire, particulier…). Créé sans chauffeur — assignable ensuite. Pas de prix ni de date d'achat, pas éligible au contrat location-vente."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>Annuler</Button>
          <Button onClick={submit} isLoading={pending}>Créer le véhicule</Button>
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
          <Combobox
            label="Catégorie (optionnel)"
            placeholder="Non définie"
            options={CATEGORY_OPTIONS}
            value={form.category}
            onChange={(v) => set("category", v as VehicleCategory)}
            allowClear
          />
        </Section>

        <Section title="Identité">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Marque *" value={form.make} onChange={(e) => set("make", e.target.value)} placeholder="Toyota" />
            <Input label="Modèle *" value={form.model} onChange={(e) => set("model", e.target.value)} placeholder="Corolla" />
            <Input label="Plaque *" value={form.licensePlate} onChange={(e) => set("licensePlate", e.target.value.toUpperCase())} placeholder="PL-0001-BJ" />
            <Input label="Couleur *" value={form.color} onChange={(e) => set("color", e.target.value)} placeholder="Blanc" />
            <Input
              label="Année *" type="number" inputMode="numeric"
              value={form.year === "" ? "" : form.year}
              onChange={(e) => set("year", e.target.value === "" ? "" : Number(e.target.value))}
              placeholder={String(new Date().getFullYear())}
            />
            <Input
              label="Sièges *" type="number" inputMode="numeric" min={seatMin} max={seatMax}
              value={form.seats === "" ? "" : form.seats}
              onChange={(e) => set("seats", e.target.value === "" ? "" : Number(e.target.value))}
              hint={`Entre ${seatMin} et ${seatMax} pour un ${VEHICLE_TYPE_LABELS[form.type]}`}
            />
          </div>
        </Section>

        <Section title="Propriétaire" helper="Jamais visible du chauffeur — usage admin uniquement">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Nom" value={form.ownerName} onChange={(e) => set("ownerName", e.target.value)} placeholder="Nom du propriétaire" maxLength={100} />
            <Input label="Téléphone" value={form.ownerPhone} onChange={(e) => set("ownerPhone", e.target.value)} placeholder="+229 XX XX XX XX" />
          </div>
          <Textarea label="Note" value={form.ownerNote} onChange={(e) => set("ownerNote", e.target.value)} placeholder="Accord verbal, contexte du partenariat…" rows={2} />
        </Section>

        <Section title="Documents (optionnel)" helper="JPG · PNG · PDF · max 10 Mo — ajoutables plus tard">
          <div className="grid gap-3 sm:grid-cols-2">
            <SimpleFilePicker label="Assurance" value={form.insurance} onChange={(f) => set("insurance", f)} />
            <SimpleFilePicker label="Carte grise" value={form.registrationCard} onChange={(f) => set("registrationCard", f)} />
          </div>
          <Input
            label="Expiration de l'assurance"
            type="date"
            value={form.insuranceExpiryDate}
            onChange={(e) => set("insuranceExpiryDate", e.target.value)}
          />
        </Section>
      </div>
    </Modal>
  );
}
