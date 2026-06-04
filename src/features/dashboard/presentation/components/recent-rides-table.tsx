import Link from "next/link";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { formatXof, formatRelative } from "@/shared/lib/format";
import {
  fullParty,
  rideStatusMeta,
  type AdminRide,
} from "@/features/rides/domain/admin-ride";

export interface RecentRidesTableProps {
  rides: AdminRide[];
  /** Hard cap on the table — defaults to 5. */
  limit?: number;
  /** Error returned by GET /api/admin/rides, if any. */
  error?: string;
}

/**
 * Dashboard widget: latest rides (any category). Reads from
 * `GET /api/admin/rides`. Sorted client-side by createdAt desc to be safe
 * even if the backend doesn't enforce ordering.
 */
export function RecentRidesTable({
  rides,
  limit = 5,
  error,
}: RecentRidesTableProps) {
  const sorted = [...rides]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, limit);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Courses récentes</CardTitle>
            <CardDescription>
              {sorted.length} dernières demandes — toutes catégories
              confondues.
            </CardDescription>
          </div>
          <Link
            href="/vtc/rides"
            className="text-xs font-medium text-[color:var(--primary)] hover:underline"
          >
            Tout voir
          </Link>
        </div>
      </CardHeader>
      {error ? (
        <p className="px-5 pb-5 text-sm text-[color:var(--danger)]">{error}</p>
      ) : sorted.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-[color:var(--muted-foreground)]">
          Aucune course aujourd&apos;hui.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-y border-[color:var(--border)] text-left text-xs uppercase tracking-wide text-[color:var(--muted-foreground)]">
                <th className="px-5 py-2.5 font-medium">Course</th>
                <th className="px-5 py-2.5 font-medium">Passager</th>
                <th className="px-5 py-2.5 font-medium">Driver</th>
                <th className="px-5 py-2.5 font-medium">Paiement</th>
                <th className="px-5 py-2.5 font-medium text-right">Prix</th>
                <th className="px-5 py-2.5 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((ride) => {
                const meta = rideStatusMeta(ride.status);
                return (
                  <tr
                    key={ride.rideId}
                    className="border-b border-[color:var(--border)] last:border-b-0 hover:bg-[color:var(--muted)]/40"
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/vtc/rides/${ride.rideId}`}
                        className="font-mono text-xs font-medium text-[color:var(--foreground)] hover:underline"
                      >
                        {ride.rideNumber}
                      </Link>
                      <p className="text-xs text-[color:var(--muted-foreground)]">
                        {ride.vehicleType} · {formatRelative(ride.createdAt)}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-[color:var(--foreground)]">
                      {fullParty(ride.passenger)}
                    </td>
                    <td className="px-5 py-3 text-[color:var(--muted-foreground)]">
                      {fullParty(ride.driver)}
                    </td>
                    <td className="px-5 py-3 text-xs text-[color:var(--muted-foreground)]">
                      {ride.paymentMethod}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-[color:var(--foreground)]">
                      {formatXof(ride.finalPrice || ride.estimatedPrice)}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
