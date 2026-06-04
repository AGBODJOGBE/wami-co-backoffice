import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/shared/ui/layout/logo";

export interface AuthCardProps {
  title: string;
  description?: string;
  footer?: ReactNode;
  children: ReactNode;
}

export function AuthCard({ title, description, footer, children }: AuthCardProps) {
  return (
    <div className="flex w-full max-w-md flex-col gap-6 rounded-2xl border border-[color:var(--border)] bg-white p-8 shadow-xl shadow-[color:var(--primary-soft)]/40 dark:bg-[color:var(--muted)]">
      <Link href="/" aria-label="ForYouBoard">
        <Logo />
      </Link>

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-[color:var(--foreground)]">
          {title}
        </h1>
        {description ? (
          <p className="text-sm text-[color:var(--muted-foreground)]">{description}</p>
        ) : null}
      </div>

      {children}

      {footer ? (
        <div className="border-t border-[color:var(--border)] pt-4 text-center text-sm text-[color:var(--muted-foreground)]">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
