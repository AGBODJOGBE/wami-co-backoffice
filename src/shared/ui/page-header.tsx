import type { ReactNode } from "react";
import { DataSourceBadge, type DataSource } from "./data-source-badge";

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  eyebrow?: string;
  /**
   * Tag indicating whether this screen is fully wired to the backend or still
   * uses seed/mocked data. Helps spot non-dynamic UIs at a glance.
   */
  dataSource?: DataSource;
  dataSourceHint?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  dataSource,
  dataSourceHint,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-[color:var(--border)] pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-1">
        {eyebrow ? (
          <span className="text-xs font-medium uppercase tracking-widest text-[color:var(--muted-foreground)]">
            {eyebrow}
          </span>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold text-[color:var(--foreground)]">
            {title}
          </h1>
          {dataSource ? (
            <DataSourceBadge source={dataSource} hint={dataSourceHint} />
          ) : null}
        </div>
        {description ? (
          <p className="max-w-2xl text-sm text-[color:var(--muted-foreground)]">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
