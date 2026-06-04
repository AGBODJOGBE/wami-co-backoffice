"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

export interface DetailHeaderProps {
  backHref: string;
  backLabel: string;
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  status?: ReactNode;
  avatar?: ReactNode;
  actions?: ReactNode;
}

export function DetailHeader({
  backHref,
  backLabel,
  eyebrow,
  title,
  subtitle,
  status,
  avatar,
  actions,
}: DetailHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-[color:var(--border)] pb-6">
      <Link
        href={backHref}
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-[color:var(--muted-foreground)] transition hover:text-[color:var(--foreground)]"
      >
        <ArrowLeft className="size-4" />
        {backLabel}
      </Link>

      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div className="flex items-start gap-4">
          {avatar ? <div className="shrink-0">{avatar}</div> : null}
          <div className="flex flex-col gap-1">
            {eyebrow ? (
              <span className="text-xs font-medium uppercase tracking-widest text-[color:var(--muted-foreground)]">
                {eyebrow}
              </span>
            ) : null}
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold text-[color:var(--foreground)]">
                {title}
              </h1>
              {status ? <div>{status}</div> : null}
            </div>
            {subtitle ? (
              <div className="text-sm text-[color:var(--muted-foreground)]">
                {subtitle}
              </div>
            ) : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

export function DetailNotFound({
  backHref,
  backLabel,
  message,
}: {
  backHref: string;
  backLabel: string;
  message: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <Link
        href={backHref}
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-[color:var(--muted-foreground)] transition hover:text-[color:var(--foreground)]"
      >
        <ArrowLeft className="size-4" />
        {backLabel}
      </Link>
      <div className="rounded-xl border border-dashed border-[color:var(--border)] bg-white p-12 text-center dark:bg-[color:var(--muted)]">
        <p className="text-sm text-[color:var(--muted-foreground)]">{message}</p>
      </div>
    </div>
  );
}

export interface InfoRow {
  label: string;
  value: ReactNode;
  /** Per-row override for the "not provided" placeholder. */
  emptyLabel?: string;
}

/**
 * Renders `value`, or a muted "Non renseigné" placeholder when the value is
 * null/undefined/empty-string/dash. This keeps the UI honest — the previous
 * "—" was ambiguous between "the backend hasn't sent that field" and "the
 * value is intentionally empty".
 */
function renderValue(value: ReactNode, placeholder = "Non renseigné"): ReactNode {
  if (value === null || value === undefined) return <Empty label={placeholder} />;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "" || trimmed === "—" || trimmed === "-")
      return <Empty label={placeholder} />;
  }
  return value;
}

function Empty({ label }: { label: string }) {
  return (
    <span className="italic text-[color:var(--muted-foreground)]">{label}</span>
  );
}

export function InfoGrid({ rows, columns = 2 }: { rows: InfoRow[]; columns?: number }) {
  return (
    <dl
      className="grid gap-x-6 gap-y-3"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {rows.map((row) => (
        <div key={row.label} className="flex flex-col gap-0.5">
          <dt className="text-xs uppercase tracking-wide text-[color:var(--muted-foreground)]">
            {row.label}
          </dt>
          <dd className="text-sm text-[color:var(--foreground)]">
            {renderValue(row.value, row.emptyLabel)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
