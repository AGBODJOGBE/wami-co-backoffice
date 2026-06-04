import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightSlot?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, leftIcon, rightSlot, className, id, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const describedBy = error ? `${inputId}-err` : hint ? `${inputId}-hint` : undefined;

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
      <div
        className={cn(
          "relative flex h-10 items-center gap-2 rounded-lg border bg-[color:var(--background)] px-3 transition focus-within:ring-2 focus-within:ring-offset-1 focus-within:ring-offset-[color:var(--background)]",
          error
            ? "border-[color:var(--danger)] focus-within:ring-[color:var(--danger)]"
            : // Required + empty after interaction → red border (native :user-invalid)
              "border-[color:var(--border)] focus-within:border-[color:var(--primary)] focus-within:ring-[color:var(--primary)] has-[input:user-invalid]:border-[color:var(--danger)] has-[input:user-invalid]:focus-within:ring-[color:var(--danger)]",
        )}
      >
        {leftIcon ? (
          <span className="flex size-5 shrink-0 items-center justify-center text-[color:var(--muted-foreground)]">
            {leftIcon}
          </span>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "h-full w-full bg-transparent text-sm text-[color:var(--foreground)] placeholder:text-[color:var(--muted-foreground)] focus:outline-none",
            className,
          )}
          {...props}
        />
        {rightSlot ? (
          // z-20 + isolate keeps the slot above any browser/password-manager
          // overlay that gets injected near password fields on real HTTPS
          // origins (1Password, LastPass, Bitwarden, Chrome's own "show
          // password" button on some platforms). Without this the toggle
          // button stops receiving clicks once the page is served from
          // ngrok / production while it still works on localhost.
          <span className="relative z-20 isolate shrink-0">{rightSlot}</span>
        ) : null}
      </div>
      {error ? (
        <p id={`${inputId}-err`} className="text-xs text-[color:var(--danger)]">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-xs text-[color:var(--muted-foreground)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
