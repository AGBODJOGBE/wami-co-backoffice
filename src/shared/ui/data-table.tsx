"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import {
  applyColumnFilter,
  ColumnFilterPopover,
  type ColumnFilterDef,
  type ColumnFilterValue,
} from "@/shared/ui/column-filter";
import { cn } from "@/shared/lib/cn";

export interface ColumnDef<TRow> {
  key: string;
  header: ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
  render: (row: TRow) => ReactNode;
  /** When set, the column header is sortable. */
  sortAccessor?: (row: TRow) => string | number | null | undefined;
  /** When set, the column header shows a filter popover. */
  filter?: {
    def: ColumnFilterDef;
    accessor: (row: TRow) => unknown;
  };
}

export interface DataTableProps<TRow> {
  columns: ColumnDef<TRow>[];
  rows: TRow[];
  rowKey: (row: TRow) => string;
  emptyMessage?: string;
  emptyState?: ReactNode;
  rowClassName?: string;
  /** Generate a destination URL when a row is clicked (excluding clicks on buttons / links / dropdowns). */
  rowHref?: (row: TRow) => string;
  /** Callback when the row is clicked (excluding clicks on buttons/links). Mutually exclusive with `rowHref`. */
  onRowClick?: (row: TRow) => void;
  defaultSort?: { key: string; direction: "asc" | "desc" };
  /** Notify parent of currently visible rows after sort+filter. */
  onVisibleChange?: (rows: TRow[]) => void;
}

type SortState = { key: string; direction: "asc" | "desc" } | null;

export function DataTable<TRow>({
  columns,
  rows,
  rowKey,
  emptyMessage = "Aucun résultat.",
  emptyState,
  rowClassName,
  rowHref,
  onRowClick,
  defaultSort = undefined,
  onVisibleChange,
}: DataTableProps<TRow>) {
  const router = useRouter();
  const [sort, setSort] = useState<SortState>(defaultSort ?? null);
  const [filters, setFilters] = useState<Record<string, ColumnFilterValue>>({});

  const visible = useMemo(() => {
    let result = rows;

    for (const col of columns) {
      const f = filters[col.key];
      if (!f || !col.filter) continue;
      result = result.filter((row) => applyColumnFilter(f, col.filter!.accessor, row));
    }

    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col?.sortAccessor) {
        const dir = sort.direction === "asc" ? 1 : -1;
        result = [...result].sort((a, b) => {
          const av = col.sortAccessor!(a);
          const bv = col.sortAccessor!(b);
          if (av == null && bv == null) return 0;
          if (av == null) return 1;
          if (bv == null) return -1;
          if (typeof av === "number" && typeof bv === "number")
            return (av - bv) * dir;
          return String(av).localeCompare(String(bv)) * dir;
        });
      }
    }

    return result;
  }, [rows, columns, filters, sort]);

  useEffect(() => {
    onVisibleChange?.(visible);
  }, [visible, onVisibleChange]);

  function toggleSort(key: string) {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, direction: "asc" };
      if (prev.direction === "asc") return { key, direction: "desc" };
      return null;
    });
  }

  function handleRowClick(e: React.MouseEvent<HTMLTableRowElement>, row: TRow) {
    if (!rowHref && !onRowClick) return;
    const target = e.target as HTMLElement;
    if (
      target.closest(
        'button, a, [role="menuitem"], input, select, textarea, [data-no-row-click]',
      )
    ) {
      return;
    }
    if (rowHref) router.push(rowHref(row));
    else if (onRowClick) onRowClick(row);
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-y border-[color:var(--border)] text-left text-xs uppercase tracking-wide text-[color:var(--muted-foreground)]">
            {columns.map((col) => {
              const isSorted = sort?.key === col.key;
              const direction = isSorted ? sort!.direction : null;
              const sortable = !!col.sortAccessor;
              const filterable = !!col.filter;
              const SortIcon = direction === "asc" ? ArrowUp : direction === "desc" ? ArrowDown : ArrowUpDown;
              return (
                <th
                  key={col.key}
                  className={cn(
                    "px-5 py-2.5 font-medium",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                    col.className,
                  )}
                >
                  <div
                    className={cn(
                      "inline-flex items-center gap-1.5",
                      col.align === "right" && "justify-end",
                      col.align === "center" && "justify-center",
                    )}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className={cn(
                          "inline-flex items-center gap-1 transition",
                          isSorted
                            ? "text-[color:var(--foreground)]"
                            : "hover:text-[color:var(--foreground)]",
                        )}
                      >
                        <span>{col.header}</span>
                        <SortIcon
                          className={cn(
                            "size-3",
                            isSorted
                              ? "text-[color:var(--primary)]"
                              : "opacity-60",
                          )}
                        />
                      </button>
                    ) : (
                      <span>{col.header}</span>
                    )}
                    {filterable ? (
                      <ColumnFilterPopover
                        def={col.filter!.def}
                        value={filters[col.key] ?? null}
                        onChange={(v) =>
                          setFilters((prev) => ({ ...prev, [col.key]: v }))
                        }
                      />
                    ) : null}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {visible.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                {emptyState ?? (
                  <p className="px-5 py-12 text-center text-sm text-[color:var(--muted-foreground)]">
                    {emptyMessage}
                  </p>
                )}
              </td>
            </tr>
          ) : (
            visible.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={(e) => handleRowClick(e, row)}
                className={cn(
                  "border-b border-[color:var(--border)] transition last:border-b-0",
                  rowHref || onRowClick
                    ? "cursor-pointer hover:bg-[color:var(--muted)]/60"
                    : "hover:bg-[color:var(--muted)]/40",
                  rowClassName,
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-5 py-3 align-middle",
                      col.align === "right" && "text-right",
                      col.align === "center" && "text-center",
                      col.className,
                    )}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function PaginationFooter({
  total,
  shown,
  page,
  totalPages,
  onPrev,
  onNext,
  className,
  ...props
}: {
  total: number;
  shown: number;
  page?: number;
  totalPages?: number;
  onPrev?: () => void;
  onNext?: () => void;
} & HTMLAttributes<HTMLDivElement>) {
  const hasPagination = onPrev !== undefined && onNext !== undefined;
  const isPrevDisabled = !hasPagination || (page ?? 1) <= 1;
  const isNextDisabled = !hasPagination || (page ?? 1) >= (totalPages ?? 1);

  return (
    <div
      className={cn(
        "flex items-center justify-between border-t border-[color:var(--border)] px-5 py-3 text-xs text-[color:var(--muted-foreground)]",
        className,
      )}
      {...props}
    >
      <span>
        {shown} sur {total} résultat{total !== 1 ? "s" : ""}
        {hasPagination && totalPages && totalPages > 1
          ? ` — page ${page ?? 1} / ${totalPages}`
          : null}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onPrev}
          disabled={isPrevDisabled}
          className="rounded-md px-3 py-1.5 hover:bg-[color:var(--muted)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Précédent
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={isNextDisabled}
          className="rounded-md px-3 py-1.5 hover:bg-[color:var(--muted)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Suivant
        </button>
      </div>
    </div>
  );
}
