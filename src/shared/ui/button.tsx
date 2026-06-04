import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/shared/lib/cn";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-[color:var(--primary)] text-[color:var(--primary-foreground)] hover:opacity-90 focus-visible:ring-[color:var(--primary)]",
  secondary:
    "bg-[color:var(--secondary)] text-[color:var(--secondary-foreground)] hover:opacity-90 focus-visible:ring-[color:var(--secondary)]",
  outline:
    "border border-[color:var(--foreground)]/30 bg-transparent text-[color:var(--foreground)] hover:border-[color:var(--foreground)]/60 hover:bg-[color:var(--muted)] focus-visible:ring-[color:var(--primary)]",
  ghost:
    "bg-transparent text-[color:var(--foreground)] hover:bg-[color:var(--muted)] focus-visible:ring-[color:var(--primary)]",
  danger:
    "bg-[color:var(--danger)] text-white hover:opacity-90 focus-visible:ring-[color:var(--danger)]",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      fullWidth = false,
      className,
      children,
      disabled,
      type = "button",
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--background)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && "w-full",
          className,
        )}
        {...props}
      >
        {isLoading ? <Loader2 className="size-4 animate-spin" /> : null}
        {children}
      </button>
    );
  },
);
