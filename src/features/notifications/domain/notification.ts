/**
 * Notifications domain. Mirrors:
 *   GET   /api/notifications
 *   GET   /api/notifications/stats
 *   PATCH /api/notifications/{id}/read
 */

export type NotificationChannel = "SMS" | "EMAIL" | "WEBSOCKET" | "PUSH";
export type NotificationStatus = "PENDING" | "SENT" | "DELIVERED" | "FAILED";
export type NotificationPriority = "LOW" | "NORMAL" | "HIGH" | "CRITICAL";

export interface NotificationItem {
  id: string;
  type: string;
  channel: NotificationChannel;
  message: string;
  status: NotificationStatus;
  priority: NotificationPriority;
  isRead: boolean;
  readAt: string | null;
  relatedEntity: { type: string; id: string } | null;
  sentAt: string | null;
  createdAt: string;
}

export interface NotificationHistory {
  notifications: NotificationItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface NotificationStats {
  counts: Record<NotificationStatus, number>;
  total: number;
  successRate: number;
  failureRate: number;
}

export const PRIORITY_META: Record<
  NotificationPriority,
  { label: string; tone: "neutral" | "info" | "warning" | "danger" }
> = {
  LOW: { label: "Faible", tone: "neutral" },
  NORMAL: { label: "Normale", tone: "info" },
  HIGH: { label: "Élevée", tone: "warning" },
  CRITICAL: { label: "Critique", tone: "danger" },
};
