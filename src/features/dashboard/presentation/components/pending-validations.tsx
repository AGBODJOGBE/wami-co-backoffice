import { ChevronRight, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import {
  fullName,
  relativeTime,
  type PendingDriver,
} from "@/features/drivers/domain/admin-driver";

export interface PendingValidationsProps {
  drivers: PendingDriver[];
  /** Error returned by GET /api/admin/drivers/pending, if any. */
  error?: string;
  /** Hard cap on the list — defaults to 5 to keep the card scannable. */
  limit?: number;
}

/**
 * Sidebar card listing drivers awaiting KYC. Data comes from
 * `GET /api/admin/drivers/pending` (pre-enriched with names server-side when
 * `GET /api/admin/drivers` is available — falls back to `Driver #xxxxxxxx`).
 */
export function PendingValidations({
  drivers,
  error,
  limit = 5,
}: PendingValidationsProps) {
  const visible = drivers.slice(0, limit);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="size-4 text-[color:var(--warning)]" />
            <CardTitle>Validations en attente</CardTitle>
            {drivers.length > 0 ? (
              <Badge tone="warning">{drivers.length}</Badge>
            ) : null}
          </div>
          <Link
            href="/vtc/drivers?status=PENDING"
            className="text-xs font-medium text-[color:var(--primary)] hover:underline"
          >
            Tout voir
          </Link>
        </div>
        <CardDescription>
          Drivers en attente de KYC — pièces et catégorie à valider.
        </CardDescription>
      </CardHeader>
      {error ? (
        <p className="px-5 pb-5 text-xs text-[color:var(--danger)]">{error}</p>
      ) : visible.length === 0 ? (
        <p className="px-5 pb-5 text-xs text-[color:var(--muted-foreground)]">
          Aucun driver en attente — tout est à jour 🎉
        </p>
      ) : (
        <ul className="flex flex-col">
          {visible.map((driver) => {
            const name =
              fullName(driver) || `Driver #${driver.driverId.slice(0, 8)}`;
            return (
              <li key={driver.driverId}>
                <Link
                  href={`/vtc/drivers/${driver.driverId}`}
                  className="flex items-center gap-3 border-t border-[color:var(--border)] px-5 py-3 first:border-t-0 hover:bg-[color:var(--muted)]/40"
                >
                  <Avatar name={name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[color:var(--foreground)]">
                      {name}
                    </p>
                    <p className="text-xs text-[color:var(--muted-foreground)]">
                      {driver.category}
                      {driver.phoneNumber ? ` · ${driver.phoneNumber}` : ""}
                      {" · "}
                      {relativeTime(driver.createdAt)}
                    </p>
                  </div>
                  <Badge tone={driver.isDocumentsVerified ? "info" : "warning"}>
                    {driver.isDocumentsVerified
                      ? "Docs OK"
                      : "Docs à vérifier"}
                  </Badge>
                  <ChevronRight className="size-4 text-[color:var(--muted-foreground)]" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
