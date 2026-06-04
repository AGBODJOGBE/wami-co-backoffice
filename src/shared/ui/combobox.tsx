"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/shared/lib/cn";

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
  group?: string;
  icon?: string;
}

export interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  label?: string;
  hint?: string;
  error?: string;
  className?: string;
  triggerClassName?: string;
  allowClear?: boolean;
  disabled?: boolean;
  required?: boolean;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Sélectionner…",
  searchPlaceholder = "Rechercher…",
  emptyMessage = "Aucun résultat",
  label,
  hint,
  error,
  className,
  triggerClassName,
  allowClear = false,
  disabled = false,
  required = false,
}: ComboboxProps) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);

  const selected = useMemo(
    () => options.find((o) => o.value === value),
    [options, value],
  );

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return options;
    return options.filter((o) => normalize(o.label).includes(q));
  }, [options, query]);

  useEffect(() => {
    optionRefs.current = optionRefs.current.slice(0, filtered.length);
  }, [filtered.length]);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 10);
      return () => clearTimeout(t);
    }
    setQuery("");
    setHighlight(0);
  }, [open]);

  useEffect(() => {
    setHighlight((prev) =>
      Math.min(prev, Math.max(0, filtered.length - 1)),
    );
  }, [filtered.length]);

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
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const item = optionRefs.current[highlight];
    item?.scrollIntoView({ block: "nearest" });
  }, [highlight, open]);

  function pick(v: string) {
    onChange(v);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onInputKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = filtered[highlight];
      if (opt) pick(opt.value);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange("");
  }

  return (
    <div className={cn("relative flex flex-col gap-1.5", className)}>
      {label ? (
        <label
          htmlFor={`${id}-trigger`}
          className="text-sm font-medium text-[color:var(--foreground)]"
        >
          {label}
          {required ? (
            <span className="ml-0.5 text-[color:var(--danger)]">*</span>
          ) : null}
        </label>
      ) : null}

      <button
        id={`${id}-trigger`}
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={error ? true : undefined}
        className={cn(
          "flex h-10 items-center gap-2 rounded-lg border bg-[color:var(--background)] px-3 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-[color:var(--background)]",
          error
            ? "border-[color:var(--danger)] focus:ring-[color:var(--danger)]"
            : "border-[color:var(--border)] focus:border-[color:var(--primary)] focus:ring-[color:var(--primary)]",
          disabled && "pointer-events-none opacity-50",
          triggerClassName,
        )}
      >
        <span
          className={cn(
            "flex-1 truncate",
            selected
              ? "text-[color:var(--foreground)]"
              : "text-[color:var(--muted-foreground)]",
          )}
        >
          {selected?.icon ? <span className="mr-1">{selected.icon}</span> : null}
          {selected?.label ?? placeholder}
        </span>

        {allowClear && selected ? (
          <span
            role="button"
            tabIndex={-1}
            onClick={handleClear}
            className="rounded p-0.5 text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)] hover:text-[color:var(--foreground)]"
            aria-label="Effacer"
          >
            <X className="size-3.5" />
          </span>
        ) : null}

        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-[color:var(--muted-foreground)] transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {hint && !error ? (
        <p className="text-xs text-[color:var(--muted-foreground)]">{hint}</p>
      ) : null}
      {error ? (
        <p className="text-xs text-[color:var(--danger)]">{error}</p>
      ) : null}

      {open ? (
        <div
          ref={panelRef}
          className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-[color:var(--border)] bg-white shadow-xl shadow-black/5 dark:bg-[color:var(--muted)]"
        >
          <div className="flex items-center gap-2 border-b border-[color:var(--border)] px-3">
            <Search className="size-4 shrink-0 text-[color:var(--muted-foreground)]" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlight(0);
              }}
              onKeyDown={onInputKey}
              placeholder={searchPlaceholder}
              className="h-10 w-full bg-transparent text-sm text-[color:var(--foreground)] placeholder:text-[color:var(--muted-foreground)] focus:outline-none"
            />
            {query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="rounded p-0.5 text-[color:var(--muted-foreground)] hover:bg-[color:var(--background)] hover:text-[color:var(--foreground)]"
                aria-label="Effacer la recherche"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>

          <ul
            role="listbox"
            className="max-h-72 overflow-y-auto p-1"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-[color:var(--muted-foreground)]">
                {emptyMessage}
              </li>
            ) : (
              filtered.map((opt, i) => {
                const isSelected = opt.value === value;
                const isHighlighted = i === highlight;
                return (
                  <li key={opt.value}>
                    <button
                      ref={(el) => {
                        optionRefs.current[i] = el;
                      }}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onMouseEnter={() => setHighlight(i)}
                      onClick={() => pick(opt.value)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-sm transition",
                        isHighlighted
                          ? "bg-[color:var(--primary-soft)] text-[color:var(--primary)]"
                          : "text-[color:var(--foreground)] hover:bg-[color:var(--muted)]/60",
                      )}
                    >
                      {opt.icon ? (
                        <span className="text-base" aria-hidden>
                          {opt.icon}
                        </span>
                      ) : null}
                      <div className="flex min-w-0 flex-1 flex-col leading-tight">
                        <span className="truncate font-medium">{opt.label}</span>
                        {opt.description ? (
                          <span
                            className={cn(
                              "truncate text-xs",
                              isHighlighted
                                ? "text-[color:var(--primary)]/70"
                                : "text-[color:var(--muted-foreground)]",
                            )}
                          >
                            {opt.description}
                          </span>
                        ) : null}
                      </div>
                      {isSelected ? (
                        <Check className="size-4 shrink-0 text-[color:var(--primary)]" />
                      ) : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
