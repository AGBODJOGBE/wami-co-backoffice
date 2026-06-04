import { Search } from "lucide-react";
import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

export interface SearchFieldProps extends InputHTMLAttributes<HTMLInputElement> {}

export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(
  function SearchField({ className, placeholder = "Rechercher…", ...props }, ref) {
    return (
      <div
        className={cn(
          "flex h-10 items-center gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 transition focus-within:border-[color:var(--primary)] focus-within:ring-2 focus-within:ring-[color:var(--primary)]",
          className,
        )}
      >
        <Search className="size-4 shrink-0 text-[color:var(--muted-foreground)]" />
        <input
          ref={ref}
          type="search"
          placeholder={placeholder}
          className="h-full w-full bg-transparent text-sm text-[color:var(--foreground)] placeholder:text-[color:var(--muted-foreground)] focus:outline-none"
          {...props}
        />
      </div>
    );
  },
);
