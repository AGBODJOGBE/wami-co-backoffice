/**
 * Tiny client-side CSV exporter. Quotes a value per RFC 4180 — wraps in
 * double-quotes and doubles internal quotes whenever the value contains
 * `"`, `,`, `;`, `\n` or `\r`. Anything else is written as-is.
 *
 * Usage:
 *   downloadCsv("vehicles.csv", [
 *     { key: "id", header: "ID", value: (r) => r.id },
 *     { key: "plate", header: "Plaque", value: (r) => r.licensePlate },
 *   ], rows);
 */

export interface CsvColumn<TRow> {
  key: string;
  header: string;
  value: (row: TRow) => string | number | boolean | null | undefined;
}

const NEEDS_QUOTING = /[",;\r\n]/;

function quote(input: string): string {
  if (!NEEDS_QUOTING.test(input)) return input;
  return `"${input.replace(/"/g, '""')}"`;
}

function stringify(v: ReturnType<CsvColumn<unknown>["value"]>): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

export function buildCsv<TRow>(
  columns: readonly CsvColumn<TRow>[],
  rows: readonly TRow[],
): string {
  const headerLine = columns.map((c) => quote(c.header)).join(",");
  const lines = rows.map((row) =>
    columns.map((c) => quote(stringify(c.value(row)))).join(","),
  );
  // Prepend BOM so Excel correctly reads UTF-8 accents.
  return "﻿" + [headerLine, ...lines].join("\r\n");
}

export function downloadCsv<TRow>(
  filename: string,
  columns: readonly CsvColumn<TRow>[],
  rows: readonly TRow[],
): void {
  const csv = buildCsv(columns, rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Free the blob URL on the next microtask so Safari has time to trigger
  // the download.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function timestampedFilename(prefix: string): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${prefix}-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.csv`;
}
