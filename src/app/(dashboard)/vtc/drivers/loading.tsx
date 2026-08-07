import { Card } from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";
import { Skeleton, Spinner } from "@/shared/ui/spinner";

export default function DriversLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Opérations VTC"
        title="Pilotes"
        dataSource="partial"
        description="Validation KYC en temps réel — approuver, suspendre, réactiver un pilote."
      />

      <div className="flex gap-2 border-b border-[color:var(--border)]">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-8 w-44" />
      </div>

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
        <Spinner label="Chargement des pilotes en attente…" />
      </Card>
    </div>
  );
}
