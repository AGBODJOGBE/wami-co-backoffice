import type { LucideIcon } from "lucide-react";
import { Card } from "@/shared/ui/card";

export interface ComingSoonProps {
  icon: LucideIcon;
  title: string;
  description: string;
  endpoints: string[];
}

export function ComingSoon({
  icon: Icon,
  title,
  description,
  endpoints,
}: ComingSoonProps) {
  return (
    <Card className="flex flex-col items-start gap-5 border-dashed p-8 text-left">
      <span className="flex size-12 items-center justify-center rounded-xl bg-[color:var(--primary-soft)] text-[color:var(--primary)]">
        <Icon className="size-6" />
      </span>
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-[color:var(--foreground)]">
          {title}
        </h2>
        <p className="max-w-xl text-sm text-[color:var(--muted-foreground)]">
          {description}
        </p>
      </div>
      <div className="w-full">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
          Endpoints à câbler (Swagger)
        </p>
        <ul className="flex flex-col gap-1.5">
          {endpoints.map((endpoint) => (
            <li
              key={endpoint}
              className="rounded-md bg-[color:var(--muted)] px-3 py-1.5 font-mono text-xs text-[color:var(--foreground)]"
            >
              {endpoint}
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
