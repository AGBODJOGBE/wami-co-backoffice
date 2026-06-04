import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/shared/lib/cn";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  label?: string;
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { options, label, placeholder, className, id, ...props },
  ref,
) {
  return (
    <label
      htmlFor={id}
      className={cn("flex flex-col gap-1.5", label ? "" : "")}
    >
      {label ? (
        <span className="text-sm font-medium text-[color:var(--foreground)]">
          {label}
        </span>
      ) : null}
      <span className="relative">
        <select
          ref={ref}
          id={id}
          className={cn(
            "h-10 w-full appearance-none rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] pl-3 pr-9 text-sm text-[color:var(--foreground)] transition focus:border-[color:var(--primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)] focus:ring-offset-1 focus:ring-offset-[color:var(--background)]",
            className,
          )}
          {...props}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--muted-foreground)]" />
      </span>
    </label>
  );
});
