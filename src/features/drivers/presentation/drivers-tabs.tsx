"use client";

import { Card } from "@/shared/ui/card";
import { Tabs } from "@/shared/ui/tabs";
import { PendingDriversClient } from "./pending-drivers-client";
import { AdminDriversListClient } from "./admin-drivers-list-client";
import type {
  AdminDriver,
  PendingDriver,
} from "../domain/admin-driver";

export interface DriversTabsProps {
  pending: PendingDriver[];
  pendingTotal: number;
  pendingError?: string;
  all: AdminDriver[];
  allTotal: number;
  allError?: string;
}

export function DriversTabs({
  pending,
  pendingTotal,
  pendingError,
  all,
  allTotal,
  allError,
}: DriversTabsProps) {
  return (
    <Tabs
      defaultValue={all.length > 0 ? "all" : "pending"}
      tabs={[
        {
          value: "all",
          label: "Approuvés (live)",
          badge:
            all.length > 0
              ? { count: allTotal, tone: "primary" }
              : undefined,
          content: allError ? (
            <Card className="p-6">
              <p className="text-sm text-[color:var(--danger)]">
                Impossible de charger la liste des drivers : {allError}
              </p>
            </Card>
          ) : (
            <AdminDriversListClient drivers={all} total={allTotal} />
          ),
        },
        {
          value: "pending",
          label: "En attente (live)",
          badge:
            pending.length > 0
              ? { count: pending.length, tone: "warning" }
              : undefined,
          content: pendingError ? (
            <Card className="p-6">
              <p className="text-sm text-[color:var(--danger)]">
                Impossible de charger les drivers en attente : {pendingError}
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
