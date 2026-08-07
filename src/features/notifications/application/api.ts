import "server-only";

import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import type { NotificationHistory, NotificationStats } from "../domain/notification";

export interface ListNotificationsParams {
  recipientId?: string;
  page?: number;
  limit?: number;
}

export async function getNotificationHistory(
  params?: ListNotificationsParams,
): Promise<NotificationHistory> {
  const empty: NotificationHistory = { notifications: [], total: 0, page: 1, limit: 20, totalPages: 0 };
  const query: Record<string, string | number | undefined> = {
    page:  params?.page  ?? 1,
    limit: params?.limit ?? 50,
  };
  if (params?.recipientId) query.recipientId = params.recipientId;

  try {
    const raw = await apiFetch<unknown>(API_ROUTES.notifications.list(), { query });
    if (!raw || typeof raw !== "object") return empty;
    const r = raw as Record<string, unknown>;
    const data = (r.data ?? r) as Record<string, unknown>;
    const notifications = Array.isArray(data.notifications) ? data.notifications : [];
    return {
      notifications,
      total:      typeof data.total      === "number" ? data.total      : notifications.length,
      page:       typeof data.page       === "number" ? data.page       : 1,
      limit:      typeof data.limit      === "number" ? data.limit      : 50,
      totalPages: typeof data.totalPages === "number" ? data.totalPages : 1,
    };
  } catch {
    return empty;
  }
}

export async function getNotificationStats(): Promise<NotificationStats> {
  const empty: NotificationStats = {
    counts: { PENDING: 0, SENT: 0, DELIVERED: 0, FAILED: 0 },
    total: 0,
    successRate: 0,
    failureRate: 0,
  };
  try {
    const raw = await apiFetch<unknown>(API_ROUTES.notifications.stats());
    if (!raw || typeof raw !== "object") return empty;
    const r = raw as Record<string, unknown>;
    const data = (r.data ?? r) as Record<string, unknown>;
    return {
      counts:      (data.counts      ?? empty.counts)      as NotificationStats["counts"],
      total:       (data.total       ?? 0)                 as number,
      successRate: (data.successRate ?? 0)                 as number,
      failureRate: (data.failureRate ?? 0)                 as number,
    };
  } catch {
    return empty;
  }
}
