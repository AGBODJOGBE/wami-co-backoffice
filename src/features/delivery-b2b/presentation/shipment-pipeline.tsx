"use client";

import {
  Check,
  Clock,
  PackageCheck,
  PackageSearch,
  Truck,
  XCircle,
} from "lucide-react";
import { cn } from "@/shared/lib/cn";
import type { ShipmentStatus } from "../domain/types";

const STEPS: Array<{
  status: ShipmentStatus;
  label: string;
  icon: typeof Check;
}> = [
  { status: "PENDING_PICKUP", label: "En attente", icon: Clock },
  { status: "ASSIGNED", label: "Assignée", icon: PackageSearch },
  { status: "PICKED_UP", label: "Collectée", icon: PackageCheck },
  { status: "IN_TRANSIT", label: "En transit", icon: Truck },
  { status: "DELIVERED", label: "Livrée", icon: Check },
];

const STATUS_INDEX: Record<ShipmentStatus, number> = {
  DRAFT: -1,
  PENDING_PICKUP: 0,
  ASSIGNED: 1,
  PICKED_UP: 2,
  IN_TRANSIT: 3,
  DELIVERED: 4,
  FAILED: -2,
  CANCELLED: -3,
};

export function ShipmentPipeline({ status }: { status: ShipmentStatus }) {
  const currentIdx = STATUS_INDEX[status];
  const isFailed = status === "FAILED" || status === "CANCELLED";

  return (
    <div className="flex w-full flex-col gap-3">
      {isFailed ? (
        <div
          className={cn(
            "inline-flex items-center gap-2 self-start rounded-full px-3 py-1 text-xs font-medium",
            status === "FAILED"
              ? "bg-[color:var(--danger)]/10 text-[color:var(--danger)]"
              : "bg-[color:var(--muted)] text-[color:var(--muted-foreground)]",
          )}
        >
          <XCircle className="size-3.5" />
          {status === "FAILED" ? "Livraison en échec" : "Livraison annulée"}
        </div>
      ) : null}
      <ol className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {STEPS.map((step, i) => {
          const reached = !isFailed && currentIdx >= i;
          const current = !isFailed && currentIdx === i;
          const Icon = step.icon;
          return (
            <li key={step.status} className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full border transition",
                    reached
                      ? "border-[color:var(--primary)] bg-[color:var(--primary)] text-[color:var(--primary-foreground)]"
                      : "border-[color:var(--border)] bg-[color:var(--background)] text-[color:var(--muted-foreground)]",
                    current && "ring-4 ring-[color:var(--primary)]/15",
                  )}
                >
                  <Icon className="size-3.5" />
                </span>
                <span
                  className={cn(
                    "text-xs",
                    reached
                      ? "font-medium text-[color:var(--foreground)]"
                      : "text-[color:var(--muted-foreground)]",
                  )}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 ? (
                <span
                  className={cn(
                    "h-px w-8 sm:w-10",
                    reached
                      ? "bg-[color:var(--primary)]"
                      : "bg-[color:var(--border)]",
                  )}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
