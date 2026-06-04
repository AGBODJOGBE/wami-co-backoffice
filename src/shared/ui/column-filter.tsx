"use client";

import { useEffect, useRef, useState } from "react";
import { Filter } from "lucide-react";
import { cn } from "@/shared/lib/cn";

export type ColumnFilterValue =
  | { type: "select"; selected: string[] }
  | { type: "expiry"; bucket: "ALL" | "EXPIRED" | "LT_30" | "LT_90" | "OK" }
  | { type: "boolean"; bucket: "ALL" | "TRUE" | "FALSE" }
  | { type: "number"; min: number | null; max: number | null }
  | null;

export type ColumnFilterDef =
  | {
      kind: "select";
      options: { value: string; label: string }[];
    }
  | { kind: "expiry"; expiredLabel?: string; okLabel?: string }
  | { kind: "boolean"; trueLabel: string; falseLabel: string }
  | { kind: "number"; unit?: string };

export interface ColumnFilterPopoverProps {
  def: ColumnFilterDef;
  value: ColumnFilterValue;
  onChange: (next: ColumnFilterValue) => void;
}

function isActive(value: ColumnFilterValue): boolean {
  if (!value) return false;
  if (value.type === "select") return value.selected.length > 0;
  if (value.type === "expiry") return value.bucket !== "ALL";
  if (value.type === "boolean") return value.bucket !== "ALL";
  if (value.type === "number") return value.min !== null || value.max !== null;
  return false;
}

