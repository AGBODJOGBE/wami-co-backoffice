const xofFormatter = new Intl.NumberFormat("fr-FR", {
  style: "decimal",
  maximumFractionDigits: 0,
});

export function formatXof(amount: number): string {
  return `${xofFormatter.format(amount)} FCFA`;
}

// All dates rendered as JJ/MM/AAAA (numeric, French convention).
// `dateStyle: "medium"` would render "12 mai 2026" — we explicitly want the
// numeric DD/MM/YYYY everywhere so we use day/month/year.
const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const dateLongFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

function asDate(input: Date | string | null | undefined): Date | null {
  if (!input) return null;
  const d = input instanceof Date ? input : new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "30/04/2026" */
export function formatDate(input: Date | string | null | undefined): string {
  const d = asDate(input);
  return d ? dateFormatter.format(d) : "—";
}

/** "30/04/2026 14:32" */
export function formatDateTime(
  input: Date | string | null | undefined,
): string {
  const d = asDate(input);
  return d ? dateTimeFormatter.format(d) : "—";
}

/** "30 avril 2026" — réservé aux libellés descriptifs (legal, footer, etc.). */
export function formatDateLong(
  input: Date | string | null | undefined,
): string {
  const d = asDate(input);
  return d ? dateLongFormatter.format(d) : "—";
}

const relativeFormatter = new Intl.RelativeTimeFormat("fr-FR", {
  numeric: "auto",
});

export function formatRelative(input: Date | string): string {
  const date = input instanceof Date ? input : new Date(input);
  const diffMs = date.getTime() - Date.now();
  const diffMin = Math.round(diffMs / 60_000);
  if (Math.abs(diffMin) < 60) return relativeFormatter.format(diffMin, "minute");
  const diffHour = Math.round(diffMin / 60);
  if (Math.abs(diffHour) < 24) return relativeFormatter.format(diffHour, "hour");
  const diffDay = Math.round(diffHour / 24);
  return relativeFormatter.format(diffDay, "day");
}
