import { cn } from "@/shared/lib/cn";

export interface LogoProps {
  variant?: "light" | "dark";
  className?: string;
}

export function Logo({ variant = "light", className }: LogoProps) {
  const isDark = variant === "dark";
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "flex size-9 items-center justify-center rounded-lg font-bold",
          isDark
            ? "bg-[color:var(--secondary)] text-[color:var(--secondary-foreground)]"
            : "bg-[color:var(--primary)] text-[color:var(--primary-foreground)]",
        )}
      >
        4U
      </div>
      <div className="leading-tight">
        <p
          className={cn(
            "text-[10px] font-medium uppercase tracking-widest",
            isDark
              ? "text-white/60"
              : "text-[color:var(--muted-foreground)]",
          )}
        >
          4U / ForYou
        </p>
        <p
          className={cn(
            "text-base font-semibold",
            isDark ? "text-white" : "text-[color:var(--foreground)]",
          )}
        >
          ForYouBoard
        </p>
      </div>
    </div>
  );
}
