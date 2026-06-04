import { listPromoCodes } from "@/features/promo-codes/application/api";
import { PromoCodesListClient } from "@/features/promo-codes/presentation/promo-codes-list-client";
import { Card } from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";

export const dynamic = "force-dynamic";

export default async function PromoCodesPageRoute() {
  try {
    const result = await listPromoCodes();
    return (
      <PromoCodesListClient
        promoCodes={result.promoCodes}
        total={result.total}
      />
    );
  } catch (error) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Marketing"
          title="Codes promo"
          dataSource="live"
          dataSourceHint="Erreur de chargement depuis l'API."
        />
        <Card className="p-6">
          <p className="text-sm text-[color:var(--danger)]">
            Impossible de charger les codes promo :{" "}
            {error instanceof Error ? error.message : "erreur inconnue"}
          </p>
        </Card>
      </div>
    );
  }
}
