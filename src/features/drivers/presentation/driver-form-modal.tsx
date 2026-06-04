"use client";

import { useEffect, useState } from "react";
import { Button } from "@/shared/ui/button";
import { Combobox } from "@/shared/ui/combobox";
import { Input } from "@/shared/ui/input";
import { Modal } from "@/shared/ui/modal";
import { toast } from "@/shared/ui/toast";
import { useDriversStore, type NewDriverInput } from "../store";
import type { DriverRow } from "../domain/driver";

const CITY_OPTIONS = [
  { value: "Cotonou", label: "Cotonou" },
  { value: "Calavi", label: "Calavi" },
  { value: "Porto-Novo", label: "Porto-Novo" },
  { value: "Ouidah", label: "Ouidah" },
  { value: "Parakou", label: "Parakou" },
];

const CATEGORY_OPTIONS = [
  { value: "MOTO", label: "Moto" },
  { value: "TRICYCLE", label: "Tricycle" },
  { value: "STANDARD", label: "Standard" },
  { value: "PREMIUM", label: "Premium" },
  { value: "VIP", label: "VIP" },
];

export interface DriverFormModalProps {
  open: boolean;
  mode: "create" | "edit";
  driver?: DriverRow;
  onClose: () => void;
}

export function DriverFormModal({ open, mode, driver, onClose }: DriverFormModalProps) {
  const create = useDriversStore((s) => s.create);
  const update = useDriversStore((s) => s.update);

  const empty: NewDriverInput = {
    fullName: "",
    phone: "+229 ",
    email: "",
    city: "Cotonou",
    category: "STANDARD",
    vehicle: "",
    plate: "",
  };

  const [form, setForm] = useState<NewDriverInput>(empty);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && driver) {
      setForm({
        fullName: driver.fullName,
        phone: driver.phone,
        email: driver.email,
        city: driver.city,
        category: driver.category,
        vehicle: driver.vehicle,
        plate: driver.plate,
      });
    } else {
      setForm(empty);
    }
  }, [open, mode, driver]);

  function set<K extends keyof NewDriverInput>(key: K, value: NewDriverInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit() {
    if (!form.fullName || !form.phone || !form.plate) {
      toast({
        kind: "error",
        title: "Champs manquants",
        description: "Le nom, le téléphone et la plaque sont obligatoires.",
      });
      return;
    }
    if (mode === "create") {
      create(form);
      toast({
        kind: "success",
        title: "Driver créé",
        description: `${form.fullName} attend maintenant la validation KYC.`,
      });
    } else if (driver) {
      update(driver.driverId, form);
      toast({
        kind: "success",
        title: "Driver mis à jour",
        description: form.fullName,
      });
    }
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "create" ? "Nouveau driver" : "Modifier le driver"}
      description={
        mode === "create"
          ? "Le compte sera créé avec le statut « En attente KYC »."
          : "Les changements sont propagés à l'app driver après publication."
      }
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSubmit}>
            {mode === "create" ? "Créer le driver" : "Enregistrer"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Nom complet"
          required
          value={form.fullName}
          onChange={(e) => set("fullName", e.target.value)}
          placeholder="Marc Tossou"
        />
        <Input
          label="Téléphone"
          required
          value={form.phone}
          onChange={(e) => set("phone", e.target.value)}
          placeholder="+229 0190 ..."
        />
        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          placeholder="prenom.nom@..."
          className="sm:col-span-2"
        />
        <Combobox
          label="Ville"
          options={CITY_OPTIONS}
          value={form.city}
          onChange={(v) => set("city", v)}
          required
        />
        <Combobox
          label="Catégorie"
          options={CATEGORY_OPTIONS}
          value={form.category}
          onChange={(v) => set("category", v as NewDriverInput["category"])}
          required
        />
        <Input
          label="Véhicule"
          value={form.vehicle}
          onChange={(e) => set("vehicle", e.target.value)}
          placeholder="Toyota Corolla 2020"
          className="sm:col-span-2"
        />
        <Input
          label="Plaque"
          required
          value={form.plate}
          onChange={(e) => set("plate", e.target.value.toUpperCase())}
          placeholder="AB 1234 RB"
          className="sm:col-span-2"
        />
      </div>
    </Modal>
  );
}
