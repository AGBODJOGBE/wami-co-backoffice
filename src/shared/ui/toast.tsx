"use client";

import {
  AlertCircle,
  CheckCircle2,
  Info,
  TriangleAlert,
  X,
} from "lucide-react";
import { useSyncExternalStore } from "react";
import { cn } from "@/shared/lib/cn";

export type ToastKind = "success" | "error" | "warning" | "info";

export interface ToastInput {
  kind?: ToastKind;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastEntry extends ToastInput {
  id: string;
  kind: ToastKind;
  createdAt: number;
}

const listeners = new Set<() => void>();
let toasts: ToastEntry[] = [];

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return toasts;
}

// Stable empty reference: returning `[]` would hand React a new array every
// call and trigger "getServerSnapshot should be cached" warnings → infinite
// loop on the client during hydration.
const EMPTY: ToastEntry[] = [];
function getServerSnapshot() {
  return EMPTY;
}

export function toast(input: ToastInput) {
  const id = Math.random().toString(36).slice(2, 10);
  const entry: ToastEntry = {
    id,
    kind: input.kind ?? "info",
    title: input.title,
    description: input.description,
    duration: input.duration ?? 4000,
    createdAt: Date.now(),
  };
  toasts = [...toasts, entry];
  emit();
  setTimeout(() => dismiss(id), entry.duration);
}

export function dismiss(id: string) {
  const next = toasts.filter((t) => t.id !== id);
  if (next.length === toasts.length) return;
  toasts = next;
  emit();
}

const KIND_META: Record<
  ToastKind,
  { icon: typeof CheckCircle2; bar: string; iconColor: string }
> = {
  success: {
    icon: CheckCircle2,
    bar: "bg-emerald-500",
    iconColor: "text-emerald-500",
  },
  error: {
    icon: AlertCircle,
    bar: "bg-red-500",
    iconColor: "text-red-500",
  },
  warning: {
    icon: TriangleAlert,
    bar: "bg-amber-500",
    iconColor: "text-amber-500",
  },
  info: {
    icon: Info,
    bar: "bg-[color:var(--primary)]",
    iconColor: "text-[color:var(--primary)]",
  },
};

export interface ToastViewportProps {
  /** When true, the viewport is positioned to be visible above an open
   * `<dialog>` (which lives in the browser top-layer). Use this to mount
   * a second viewport inside Modal so toasts don't get hidden behind it. */
  insideTopLayer?: boolean;
}

export function ToastViewport({ insideTopLayer = false }: ToastViewportProps = {}) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        "pointer-events-none fixed bottom-4 right-4 flex w-full max-w-sm flex-col gap-2",
        // top-layer (open <dialog>) outranks every z-index outside of it,
        // so the global viewport is hidden when a modal is open. The
        // inside-the-modal copy only needs a high z to beat the modal body.
        insideTopLayer ? "z-[1000]" : "z-[100]",
      )}
    >
      {snapshot.map((t) => {
        const meta = KIND_META[t.kind];
        const Icon = meta.icon;
        return (
          <div
            key={t.id}
            role="status"
            className={cn(
              "pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-lg border border-[color:var(--border)] bg-white p-4 pr-3 shadow-lg shadow-black/5 dark:bg-[color:var(--muted)]",
              "animate-[toast-in_180ms_ease-out]",
            )}
          >
            <span className={cn("absolute inset-y-0 left-0 w-1", meta.bar)} />
            <Icon className={cn("mt-0.5 size-5 shrink-0", meta.iconColor)} />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="text-sm font-medium text-[color:var(--foreground)]">
                {t.title}
              </p>
              {t.description ? (
                <p className="mt-0.5 text-xs text-[color:var(--muted-foreground)]">
                  {t.description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="rounded-md p-1 text-[color:var(--muted-foreground)] transition hover:bg-[color:var(--muted)] hover:text-[color:var(--foreground)]"
              aria-label="Fermer"
            >
              <X className="size-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
