"use client";

import { create } from "zustand";

export type Audience =
  | "ALL_PASSENGERS"
  | "ALL_DRIVERS"
  | "VIP_PASSENGERS"
  | "INACTIVE_30D"
  | "SEGMENT";

export type Channel = "PUSH" | "PUSH_SMS";

export interface BroadcastRow {
  id: string;
  title: string;
  audience: Audience;
  segmentLabel: string;
  sentAt: string;
  recipients: number;
  delivered: number;
  opened: number;
  channel: Channel;
}

export type TemplateCategory =
  | "Onboarding"
  | "Promo"
  | "Transactionnel"
  | "Réactivation";

export interface NotifTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  description: string;
  preview: string;
  usageCount: number;
}

const broadcastsSeed: BroadcastRow[] = [
  {
    id: "broadcast-0001",
    title: "Promo WEEKEND-2K active dès maintenant",
    audience: "ALL_PASSENGERS",
    segmentLabel: "Tous passagers",
    sentAt: "2026-04-26 18:30",
    recipients: 12478,
    delivered: 11941,
    opened: 6023,
    channel: "PUSH",
  },
  {
    id: "broadcast-0002",
    title: "Nouveau bonus driver : +500 FCFA / course après 22 h",
    audience: "ALL_DRIVERS",
    segmentLabel: "Tous drivers approuvés",
    sentAt: "2026-04-26 14:00",
    recipients: 132,
    delivered: 130,
    opened: 102,
    channel: "PUSH",
  },
  {
    id: "broadcast-0003",
    title: "On vous attend ! −30 % sur votre prochaine course",
    audience: "INACTIVE_30D",
    segmentLabel: "Passagers inactifs 30 j (n=2 184)",
    sentAt: "2026-04-25 10:15",
    recipients: 2184,
    delivered: 2103,
    opened: 412,
    channel: "PUSH_SMS",
  },
  {
    id: "broadcast-0004",
    title: "Mise à jour des conditions générales d'utilisation",
    audience: "ALL_PASSENGERS",
    segmentLabel: "Tous passagers",
    sentAt: "2026-04-22 09:00",
    recipients: 12302,
    delivered: 11876,
    opened: 4203,
    channel: "PUSH",
  },
];

const templatesSeed: NotifTemplate[] = [
  {
    id: "tpl-1",
    name: "Bienvenue passager",
    category: "Onboarding",
    description: "Envoyé à la fin du flow register",
    preview:
      "🎉 Bienvenue sur 4U / ForYou ! Profitez de −30 % sur votre première course avec WELCOME2026.",
    usageCount: 2147,
  },
  {
    id: "tpl-2",
    name: "Driver assigné",
    category: "Transactionnel",
    description: "Push automatique à l'acceptation d'une course",
    preview: "{{driverName}} arrive dans {{eta}} min. Plaque : {{plate}}.",
    usageCount: 18429,
  },
  {
    id: "tpl-3",
    name: "Course terminée — laissez une note",
    category: "Transactionnel",
    description: "Push 1 minute après le COMPLETED",
    preview: "Comment s'est passée votre course avec {{driverName}} ? Notez de 1 à 5 ⭐",
    usageCount: 14873,
  },
  {
    id: "tpl-4",
    name: "Réactivation 30 j",
    category: "Réactivation",
    description: "Cible passagers sans course depuis 30 jours",
    preview: "On vous a manqué ? Voici −1 500 FCFA sur votre prochaine course.",
    usageCount: 412,
  },
  {
    id: "tpl-5",
    name: "Promo week-end",
    category: "Promo",
    description: "Lance une campagne ponctuelle",
    preview: "Profitez de −2 000 FCFA dès 5 000 FCFA, du vendredi au dimanche.",
    usageCount: 187,
  },
  {
    id: "tpl-6",
    name: "Bonus driver soir",
    category: "Promo",
    description: "Booste les drivers en heures creuses",
    preview: "+500 FCFA bonus par course après 22 h ce week-end.",
    usageCount: 24,
  },
];

export interface ComposeBroadcastInput {
  title: string;
  body: string;
  audience: Audience;
  channel: Channel;
}

const AUDIENCE_LABEL: Record<Audience, string> = {
  ALL_PASSENGERS: "Tous passagers",
  ALL_DRIVERS: "Tous drivers approuvés",
  VIP_PASSENGERS: "Passagers VIP",
  INACTIVE_30D: "Passagers inactifs 30 j",
  SEGMENT: "Segment personnalisé",
};

const AUDIENCE_RECIPIENTS: Record<Audience, number> = {
  ALL_PASSENGERS: 12478,
  ALL_DRIVERS: 132,
  VIP_PASSENGERS: 84,
  INACTIVE_30D: 2184,
  SEGMENT: 0,
};

export interface NewTemplateInput {
  name: string;
  category: TemplateCategory;
  description: string;
  preview: string;
}

interface NotificationsStore {
  broadcasts: BroadcastRow[];
  templates: NotifTemplate[];
  sendBroadcast: (input: ComposeBroadcastInput) => string;
  resendBroadcast: (id: string) => string;
  removeBroadcast: (id: string) => void;
  createTemplate: (input: NewTemplateInput) => string;
  updateTemplate: (id: string, partial: Partial<NotifTemplate>) => void;
  removeTemplate: (id: string) => void;
}

export const useNotificationsStore = create<NotificationsStore>((set) => ({
  broadcasts: broadcastsSeed,
  templates: templatesSeed,
  sendBroadcast: (input) => {
    const id = `broadcast-${Math.random().toString(36).slice(2, 6)}`;
    const recipients = AUDIENCE_RECIPIENTS[input.audience];
    const sentAt = new Date()
      .toISOString()
      .slice(0, 16)
      .replace("T", " ");
    set((s) => ({
      broadcasts: [
        {
          id,
          title: input.title,
          audience: input.audience,
          segmentLabel: AUDIENCE_LABEL[input.audience],
          sentAt,
          recipients,
          delivered: Math.round(recipients * 0.96),
          opened: Math.round(recipients * 0.34),
          channel: input.channel,
        },
        ...s.broadcasts,
      ],
    }));
    return id;
  },
  resendBroadcast: (id) => {
    const newId = `broadcast-${Math.random().toString(36).slice(2, 6)}`;
    set((s) => {
      const original = s.broadcasts.find((b) => b.id === id);
      if (!original) return s;
      const sentAt = new Date()
        .toISOString()
        .slice(0, 16)
        .replace("T", " ");
      return {
        broadcasts: [{ ...original, id: newId, sentAt }, ...s.broadcasts],
      };
    });
    return newId;
  },
  removeBroadcast: (id) =>
    set((s) => ({ broadcasts: s.broadcasts.filter((b) => b.id !== id) })),
  createTemplate: (input) => {
    const id = `tpl-${Math.random().toString(36).slice(2, 5)}`;
    set((s) => ({
      templates: [{ id, usageCount: 0, ...input }, ...s.templates],
    }));
    return id;
  },
  updateTemplate: (id, partial) =>
    set((s) => ({
      templates: s.templates.map((t) => (t.id === id ? { ...t, ...partial } : t)),
    })),
  removeTemplate: (id) =>
    set((s) => ({ templates: s.templates.filter((t) => t.id !== id) })),
}));
