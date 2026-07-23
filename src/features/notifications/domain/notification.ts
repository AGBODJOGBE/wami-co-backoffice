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
  LOW:      { label: "Faible",   tone: "neutral" },
  NORMAL:   { label: "Normale",  tone: "info"    },
  HIGH:     { label: "Élevée",   tone: "warning" },
  CRITICAL: { label: "Critique", tone: "danger"  },
};

export const CHANNEL_META: Record<
  NotificationChannel,
  { label: string; tone: "neutral" | "info" | "primary" | "success" }
> = {
  SMS:       { label: "SMS",       tone: "neutral" },
  EMAIL:     { label: "Email",     tone: "info"    },
  WEBSOCKET: { label: "WebSocket", tone: "primary" },
  PUSH:      { label: "Push FCM",  tone: "success" },
};

export const STATUS_META: Record<
  NotificationStatus,
  { label: string; tone: "neutral" | "warning" | "success" | "danger" }
> = {
  PENDING:   { label: "En attente", tone: "warning" },
  SENT:      { label: "Envoyée",    tone: "info" as "neutral" },
  DELIVERED: { label: "Livrée",     tone: "success" },
  FAILED:    { label: "Échouée",    tone: "danger"  },
};

// Domaines de types pour le filtre
export const NOTIFICATION_TYPE_GROUPS: { label: string; types: string[] }[] = [
  { label: "Courses VTC",       types: ["RIDE_REQUESTED","DRIVER_ASSIGNED","DRIVER_EN_ROUTE","DRIVER_ARRIVED","RIDE_STARTED","RIDE_COMPLETED","RIDE_CANCELLED","NO_DRIVER_FOUND","NEGATIVE_BALANCE_ALERT"] },
  { label: "Livraison B2C",     types: ["B2C_DELIVERY_ORDER_CREATED","B2C_DRIVER_ASSIGNED","B2C_PARCEL_COLLECTED","B2C_DELIVERY_COMPLETED","B2C_DELIVERY_FAILED","B2C_DELIVERY_ORDER_CANCELLED"] },
  { label: "Livraison B2B",     types: ["ORDER_CREATED","ORDER_ASSIGNED","ORDER_CANCELLED","DELIVERY_COMPLETED","DELIVERY_FAILED","ROUND_CREATED","ROUND_COMPLETED"] },
  { label: "Contrats",          types: ["CONTRACT_CREATED","INSTALLMENT_PAID","INSTALLMENT_UNPAID","INSTALLMENT_REMINDER","DRIVER_BLOCKED","DRIVER_UNBLOCKED","CONTRACT_TERMINATED","CONTRACT_BROKEN"] },
  { label: "Wallet",            types: ["WALLET_RECHARGED","WALLET_RECHARGE_FAILED","WITHDRAWAL_COMPLETED","WITHDRAWAL_FAILED","P2P_TRANSFER_SENT","P2P_TRANSFER_RECEIVED","BALANCE_CONSOLIDATED"] },
  { label: "Partenaire",        types: ["PARTNER_VALIDATED","PARTNER_SUSPENDED","LOW_BALANCE_ALERT","INVOICE_GENERATED","DISPUTE_OPENED","DISPUTE_RESOLVED"] },
];
