import { Card } from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";
import { Skeleton, Spinner } from "@/shared/ui/spinner";

export default function VehiclesLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Référentiel VTC"
        title="Véhicules"
        dataSource="live"
        description="Voitures, motos et tricycles enregistrés sur la plateforme."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-7 w-16" />
            <Skeleton className="mt-2 h-3 w-32" />
          </Card>
        ))}
      </section>

      <Card className="flex items-center justify-center p-12">
        <Spinner label="Chargement des véhicules…" />
      </Card>
    </div>
  );
}
