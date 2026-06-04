import "server-only";

import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import type { SurgeRule } from "../domain/surge";

function withId(p: Record<string, unknown>): SurgeRule {
  const id =
    (p.id as string | undefined) ??
    (p._id as string | undefined) ??
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
  return arr.map((r) => withId(r as Record<string, unknown>));
}