export function ColumnFilterPopover({
  def,
  value,
  onChange,
}: ColumnFilterPopoverProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const t = e.target as Node;
      if (
        !triggerRef.current?.contains(t) &&
        !panelRef.current?.contains(t)
      ) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const active = isActive(value);

  function clearFilter() {
    if (def.kind === "select") onChange({ type: "select", selected: [] });
    else if (def.kind === "expiry") onChange({ type: "expiry", bucket: "ALL" });
    else if (def.kind === "boolean") onChange({ type: "boolean", bucket: "ALL" });
    else if (def.kind === "number")
      onChange({ type: "number", min: null, max: null });
  }

  return (
    <div className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        aria-label="Filtrer"
        className={cn(
          "relative rounded p-0.5 transition",
          active
            ? "text-[color:var(--primary)]"
            : "text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]",
        )}
      >
        <Filter className={cn("size-3.5", active && "fill-current")} />
        {active ? (
          <span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-[color:var(--primary)]" />
        ) : null}
      </button>

      {open ? (
        <div
          ref={panelRef}
          onClick={(e) => e.stopPropagation()}
          className="absolute left-0 top-full z-30 mt-1 min-w-56 overflow-hidden rounded-lg border border-[color:var(--border)] bg-white p-2 shadow-xl shadow-black/5 dark:bg-[color:var(--muted)]"
        >
          {def.kind === "select" ? (
            <SelectFilterBody def={def} value={value} onChange={onChange} />
          ) : null}
          {def.kind === "expiry" ? (
            <ExpiryFilterBody def={def} value={value} onChange={onChange} />
          ) : null}
          {def.kind === "boolean" ? (
            <BooleanFilterBody def={def} value={value} onChange={onChange} />
          ) : null}
          {def.kind === "number" ? (
            <NumberFilterBody def={def} value={value} onChange={onChange} />
          ) : null}

          {active ? (
            <div className="mt-2 flex items-center justify-between border-t border-[color:var(--border)] pt-2">
              <button
                type="button"
                onClick={() => {
                  clearFilter();
                  setOpen(false);
                }}
                className="text-xs font-medium text-[color:var(--primary)] hover:underline"
              >
                Effacer le filtre
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-1 text-xs text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)] hover:text-[color:var(--foreground)]"
              >
                Fermer
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function SelectFilterBody({
  def,
  value,
  onChange,
}: {
  def: Extract<ColumnFilterDef, { kind: "select" }>;
  value: ColumnFilterValue;
  onChange: (v: ColumnFilterValue) => void;
}) {
  const selected = value && value.type === "select" ? value.selected : [];

  function toggle(v: string) {
    const next = selected.includes(v)
      ? selected.filter((x) => x !== v)
      : [...selected, v];
    onChange({ type: "select", selected: next });
  }

  return (
    <ul className="max-h-72 overflow-y-auto py-1">
      {def.options.map((opt) => {
        const isOn = selected.includes(opt.value);
        return (
          <li key={opt.value}>
            <label className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm hover:bg-[color:var(--muted)]/60">
              <input
                type="checkbox"
                checked={isOn}
                onChange={() => toggle(opt.value)}
                className="size-3.5 rounded border-[color:var(--border)] text-[color:var(--primary)] focus:ring-[color:var(--primary)]"
              />
              <span className="flex-1 text-[color:var(--foreground)]">{opt.label}</span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}

function ExpiryFilterBody({
  def,
  value,
  onChange,
}: {
  def: Extract<ColumnFilterDef, { kind: "expiry" }>;
  value: ColumnFilterValue;
  onChange: (v: ColumnFilterValue) => void;
}) {
  const current = value && value.type === "expiry" ? value.bucket : "ALL";
  const buckets: { v: ColumnFilterValue & { type: "expiry" }; label: string }[] = [
    { v: { type: "expiry", bucket: "ALL" }, label: "Tous" },
    { v: { type: "expiry", bucket: "EXPIRED" }, label: def.expiredLabel ?? "Déjà expiré" },
    { v: { type: "expiry", bucket: "LT_30" }, label: "Expire dans 30 j" },
    { v: { type: "expiry", bucket: "LT_90" }, label: "Expire dans 90 j" },
    { v: { type: "expiry", bucket: "OK" }, label: def.okLabel ?? "À jour (≥ 90 j)" },
  ];

  return (
    <ul className="py-1">
      {buckets.map((b) => (
        <li key={b.v.bucket}>
          <button
            type="button"
            onClick={() => onChange(b.v)}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm",
              b.v.bucket === current
                ? "bg-[color:var(--primary-soft)] text-[color:var(--primary)]"
                : "text-[color:var(--foreground)] hover:bg-[color:var(--muted)]/60",
            )}
          >
            <span
              className={cn(
                "size-3 rounded-full",
                b.v.bucket === "EXPIRED" && "bg-red-500",
                b.v.bucket === "LT_30" && "bg-amber-500",
                b.v.bucket === "LT_90" && "bg-yellow-400",
                b.v.bucket === "OK" && "bg-emerald-500",
                b.v.bucket === "ALL" && "bg-[color:var(--muted-foreground)]",
              )}
            />
            <span className="flex-1">{b.label}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function BooleanFilterBody({
  def,
  value,
  onChange,
}: {
  def: Extract<ColumnFilterDef, { kind: "boolean" }>;
  value: ColumnFilterValue;
  onChange: (v: ColumnFilterValue) => void;
}) {
  const current = value && value.type === "boolean" ? value.bucket : "ALL";
  const buckets: { v: "ALL" | "TRUE" | "FALSE"; label: string }[] = [
    { v: "ALL", label: "Tous" },
    { v: "TRUE", label: def.trueLabel },
    { v: "FALSE", label: def.falseLabel },
  ];
  return (
    <ul className="py-1">
      {buckets.map((b) => (
        <li key={b.v}>
          <button
            type="button"
            onClick={() => onChange({ type: "boolean", bucket: b.v })}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm",
              b.v === current
                ? "bg-[color:var(--primary-soft)] text-[color:var(--primary)]"
                : "text-[color:var(--foreground)] hover:bg-[color:var(--muted)]/60",
            )}
          >
            <span className="flex-1">{b.label}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function NumberFilterBody({
  def,
  value,
  onChange,
}: {
  def: Extract<ColumnFilterDef, { kind: "number" }>;
  value: ColumnFilterValue;
  onChange: (v: ColumnFilterValue) => void;
}) {
  const current =
    value && value.type === "number" ? value : { type: "number" as const, min: null, max: null };

  return (
    <div className="flex flex-col gap-2 p-1">
      <div className="flex items-center gap-2 text-xs text-[color:var(--muted-foreground)]">
        <input
          type="number"
          placeholder="Min"
          value={current.min ?? ""}
          onChange={(e) =>
            onChange({
              type: "number",
              min: e.target.value === "" ? null : Number(e.target.value),
              max: current.max,
            })
          }
          className="h-8 w-20 rounded border border-[color:var(--border)] bg-[color:var(--background)] px-2 text-xs text-[color:var(--foreground)] focus:border-[color:var(--primary)] focus:outline-none"
        />
        <span>—</span>
        <input
          type="number"
          placeholder="Max"
          value={current.max ?? ""}
          onChange={(e) =>
            onChange({
              type: "number",
              min: current.min,
              max: e.target.value === "" ? null : Number(e.target.value),
            })
          }
          className="h-8 w-20 rounded border border-[color:var(--border)] bg-[color:var(--background)] px-2 text-xs text-[color:var(--foreground)] focus:border-[color:var(--primary)] focus:outline-none"
        />
        {def.unit ? <span>{def.unit}</span> : null}
      </div>
    </div>
  );
}

export function applyColumnFilter<TRow>(
  filter: ColumnFilterValue,
  accessor: (row: TRow) => unknown,
  row: TRow,
): boolean {
  if (!filter) return true;

  if (filter.type === "select") {
    if (filter.selected.length === 0) return true;
    const value = String(accessor(row) ?? "");
    return filter.selected.includes(value);
  }

  if (filter.type === "expiry") {
    if (filter.bucket === "ALL") return true;
    const days = Number(accessor(row) ?? Infinity);
    if (filter.bucket === "EXPIRED") return days < 0;
    if (filter.bucket === "LT_30") return days >= 0 && days < 30;
    if (filter.bucket === "LT_90") return days >= 0 && days < 90;
    if (filter.bucket === "OK") return days >= 90;
  }

  if (filter.type === "boolean") {
    if (filter.bucket === "ALL") return true;
    const truthy = Boolean(accessor(row));
    return filter.bucket === "TRUE" ? truthy : !truthy;
  }

  if (filter.type === "number") {
    const value = Number(accessor(row));
    if (Number.isNaN(value)) return false;
    if (filter.min !== null && value < filter.min) return false;
    if (filter.max !== null && value > filter.max) return false;
    return true;
  }

  return true;
}
