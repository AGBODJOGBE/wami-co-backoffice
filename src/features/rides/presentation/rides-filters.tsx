"use client";

import { useState } from "react";
import { Calendar, SlidersHorizontal } from "lucide-react";
import { Combobox } from "@/shared/ui/combobox";
import { SearchField } from "@/shared/ui/search-field";

const vehicleOptions = [
  { value: "ALL", label: "Tous véhicules" },
  { value: "MOTO", label: "Moto" },
  { value: "TRICYCLE", label: "Tricycle" },
  { value: "STANDARD", label: "Standard" },
  { value: "PREMIUM", label: "Premium" },
  { value: "VIP", label: "VIP" },
];

const paymentOptions = [
  { value: "ALL", label: "Tous paiements" },
  { value: "CASH", label: "Cash" },
  { value: "WALLET", label: "Wallet" },
  { value: "MOBILE_MONEY", label: "Mobile Money" },
  { value: "CARD", label: "Carte" },
];

const cityOptions = [
  { value: "ALL", label: "Toutes villes" },
  { value: "COTONOU", label: "Cotonou" },
  { value: "CALAVI", label: "Calavi" },
  { value: "PORTO_NOVO", label: "Porto-Novo" },
  { value: "OUIDAH", label: "Ouidah" },
];

export function RidesFilters() {
  const [search, setSearch] = useState("");
  const [vehicle, setVehicle] = useState("ALL");
  const [payment, setPayment] = useState("ALL");
  const [city, setCity] = useState("ALL");

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[color:var(--border)] bg-white p-4 dark:bg-[color:var(--muted)]">
      <div className="flex flex-wrap items-center gap-3">
        <SearchField
          placeholder="Rechercher un FY-RD-…, passager, driver…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:flex-1 sm:min-w-72"
        />
        <Combobox
          options={vehicleOptions}
          value={vehicle}
          onChange={setVehicle}
          className="sm:w-44"
        />
        <Combobox
          options={paymentOptions}
          value={payment}
          onChange={setPayment}
          className="sm:w-44"
        />
        <Combobox
          options={cityOptions}
          value={city}
          onChange={setCity}
          className="sm:w-44"
        />
        <button
          type="button"
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-[color:var(--border)] px-3 text-sm font-medium text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)] hover:text-[color:var(--foreground)]"
        >
          <Calendar className="size-4" />
          Aujourd&apos;hui
        </button>
        <button
          type="button"
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-[color:var(--border)] px-3 text-sm font-medium text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)] hover:text-[color:var(--foreground)]"
        >
          <SlidersHorizontal className="size-4" />
          Plus de filtres
        </button>
      </div>
    </div>
  );
}
