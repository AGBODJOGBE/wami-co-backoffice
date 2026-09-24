"use client";

import { useState } from "react";
import { Car } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import {
  COMPONENT_TYPE_LABELS,
  SERVICE_KEY_LABELS,
  STRATEGY_LABELS,
  type PricingComponent,
  type PricingProfile,
  type ServiceKey,
} from "../domain/pricing-profile";
import {
  RIDE_VEHICLE_LABELS,
  type RideVehicleType,
} from "../domain/ride-pricing";

const VEHICLE_ORDER: RideVehicleType[] = [
  "MOTO",
  "TRICYCLE",
  "ECO",
  "STANDARD",
  "CONFORT",
  "VIP",
  "VAN",
];

/** RIDE (course app) et RIDE_PICKUP (course créée par le chauffeur, sans
 * app) — tarifées et commissionnées séparément depuis leur scission backend. */
const RIDE_SERVICE_KEYS: ServiceKey[] = ["RIDE", "RIDE_PICKUP"];

function fmtFcfa(n: number) {
  return `${n.toLocaleString("fr-FR")} FCFA`;
}

function fmtPct(n: number) {
  return `${(n * 100).toFixed(1)} %`;
}

// ─── ComponentDetail ────────────────────────────────────────────────────────

function ComponentDetail({ c }: { c: PricingComponent }) {
  const rows: { label: string; value: string }[] = [];

  if (c.value !== undefined) rows.push({ label: "Montant", value: fmtFcfa(c.value) });
  if (c.rate !== undefined) {
    if (c.type === "PERCENTAGE_FEE") rows.push({ label: "Taux", value: fmtPct(c.rate) });
    else rows.push({ label: "Multiplicateur", value: `×${c.rate}` });
  }
  if (c.threshold !== undefined) rows.push({ label: "Seuil", value: `${c.threshold} kg` });
  if (c.freeUnits !== undefined) rows.push({ label: "Unités offertes", value: `${c.freeUnits} min` });
  if (c.condition) {
    rows.push({
      label: "Condition",
      value: `${c.condition.field} ${c.condition.operator} ${String(c.condition.value)}`,
    });
  }

  return (
    <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)]/30 px-3 py-2 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-[color:var(--foreground)]">{c.label}</span>
        <Badge tone="neutral">{COMPONENT_TYPE_LABELS[c.type]}</Badge>
      </div>

      {rows.length > 0 && (
        <dl className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5">
          {rows.map((r) => (
            <div key={r.label} className="flex gap-1">
              <dt className="text-[color:var(--muted-foreground)]">{r.label} :</dt>
              <dd className="font-medium text-[color:var(--foreground)]">{r.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {c.tiers && c.tiers.length > 0 && (
        <table className="mt-1.5 w-full text-[11px]">
          <thead>
            <tr className="text-[color:var(--muted-foreground)]">
              <th className="text-left font-normal">Tranche</th>
              <th className="text-right font-normal">Prix / km</th>
            </tr>
          </thead>
          <tbody>
            {c.tiers.map((t, i) => (
              <tr key={i}>
                <td className="text-[color:var(--foreground)]">
                  {i === 0
                    ? `0 → ${t.upTo ?? "∞"} km`
                    : `${c.tiers![i - 1].upTo} → ${t.upTo ?? "∞"} km`}
                </td>
                <td className="text-right font-medium text-[color:var(--foreground)]">
                  {fmtFcfa(t.pricePerKm)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {c.zones && c.zones.length > 0 && (
        <table className="mt-1.5 w-full text-[11px]">
          <thead>
            <tr className="text-[color:var(--muted-foreground)]">
              <th className="text-left font-normal">Zone (km)</th>
              <th className="text-right font-normal">Prix</th>
            </tr>
          </thead>
          <tbody>
            {c.zones.map((z, i) => (
              <tr key={i}>
                <td className="text-[color:var(--foreground)]">
                  {z.from} → {z.to ?? "∞"} km
                </td>
                <td className="text-right font-medium text-[color:var(--foreground)]">
                  {fmtFcfa(z.price)}
                  {z.perKmBeyond ? ` + ${fmtFcfa(z.perKmBeyond)}/km` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {c.packages && c.packages.length > 0 && (
        <table className="mt-1.5 w-full text-[11px]">
          <thead>
            <tr className="text-[color:var(--muted-foreground)]">
              <th className="text-left font-normal">Durée</th>
              <th className="text-right font-normal">Prix</th>
              <th className="text-right font-normal">Km inclus</th>
              <th className="text-right font-normal">Km supp.</th>
            </tr>
          </thead>
          <tbody>
            {c.packages.map((p, i) => (
              <tr key={i}>
                <td className="text-[color:var(--foreground)]">{p.durationMinutes} min</td>
                <td className="text-right font-medium text-[color:var(--foreground)]">{fmtFcfa(p.price)}</td>
                <td className="text-right text-[color:var(--foreground)]">{p.includedKm} km</td>
                <td className="text-right text-[color:var(--foreground)]">{fmtFcfa(p.extraKmRate)}/km</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── ProfileCard ─────────────────────────────────────────────────────────────

function ProfileCard({ profile }: { profile: PricingProfile }) {
  const components = profile.components ?? [];
  return (
    <div
      className={`rounded-xl border p-3 transition-colors ${
        profile.isActive
          ? "border-[color:var(--primary)]/30 bg-[color:var(--muted)]/30"
          : "border-[color:var(--border)] bg-[color:var(--background)]"
      }`}
    >
      {/* Header */}
      <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
        {profile.isActive && (
          <span className="inline-block size-2 rounded-full bg-[color:var(--primary)]" />
        )}
        <span className="text-xs font-semibold text-[color:var(--foreground)]">
          {profile.name}
        </span>
        {profile.isActive ? (
          <Badge tone="success">Actif</Badge>
        ) : (
          <Badge tone="neutral">Inactif</Badge>
        )}
        <Badge tone="neutral">{STRATEGY_LABELS[profile.strategy]}</Badge>
        <Badge tone="neutral">v{profile.version}</Badge>
      </div>

      {/* Rates */}
      <div className="mb-2.5 flex flex-wrap gap-3 text-[11px] text-[color:var(--muted-foreground)]">
        <span>
          Commission :{" "}
          <strong className="text-[color:var(--foreground)]">
            {fmtPct(profile.commissionRate)}
          </strong>
        </span>
        <span>
          Chauffeur :{" "}
          <strong className="text-[color:var(--foreground)]">
            {fmtPct(profile.driverShareRate)}
          </strong>
        </span>
      </div>

      {/* Components */}
      {components.length === 0 ? (
        <p className="text-xs italic text-[color:var(--muted-foreground)]">
          Aucune composante tarifaire.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {components.map((c, i) => (
            <ComponentDetail key={`${c.key}-${i}`} c={c} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── VehicleColumn ────────────────────────────────────────────────────────────

function VehicleColumn({
  vehicleType,
  profiles,
}: {
  vehicleType: RideVehicleType;
  profiles: PricingProfile[];
}) {
  const active = profiles.find((p) => p.isActive);
  const inactive = profiles.filter((p) => !p.isActive);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Car className="size-4 text-[color:var(--primary)]" />
            <CardTitle className="text-sm">
              {RIDE_VEHICLE_LABELS[vehicleType]}
            </CardTitle>
          </div>
          {active ? (
            <Badge tone="success">Actif</Badge>
          ) : (
            <Badge tone="danger">Non configuré</Badge>
          )}
        </div>
        {profiles.length > 0 && (
          <p className="text-[11px] text-[color:var(--muted-foreground)]">
            {profiles.length} version{profiles.length > 1 ? "s" : ""}
          </p>
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-2.5">
        {profiles.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-[color:var(--border)] py-6 text-center">
            <p className="text-xs text-[color:var(--muted-foreground)]">
              Aucun tarif configuré.
            </p>
          </div>
        ) : (
          <>
            {active && <ProfileCard profile={active} />}
            {inactive.length > 0 && (
              <details className="group">
                <summary className="cursor-pointer select-none text-xs text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]">
                  {inactive.length} version{inactive.length > 1 ? "s" : ""} archivée
                  {inactive.length > 1 ? "s" : ""}
                </summary>
                <div className="mt-2 flex flex-col gap-2">
                  {inactive.map((p) => (
                    <ProfileCard key={p.profileId} profile={p} />
                  ))}
                </div>
              </details>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── VehiclePricingGrid ───────────────────────────────────────────────────────

export interface VehiclePricingGridProps {
  profiles: PricingProfile[];
  error?: string;
}

export function VehiclePricingGrid({ profiles, error }: VehiclePricingGridProps) {
  const [serviceKey, setServiceKey] = useState<ServiceKey>("RIDE");
  const rideProfiles = profiles.filter((p) => p.serviceKey === serviceKey);
  const configuredCount = VEHICLE_ORDER.filter((v) =>
    rideProfiles.some((p) => (p.vehicleType ?? "").toUpperCase() === v),
  ).length;

  const byVehicle = VEHICLE_ORDER.reduce<Record<string, PricingProfile[]>>(
    (acc, v) => {
      acc[v] = rideProfiles.filter(
        (p) => (p.vehicleType ?? "").toUpperCase() === v,
      );
      return acc;
    },
    {},
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Car className="size-5 text-[color:var(--primary)]" />
        <div>
          <h2 className="text-base font-semibold text-[color:var(--foreground)]">
            Tarifs par véhicule — {SERVICE_KEY_LABELS[serviceKey]}
          </h2>
          <p className="text-xs text-[color:var(--muted-foreground)]">
            {configuredCount}/{VEHICLE_ORDER.length} catégories configurées — {rideProfiles.length} profil{rideProfiles.length !== 1 ? "s" : ""} au total
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {RIDE_SERVICE_KEYS.map((sk) => (
          <button
            key={sk}
            type="button"
            onClick={() => setServiceKey(sk)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
              serviceKey === sk
                ? "bg-[color:var(--foreground)] text-[color:var(--background)]"
                : "border border-[color:var(--border)] text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)]"
            }`}
          >
            {SERVICE_KEY_LABELS[sk]}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-[color:var(--danger)]/30 bg-[color:var(--danger)]/10 px-4 py-3 text-sm text-[color:var(--danger)]">
          {error}
        </div>
      )}

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {VEHICLE_ORDER.map((v) => (
          <VehicleColumn
            key={v}
            vehicleType={v}
            profiles={byVehicle[v] ?? []}
          />
        ))}
      </div>
    </div>
  );
}
