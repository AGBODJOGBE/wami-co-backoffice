import "server-only";

// NOTE: GET /api/admin/ride-pricing/:vehicleType n'existe pas côté backend —
// uniquement PATCH. La fonction getActiveRidePricing a été supprimée.
// Pour charger une config de tarification, utiliser listPricingProfiles()
// ou getPricingProfile() depuis pricing-profiles-api.ts.
