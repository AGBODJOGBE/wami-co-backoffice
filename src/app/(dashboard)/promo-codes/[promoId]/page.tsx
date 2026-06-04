import { redirect } from "next/navigation";

/**
 * No detail endpoint is exposed by the backend yet (no
 * `GET /api/admin/promo-codes/{id}`). Until then, redirect any deep
 * link back to the list.
 */
export default async function PromoCodeDetailPageRoute() {
  redirect("/promo-codes");
}
