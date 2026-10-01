import type { LucideIcon } from "lucide-react";
import {
  Calculator,
  CalendarClock,
  FileText,
  Navigation,
  Radar,
  Settings2,
  ShieldAlert,
  Timer,
} from "lucide-react";

/**
 * Regroupement des clés `SystemConfig` affichées dans "Paramètres système"
 * (`/settings`).
 *
 * Le backend fournit désormais lui-même, pour toute clé spécifiée
 * (`SystemConfigItem.hasSpec === true`) : `module`, `label`, `description`,
 * `unit`, `min`/`max`/`allowedValues`/`mustDivide`, `displayValue` et
 * `withinBounds` — c'est la source de vérité pour le CONTENU affiché à
 * l'admin (voir `SystemConfigRow` dans `platform-tab.tsx`). Ce fichier ne
 * porte donc plus aucun libellé ni description écrits à la main : il ne
 * fait plus que du REGROUPEMENT visuel, par-dessus les données serveur.
 *
 * Le `module` backend est volontairement grossier (4 valeurs seulement —
 * `ride`, `contract`, `pricing`, `promo-code` — vérifié dans les 8 fichiers
 * de specs : `ride` a` lui seul couvre présence temps réel, dispatch,
 * réservations ET frais d'approche). Le regroupement par préfixe ci-dessous
 * reste donc plus utile à l'admin ; le `module` backend ne sert que de
 * repli pour une clé dont le préfixe n'est pas encore reconnu ici — jamais
 * pour masquer une clé.
 */

export interface SystemConfigGroupMeta {
  id: string;
  label: string;
  icon: LucideIcon;
}

export const SYSTEM_CONFIG_GROUPS: Record<string, SystemConfigGroupMeta> = {
  presence: { id: "presence", label: "Présence & suivi temps réel des chauffeurs", icon: Radar },
  matching: { id: "matching", label: "Recherche de chauffeur & surge — course immédiate", icon: Navigation },
  approach: { id: "approach", label: "Frais d'approche chauffeur → passager", icon: Timer },
  scheduled: { id: "scheduled", label: "Réservations à l'avance (courses programmées)", icon: CalendarClock },
  contracts: { id: "contracts", label: "Contrats location-vente", icon: FileText },
  pricing: { id: "pricing", label: "Moteur de tarification", icon: Calculator },
  promo: { id: "promo", label: "Codes promo — garde-fou de marge", icon: ShieldAlert },
  other: { id: "other", label: "Autres paramètres", icon: Settings2 },
};

/** Sous-en-têtes internes au groupe "scheduled" (~23 clés — trop pour une liste plate). */
export const SCHEDULED_SUBGROUPS: Record<string, string> = {
  window: "Fenêtre de réservation",
  guarantee: "Garantie & annulation",
  dispatch: "Recherche & affectation du pilote",
  incidents: "Incidents, primes & pénalités",
};

const SCHEDULED_SUBGROUP_RULES: Array<{ test: RegExp; subgroup: keyof typeof SCHEDULED_SUBGROUPS }> = [
  { test: /MIN_BOOKING_DELAY|MAX_HORIZON_DAYS|MAX_ACTIVE_PER_PASSENGER/, subgroup: "window" },
  { test: /GUARANTEE_RATE|CANCELLATION/, subgroup: "guarantee" },
  { test: /BOOKING_BONUS|COMPENSATION|ABSENCE_GRACE|NO_SHOW_PENALTY|LATE_PICKUP_PENALTY/, subgroup: "incidents" },
];

/** Résout le sous-groupe d'une clé RIDE_SCHEDULED_* — `undefined` la range hors sous-titre (rare, plutôt que forcer une case inexacte). */
export function resolveScheduledSubgroup(key: string): keyof typeof SCHEDULED_SUBGROUPS | undefined {
  for (const rule of SCHEDULED_SUBGROUP_RULES) {
    if (rule.test.test(key)) return rule.subgroup;
  }
  return key.startsWith("RIDE_SCHEDULED_") ? "dispatch" : undefined;
}

const GROUP_RULES: Array<{ test: RegExp; group: keyof typeof SYSTEM_CONFIG_GROUPS }> = [
  { test: /^NEARBY_|^DRIVER_SESSION_/, group: "presence" },
  { test: /^RIDE_APPROACH_/, group: "approach" },
  { test: /^RIDE_SCHEDULED_/, group: "scheduled" },
  { test: /^RIDE_MATCHING_|^RIDE_DISPATCH_/, group: "matching" },
  { test: /^PROMO_MARGIN_GUARD_/, group: "promo" },
  {
    test: /^VEHICLE_|^CONTRACT_|PAYMENT|^REMINDER_|^AUTO_UNBLOCK|^DRIVER_BLOCK|^PENALTY_|^MIN_WALLET_/,
    group: "contracts",
  },
  { test: /^PRICING_/, group: "pricing" },
];

/** Repli quand aucune règle de préfixe ne matche : le `module` backend
 * (grossier mais toujours présent pour une clé spécifiée) plutôt que
 * "Autres" — une future clé RIDE_* non encore reconnue ici atterrit donc
 * déjà dans "Recherche de chauffeur…" via son module 'ride', pas perdue. */
const MODULE_FALLBACK_GROUP: Record<string, keyof typeof SYSTEM_CONFIG_GROUPS> = {
  ride: "matching",
  contract: "contracts",
  pricing: "pricing",
  "promo-code": "promo",
};

export function resolveConfigGroup(key: string, backendModule?: string): keyof typeof SYSTEM_CONFIG_GROUPS {
  for (const rule of GROUP_RULES) {
    if (rule.test.test(key)) return rule.group;
  }
  if (backendModule && MODULE_FALLBACK_GROUP[backendModule]) return MODULE_FALLBACK_GROUP[backendModule];
  return "other";
}

/** Libellé français d'une `SystemConfigUnit` backend — catalogue fermé, miroir de
 * `SYSTEM_CONFIG_UNIT_LABELS` (`app-config/domain/value-objects/SystemConfigUnit.ts`). */
export const SYSTEM_CONFIG_UNIT_LABELS: Record<string, string> = {
  FCFA: "francs CFA",
  PERCENT_0_100: "points de %",
  FRACTION_0_1: "fraction (0 à 1)",
  MULTIPLIER: "×",
  COUNT: "",
  MINUTES: "min",
  SECONDS: "s",
  MILLISECONDS: "ms",
  HOURS: "h",
  DAYS: "j",
  KM: "km",
  METERS: "m",
  KMH: "km/h",
  DEGREES: "°",
  BOOLEAN_FLAG: "",
  STRING_FREE: "",
};
