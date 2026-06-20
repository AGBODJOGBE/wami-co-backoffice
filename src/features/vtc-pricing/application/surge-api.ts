import "server-only";

import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import type { SurgeRule } from "../domain/surge";

function withId(p: Record<string, unknown>): SurgeRule {
  // Backend routes PATCH/DELETE on _id (MongoDB ObjectId), not the UUID field.
  // Prefer _id so update/delete calls land on the right document.
  const id =
    (p._id as string | undefined) ??
    (p.id as string | undefined) ??
    (p.ruleId as string | undefined) ??
    "";
  return { ...p, id } as unknown as SurgeRule;
}

export async function listSurgeRules(): Promise<SurgeRule[]> {
  const raw = await apiFetch<unknown>(API_ROUTES.adminSurge.list());
  const arr: unknown[] = Array.isArray(raw)
    ? (raw as unknown[])
    : raw && typeof raw === "object"
      ? ((raw as { rules?: unknown[]; data?: unknown[] }).rules ??
        (raw as { rules?: unknown[]; data?: unknown[] }).data ??
        [])
      : [];
  if (arr.length > 0) {
    console.log("[surge] first rule raw keys:", Object.keys(arr[0] as object));
    console.log("[surge] first rule raw:", JSON.stringify(arr[0]));
  }
  return arr.map((r) => withId(r as Record<string, unknown>));
}
