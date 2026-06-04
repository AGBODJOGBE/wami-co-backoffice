import { getAdminRide } from "@/features/rides/application/api";
import { RideDetailClient } from "@/features/rides/presentation/ride-detail-client";
import { DetailNotFound } from "@/shared/ui/detail-header";
import { ApiError } from "@/shared/lib/api/types";

export const dynamic = "force-dynamic";

export default async function VtcRideDetailPage({
  params,
}: {
  params: Promise<{ rideId: string }>;
}) {
  const { rideId } = await params;

  try {
    const ride = await getAdminRide(rideId);
    return <RideDetailClient ride={ride} />;
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.status === 404
          ? "Course introuvable."
          : `${error.status} — ${error.message}`
        : error instanceof Error
          ? error.message
          : "Erreur inconnue.";
    return (
      <DetailNotFound
        backHref="/vtc/rides"
        backLabel="Retour aux courses"
        message={message}
      />
    );
  }
}
