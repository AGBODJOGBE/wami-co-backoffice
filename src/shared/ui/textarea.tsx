import { forwardRef, useId, type TextareaHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ label, hint, error, className, id, ...props }, ref) {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    return (
      <div className="flex flex-col gap-1.5">
        {label ? (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-[color:var(--foreground)]"
          >
            {label}
          </label>
        ) : null}
        <textarea
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          className={cn(
            "min-h-24 rounded-lg border bg-[color:var(--background)] px-3 py-2.5 text-sm text-[color:var(--foreground)] placeholder:text-[color:var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-[color:var(--background)]",
            error
              ? "border-[color:var(--danger)] focus:ring-[color:var(--danger)]"
              : "border-[color:var(--border)] focus:border-[color:var(--primary)] focus:ring-[color:var(--primary)] user-invalid:border-[color:var(--danger)] user-invalid:focus:ring-[color:var(--danger)]",
            className,
          )}
          {...props}
        />
        {error ? (
          <p className="text-xs text-[color:var(--danger)]">{error}</p>
        ) : hint ? (
          <p className="text-xs text-[color:var(--muted-foreground)]">{hint}</p>
        ) : null}
      </div>
    );
  },
);
