"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/shared/lib/cn";

export interface CopyButtonProps {
  value: string;
  /** Visible label; defaults to the value itself. */
  label?: string;
  /** ARIA-friendly title shown on hover; defaults to "Copier l'identifiant". */
  title?: string;
  className?: string;
  /** Visual variant — `chip` is the small mono-uppercase pill used in headers. */
  variant?: "chip" | "inline";
}

/**
 * Tiny copy-to-clipboard button. Defaults to the "chip" look used to surface
 * UUIDs in detail-page headers without polluting the main copy.
 */
export function CopyButton({
  value,
  label,
  title = "Copier l'identifiant",
  className,
  variant = "chip",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  function copy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  }

  const base =
    variant === "chip"
      ? "inline-flex items-center gap-1 rounded-md border border-[color:var(--border)] bg-[color:var(--muted)]/40 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-[color:var(--muted-foreground)] transition hover:bg-[color:var(--muted)] hover:text-[color:var(--foreground)] cursor-pointer"
      : "inline-flex items-center gap-1 text-xs text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] cursor-pointer";

  return (
    <button
      type="button"
      onClick={copy}
      title={copied ? "Copié !" : title}
      className={cn(base, className)}
    >
      {copied ? (
        <Check className="size-3 text-[color:var(--success)]" />
      ) : (
        <Copy className="size-3" />
      )}
      <span>{label ?? value}</span>
    </button>
  );
}

/** Convenience: short ID chip — "ID #abcdef12". */
export function CopyableId({
  id,
  prefix = "ID",
  title,
}: {
  id: string;
  prefix?: string;
  title?: string;
}) {
  return (
    <CopyButton
      value={id}
      label={`${prefix} #${id.slice(0, 8)}`}
      title={title ?? `Copier l'identifiant complet (${id})`}
    />
  );
}
