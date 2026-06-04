import { Loader2 } from "lucide-react";
import { cn } from "@/shared/lib/cn";

export interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}

const SIZE: Record<NonNullable<SpinnerProps["size"]>, string> = {
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
};

/**
 * Spinning loader. Use inline (e.g. inside a button) or with a label
 * for full-section loading states.
 */
export function Spinner({ size = "md", label, className }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-2 text-[color:var(--muted-foreground)]",
        className,
      )}
    >
      <Loader2
        className={cn(
          SIZE[size],
          "animate-spin text-[color:var(--primary)]",
        )}
        aria-hidden="true"
      />
      {label ? <span className="text-sm">{label}</span> : null}
    </span>
  );
}

/** Centered loading panel (for `loading.tsx` route fallbacks). */
export function LoadingPanel({ label = "Chargement…" }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-[color:var(--muted-foreground)]">
      <Loader2 className="size-8 animate-spin text-[color:var(--primary)]" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

/** Skeleton placeholder block. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse rounded-md bg-[color:var(--muted)]",
        className,
      )}
    />
  );
}
