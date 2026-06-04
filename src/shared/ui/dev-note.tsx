import type { ReactNode } from "react";
import { ClipboardList } from "lucide-react";
import { cn } from "@/shared/lib/cn";

/**
 * Visual sticky-note style block reserved for developer reminders left in
 * the UI (typically a TODO that depends on a backend endpoint that doesn't
 * exist yet). Reads as "a note left for whoever picks this up next" — not
 * an explanation to the end user.
 */
export interface DevNoteProps {
  children: ReactNode;
  className?: string;
}

export function DevNote({ children, className }: DevNoteProps) {
  return (
    <aside
      role="note"
      aria-label="Note développeur"
      className={cn(
        "flex items-start gap-3 rounded-md border-l-4 border-amber-500 bg-amber-50/80 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
        className,
      )}
    >
      <ClipboardList className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
          TODO dev
        </span>
        <div className="leading-snug">{children}</div>
      </div>
    </aside>
  );
}
