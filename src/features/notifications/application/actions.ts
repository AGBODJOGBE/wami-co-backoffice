"use server";

import { revalidatePath } from "next/cache";
import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";

export async function markNotificationReadAction(
  notificationId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await apiFetch<unknown>(API_ROUTES.notifications.markRead(notificationId), {
      method: "PATCH",
    });
    revalidatePath("/notifications");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue" };
  }
}
