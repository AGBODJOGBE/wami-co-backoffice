import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { cn } from "@/shared/lib/cn";

export interface StatCardProps {
  label: string;
  value: string;
  helper?: string;
  trend?: { value: string; direction: "up" | "down" | "flat" };
  icon: LucideIcon;
  tone?: "primary" | "secondary" | "success" | "warning" | "danger" | "neutral";
}

const toneAccent: Record<NonNullable<StatCardProps["tone"]>, string> = {
  primary: "bg-[color:var(--primary-soft)] text-[color:var(--primary)]",
  secondary: "bg-[color:var(--secondary-soft)] text-[color:var(--secondary-foreground)]",
  success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  warning: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  danger: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  neutral: "bg-[color:var(--muted)] text-[color:var(--muted-foreground)]",
};

export function StatCard({
  label,
  value,
  helper,
  trend,
  icon: Icon,
  tone = "primary",
}: StatCardProps) {
  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
          {label}
        </span>
        <span
          className={cn(
            "flex size-10 items-center justify-center rounded-lg",
            toneAccent[tone],
          )}
        >
          <Icon className="size-5" />
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-2xl font-semibold text-[color:var(--foreground)]">{value}</p>
        <div className="flex items-center gap-2 text-xs">
          {trend ? (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-medium",
                trend.direction === "up" && "text-emerald-600 dark:text-emerald-400",
                trend.direction === "down" && "text-red-600 dark:text-red-400",
                trend.direction === "flat" && "text-[color:var(--muted-foreground)]",
              )}
            >
              {trend.direction === "up" ? (
                <ArrowUpRight className="size-3" />
              ) : trend.direction === "down" ? (
                <ArrowDownRight className="size-3" />
              ) : null}
              {trend.value}
            </span>
          ) : null}
          {helper ? (
            <span className="text-[color:var(--muted-foreground)]">{helper}</span>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
