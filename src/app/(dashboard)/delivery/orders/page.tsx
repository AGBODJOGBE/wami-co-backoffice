"use client";

import { useState } from "react";
import { CheckCircle2, Package, ShieldAlert, Timer } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Combobox } from "@/shared/ui/combobox";
import { PageHeader } from "@/shared/ui/page-header";
import { SearchField } from "@/shared/ui/search-field";
import { Tabs } from "@/shared/ui/tabs";
import { StatCard } from "@/features/dashboard/presentation/components/stat-card";
import { mockDeliveryOrders } from "@/features/delivery/domain/mock";
import { OrdersTable } from "@/features/delivery/presentation/orders-table";

export default function DeliveryOrdersPage() {
  const [search, setSearch] = useState("");
  const [parcelType, setParcelType] = useState("ALL");
  const [vehicleType, setVehicleType] = useState("ALL");
  const [city, setCity] = useState("ALL");


  const inProgress = mockDeliveryOrders.filter((o) =>
    [
      "DRIVER_ASSIGNED",
      "PICKUP_ARRIVED",
      "PICKED_UP",
      "DELIVERY_ARRIVED",
      "OTP_VALIDATED",
    ].includes(o.status),
  );
  const failed = mockDeliveryOrders.filter((o) =>
    ["PICKUP_FAILED", "DELIVERY_FAILED", "CANCELLED"].includes(o.status),
  );
  const delivered = mockDeliveryOrders.filter((o) => o.status === "DELIVERED");
  const pending = mockDeliveryOrders.filter((o) => o.status === "PENDING_MATCH");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Opérations livraison"
        title="Commandes B2C"
        dataSource="mock"
        description="Lifecycle pickup → OTP → delivery, photos preuve, gestion des litiges."
        actions={
          <>
            <Button variant="outline" size="sm">
              Exporter CSV
            </Button>
            <Button size="sm">Créer une commande test</Button>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Livraisons du jour"
          value="46"
          trend={{ value: "−4 % vs hier", direction: "down" }}
          helper="dont 12 en cours"
          icon={Package}
          tone="primary"
        />
        <StatCard
          label="Taux de succès"
          value="92,8 %"
          trend={{ value: "+1,4 pt", direction: "up" }}
          helper="sur 7 j glissants"
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard
          label="Échecs"
          value={String(failed.length)}
          trend={{ value: "à analyser", direction: "flat" }}
          helper="motifs : adresse, no-show"
          icon={ShieldAlert}
          tone="warning"
        />
        <StatCard
          label="Durée moyenne"
          value="38 min"
          trend={{ value: "−2 min vs hier", direction: "down" }}
          helper="création → livraison"
          icon={Timer}
          tone="secondary"
        />
      </section>

      <div className="flex flex-col gap-3 rounded-xl border border-[color:var(--border)] bg-white p-4 dark:bg-[color:var(--muted)]">
        <div className="flex flex-wrap items-center gap-3">
          <SearchField
            placeholder="Rechercher un FY-B2C-…, expéditeur, destinataire…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:flex-1 sm:min-w-72"
          />
          <Combobox
            options={[
              { value: "ALL", label: "Toutes catégories" },
              { value: "DOCUMENT", label: "Document" },
              { value: "SMALL_PARCEL", label: "Petit colis" },
              { value: "FOOD", label: "Repas / Food" },
              { value: "MEDIUM_PARCEL", label: "Moyen colis" },
              { value: "FRAGILE", label: "Fragile" },
              { value: "LARGE_PARCEL", label: "Gros colis" },
            ]}
            value={parcelType}
            onChange={setParcelType}
            className="sm:w-44"
          />
          <Combobox
            options={[
              { value: "ALL", label: "Tous véhicules" },
              { value: "MOTO", label: "Moto" },
              { value: "TRICYCLE", label: "Tricycle" },
              { value: "STANDARD", label: "Voiture" },
              { value: "VAN", label: "Van" },
            ]}
            value={vehicleType}
            onChange={setVehicleType}
            className="sm:w-44"
          />
          <Combobox
            options={[
              { value: "ALL", label: "Toutes villes" },
              { value: "COTONOU", label: "Cotonou" },
              { value: "CALAVI", label: "Calavi" },
              { value: "PORTO_NOVO", label: "Porto-Novo" },
            ]}
            value={city}
            onChange={setCity}
            className="sm:w-44"
          />
        </div>
      </div>

      <Tabs
        defaultValue="all"
        tabs={[
          {
            value: "all",
            label: "Toutes",
            content: <OrdersTable rows={mockDeliveryOrders} total={46} />,
          },
          {
            value: "active",
            label: "En cours",
            badge: { count: inProgress.length, tone: "primary" },
            content: <OrdersTable rows={inProgress} total={inProgress.length} />,
          },
          {
            value: "pending",
            label: "En attente",
            badge: { count: pending.length, tone: "warning" },
            content: <OrdersTable rows={pending} total={pending.length} />,
          },
          {
            value: "delivered",
            label: "Livrées",
            content: <OrdersTable rows={delivered} total={31} />,
          },
          {
            value: "failed",
            label: "Échecs / Annulées",
            badge: { count: failed.length, tone: "danger" },
            content: <OrdersTable rows={failed} total={failed.length} />,
          },
        ]}
      />
    </div>
  );
}
