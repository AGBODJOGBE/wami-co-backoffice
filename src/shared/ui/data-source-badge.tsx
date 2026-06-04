import { AlertTriangle, CheckCircle2, FlaskConical } from "lucide-react";
import { cn } from "@/shared/lib/cn";

/**
 * Visual indicator describing where the page data comes from.
 *
 * - `live`     → fully wired to the backend API.
 * - `partial`  → some bits are dynamic, others are still seeded/mocked.
 * - `mock`     → pure local seed data, no backend call yet.
 *
 * Used to spot non-dynamic screens at a glance during integration.
 */
export type DataSource = "live" | "partial" | "mock";

const STYLES: Record<
  DataSource,
  { label: string; className: string; Icon: typeof AlertTriangle }
> = {
  live: {
    label: "Live",
    Icon: CheckCircle2,
    className:
      "border-[color:var(--success)]/40 bg-[color:var(--success)]/10 text-[color:var(--success)]",
  },
  partial: {
    label: "Partiel",
    Icon: AlertTriangle,
    className:
      "border-[color:var(--warning)]/40 bg-[color:var(--warning)]/10 text-[color:var(--warning)]",
  },
  mock: {
    label: "Mock",
    Icon: FlaskConical,
    className:
      "border-[color:var(--danger)]/40 bg-[color:var(--danger)]/10 text-[color:var(--danger)]",
  },
};

export interface DataSourceBadgeProps {
  source: DataSource;
  hint?: string;
  className?: string;
}

export function DataSourceBadge({
  source,
  hint,
  className,
}: DataSourceBadgeProps) {
  const { label, Icon, className: tone } = STYLES[source];
  const title =
    hint ??
    (source === "live"
      ? "Données issues de l'API en temps réel."
      : source === "partial"
        ? "Cette page mélange données API et données simulées."
        : "Cette page affiche des données de démonstration. Aucun appel API.");
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        tone,
        className,
      )}
    >
      <Icon className="size-3" />
      {label}
    </span>
  );
}
