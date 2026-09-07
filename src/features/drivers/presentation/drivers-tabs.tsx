"use client";

import { useEffect, useState } from "react";
import { Building2, Gauge, MapPin, Navigation, Radio, User } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import { Tabs } from "@/shared/ui/tabs";
import { PendingDriversClient } from "./pending-drivers-client";
import { AdminDriversListClient } from "./admin-drivers-list-client";
import type { AdminDriver, OnlineDriver, PendingDriver } from "../domain/admin-driver";
import { fullName } from "../domain/admin-driver";

const HIDDEN_API_URL = "/api/pending-hidden";

async function fetchHiddenIds(): Promise<Set<string>> {
  try {
    const res = await fetch(HIDDEN_API_URL, { cache: "no-store" });
    if (!res.ok) return new Set();
    const data = (await res.json()) as { hiddenIds: string[] };
    return new Set(data.hiddenIds);
  } catch {
    return new Set();
  }
}

// ─── Online drivers list ───────────────────────────────────────────────────────

const HEADING_LABELS = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSO","SO","OSO","O","ONO","NO","NNO"];

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}min` : `${h}h`;
}

function timeSince(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  return secs > 0 ? formatDuration(secs) : "—";
}

type SessionInfo = { totalSeconds: number; openSince: string | null };

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function OnlineDriversList({
  drivers,
  total,
  sessionsByDriverId,
}: {
  drivers: OnlineDriver[];
  total: number;
  sessionsByDriverId: Map<string, SessionInfo>;
}) {
  if (drivers.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Radio className="mx-auto mb-2 size-8 text-[color:var(--muted-foreground)]" />
        <p className="text-sm text-[color:var(--muted-foreground)]">Aucun pilote en ligne actuellement.</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-[color:var(--muted-foreground)]">
        {total} pilote{total > 1 ? "s" : ""} connecté{total > 1 ? "s" : ""} — position mise à jour en temps réel par le GPS.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {drivers.map((d) => {
          const heading = d.heading != null
            ? HEADING_LABELS[Math.round(d.heading / 22.5) % 16]
            : null;
          const session = sessionsByDriverId.get(d.driverId);
          const connectedSince = session?.openSince ?? null;
          return (
            <div
              key={d.driverId}
              className="flex flex-col gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--background)] p-4"
            >
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--primary-soft)] text-sm font-semibold text-[color:var(--primary)]">
                    {fullName(d).charAt(0).toUpperCase() || "D"}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 flex size-3">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                    <span className="relative inline-flex size-3 rounded-full border-2 border-[color:var(--background)] bg-emerald-500" />
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[color:var(--foreground)]">
                    {fullName(d) || "—"}
                  </p>
                  <p className="text-[11px] text-[color:var(--muted-foreground)]">
                    ★ {d.rating.toFixed(1)} · {d.totalRides} courses
                  </p>
                </div>
                {d.isInRide && <Badge tone="primary">En course</Badge>}
              </div>

              {/* Connexion */}
              <div className="rounded-lg bg-emerald-50 px-3 py-2 text-[11px] dark:bg-emerald-950/30">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[color:var(--muted-foreground)]">Connecté depuis</span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                    {connectedSince
                      ? `${formatDateShort(connectedSince)} ${formatTime(connectedSince)}`
                      : `~${timeSince(d.updatedAt)}`}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <span className="text-[color:var(--muted-foreground)]">Temps total</span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                    {session ? (() => {
                      const elapsed = session.openSince
                        ? Math.floor((Date.now() - new Date(session.openSince).getTime()) / 1000)
                        : 0;
                      return formatDuration(session.totalSeconds + elapsed);
                    })() : "—"}
                  </span>
                </div>
              </div>

              {/* GPS */}
              <div className="flex flex-wrap gap-2 text-[11px] text-[color:var(--muted-foreground)]">
                <span className="flex items-center gap-1">
                  <MapPin className="size-3 shrink-0" />
                  {d.latitude.toFixed(5)}, {d.longitude.toFixed(5)}
                </span>
                {d.speed != null && d.speed > 0 && (
                  <span className="flex items-center gap-1">
                    <Gauge className="size-3 shrink-0" />
                    {Math.round(d.speed)} km/h
                  </span>
                )}
                {heading && (
                  <span className="flex items-center gap-1">
                    <Navigation className="size-3 shrink-0" />
                    {heading}
                  </span>
                )}
              </div>

              {/* Vehicle */}
              {d.vehicle && (
                <div className="rounded-lg bg-[color:var(--muted)]/30 px-3 py-2 text-[11px]">
                  <span className="font-medium text-[color:var(--foreground)]">
                    {d.vehicle.make} {d.vehicle.model}
                  </span>
                  <span className="ml-1.5 font-mono uppercase text-[color:var(--muted-foreground)]">
                    {d.vehicle.licensePlate}
                  </span>
                  <Badge tone="neutral" className="ml-2">{d.vehicle.vehicleType}</Badge>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

export interface DriversTabsProps {
  pending: PendingDriver[];
  pendingTotal: number;
  pendingError?: string;
  all: AdminDriver[];
  allTotal: number;
  allError?: string;
  online: OnlineDriver[];
  onlineTotal: number;
  sessionsByDriverId: Map<string, SessionInfo>;
  platformVehicleDrivers: AdminDriver[];
  otherApprovedDrivers: AdminDriver[];
}

export function DriversTabs({
  pending,
  pendingTotal,
  pendingError,
  all,
  allTotal,
  allError,
  online,
  onlineTotal,
  sessionsByDriverId,
  platformVehicleDrivers,
  otherApprovedDrivers,
}: DriversTabsProps) {
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Chargement initial depuis le serveur (état partagé entre tous les admins)
    void fetchHiddenIds().then(setHiddenIds);

    // Sync dans le même onglet quand PendingDriversClient modifie l'état
    function onHiddenChanged() {
      void fetchHiddenIds().then(setHiddenIds);
    }
    window.addEventListener("foryou:pending-hidden-changed", onHiddenChanged);
    return () => {
      window.removeEventListener("foryou:pending-hidden-changed", onHiddenChanged);
    };
  }, []);

  const visiblePendingCount = pending.filter((d) => !hiddenIds.has(d.driverId)).length;

  return (
    <Tabs
      defaultValue={all.length > 0 ? "all" : "pending"}
      tabs={[
        {
          value: "all",
          label: "Approuvés (live)",
          badge:
            all.length > 0
              ? { count: allTotal, tone: "primary" as const }
              : undefined,
          content: allError ? (
            <Card className="p-6">
              <p className="text-sm text-[color:var(--danger)]">
                Impossible de charger la liste des pilotes : {allError}
              </p>
            </Card>
          ) : (
            <AdminDriversListClient drivers={all} total={allTotal} sessionMap={sessionsByDriverId} />
          ),
        },
        {
          value: "platform-vehicles",
          label: (
            <span className="flex items-center gap-1.5">
              <Building2 className="size-3.5 shrink-0" />
              Véhicules plateforme
            </span>
          ),
          badge:
            platformVehicleDrivers.length > 0
              ? { count: platformVehicleDrivers.length, tone: "primary" as const }
              : undefined,
          content:
            platformVehicleDrivers.length === 0 ? (
              <Card className="p-8 text-center">
                <Building2 className="mx-auto mb-2 size-8 text-[color:var(--muted-foreground)]" />
                <p className="text-sm text-[color:var(--muted-foreground)]">
                  Aucun pilote approuvé avec un véhicule de la plateforme.
                </p>
              </Card>
            ) : (
              <AdminDriversListClient
                drivers={platformVehicleDrivers}
                total={platformVehicleDrivers.length}
                sessionMap={sessionsByDriverId}
              />
            ),
        },
        {
          value: "other-drivers",
          label: (
            <span className="flex items-center gap-1.5">
              <User className="size-3.5 shrink-0" />
              Véhicules personnels
            </span>
          ),
          badge:
            otherApprovedDrivers.length > 0
              ? { count: otherApprovedDrivers.length, tone: "neutral" as const }
              : undefined,
          content:
            otherApprovedDrivers.length === 0 ? (
              <Card className="p-8 text-center">
                <User className="mx-auto mb-2 size-8 text-[color:var(--muted-foreground)]" />
                <p className="text-sm text-[color:var(--muted-foreground)]">
                  Aucun pilote approuvé avec un véhicule personnel.
                </p>
              </Card>
            ) : (
              <AdminDriversListClient
                drivers={otherApprovedDrivers}
                total={otherApprovedDrivers.length}
                sessionMap={sessionsByDriverId}
              />
            ),
        },
        {
          value: "online",
          label: "En ligne",
          badge:
            onlineTotal > 0
              ? { count: onlineTotal, tone: "success" as const }
              : undefined,
          content: <OnlineDriversList drivers={online} total={onlineTotal} sessionsByDriverId={sessionsByDriverId} />,
        },
        {
          value: "pending",
          label: "En attente (live)",
          badge:
            visiblePendingCount > 0
              ? { count: visiblePendingCount, tone: "warning" as const }
              : undefined,
          content: pendingError ? (
            <Card className="p-6">
              <p className="text-sm text-[color:var(--danger)]">
                Impossible de charger les pilotes en attente : {pendingError}
              </p>
            </Card>
          ) : (
            <PendingDriversClient drivers={pending} total={pendingTotal} />
          ),
        },
      ]}
    />
  );
}
