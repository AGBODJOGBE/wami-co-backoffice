import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import { Skeleton, Spinner } from "@/shared/ui/spinner";

export default function VehicleDetailLoading() {
  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/vtc/vehicles"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-[color:var(--muted-foreground)] transition hover:text-[color:var(--foreground)]"
      >
        <ArrowLeft className="size-4" />
        Retour aux véhicules
      </Link>

      <div className="flex items-center gap-4 border-b border-[color:var(--border)] pb-6">
        <Skeleton className="size-14 rounded-xl" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Spinner label="Chargement…" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
