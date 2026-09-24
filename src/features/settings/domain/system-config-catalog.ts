import type { LucideIcon } from "lucide-react";
import {
  CalendarClock,
  FileText,
  Navigation,
  Radar,
  Settings2,
  ShieldAlert,
} from "lucide-react";

/**
 * Regroupement et libellés admin-friendly pour les clés `SystemConfig`
 * génériques affichées dans "Paramètres système" (`/settings`).
 *
 * Le backend (`seedSystemConfigs.ts`) documente chaque clé pour un lecteur
 * de code — jargon technique, noms de use case, notes de chantier. Ce
 * catalogue traduit ça en langage admin : à quoi ça sert, quel effet ça a.
 *
 * Toute clé absente de `SYSTEM_CONFIG_CATALOG` tombe dans le groupe "Autres
 * paramètres" et garde le libellé/description bruts du backend — un futur
 * `SystemConfig` non catalogué reste donc visible, jamais perdu.
 */

export interface SystemConfigGroupMeta {
  id: string;
  label: string;
  icon: LucideIcon;
}

export const SYSTEM_CONFIG_GROUPS: Record<string, SystemConfigGroupMeta> = {
  presence: { id: "presence", label: "Présence & suivi temps réel des chauffeurs", icon: Radar },
  matching: { id: "matching", label: "Recherche de chauffeur — course immédiate", icon: Navigation },
  scheduled: { id: "scheduled", label: "Réservations à l'avance (courses programmées)", icon: CalendarClock },
  contracts: { id: "contracts", label: "Contrats location-vente", icon: FileText },
  promo: { id: "promo", label: "Codes promo — garde-fou de marge", icon: ShieldAlert },
  other: { id: "other", label: "Autres paramètres", icon: Settings2 },
};

/** Sous-en-têtes internes au groupe "scheduled" (23 clés — trop pour une liste plate). */
export const SCHEDULED_SUBGROUPS: Record<string, string> = {
  window: "Fenêtre de réservation",
  guarantee: "Garantie & annulation",
  dispatch: "Recherche & affectation du pilote",
  incidents: "Incidents, primes & pénalités",
};

export interface SystemConfigKeyMeta {
  /** Nom court admin-friendly — remplace la clé technique en tête de ligne. */
  label: string;
  /** Description en langage clair — remplace la description backend. */
  description: string;
  group: keyof typeof SYSTEM_CONFIG_GROUPS;
  subgroup?: keyof typeof SCHEDULED_SUBGROUPS;
  /** Avertissement affiché en évidence (valeur provisoire, redémarrage requis…). */
  warning?: string;
}

const PROVISIONAL_WARNING =
  "Valeur provisoire, non encore validée commercialement — à confirmer avant l'activation réelle des réservations.";

export const SYSTEM_CONFIG_CATALOG: Record<string, SystemConfigKeyMeta> = {
  // ─── Présence & suivi temps réel des chauffeurs ──────────────────────────
  NEARBY_TILE_DEG: {
    label: "Portée de visibilité entre chauffeurs",
    description:
      "Jusqu'où un chauffeur voit les autres chauffeurs autour de lui en temps réel (≈ 5,5 à 16,7 km selon sa position). Augmenter = voir plus loin, mais plus de trafic réseau.",
    group: "presence",
  },
  NEARBY_DENSITY_TILE_DEG: {
    label: "Finesse de la carte de densité chauffeurs",
    description:
      "Taille des cases de la carte de densité affichée aux chauffeurs (≈ 1,1 km par case). Plus petit = carte plus précise mais plus de données transmises.",
    group: "presence",
  },
  NEARBY_COORD_PRECISION_DEG: {
    label: "Précision de la position partagée (confidentialité)",
    description:
      "Arrondit la position GPS envoyée aux autres utilisateurs (≈ 111 m par défaut). Plus la valeur est petite, plus il est facile de suivre précisément un chauffeur — ne pas réduire sans raison.",
    group: "presence",
  },
  NEARBY_ID_ROTATION_MS: {
    label: "Fréquence de renouvellement des identifiants anonymes",
    description:
      "Durée avant que l'identifiant temporaire d'un chauffeur (protection anti-pistage) ne change (15 min par défaut). Plus court = plus difficile à pister, mais plus de reconnexions.",
    group: "presence",
  },
  NEARBY_MOVED_THROTTLE_MS: {
    label: "Fréquence d'actualisation d'un chauffeur à l'arrêt",
    description:
      "Délai minimum entre deux mises à jour de position pour un chauffeur immobile. Augmenter réduit la charge serveur mais rend l'affichage moins fluide.",
    group: "presence",
  },
  NEARBY_SUBSCRIBE_MIN_INTERVAL_MS: {
    label: "Anti-spam des demandes de localisation",
    description: "Délai minimum entre deux demandes de localisation coûteuses depuis un même appareil.",
    group: "presence",
  },
  NEARBY_SNAPSHOT_MAX_RESULTS: {
    label: "Nombre maximum de chauffeurs affichés à la fois",
    description: "Plafond de chauffeurs renvoyés en une fois sur la carte temps réel.",
    group: "presence",
  },
  NEARBY_DENSITY_TICK_MS: {
    label: "Fréquence de mise à jour de la carte de densité",
    description: "Toutes les combien de temps la carte de densité de chauffeurs (zones chargées/vides) est recalculée.",
    group: "presence",
  },
  NEARBY_AVERAGE_SPEED_KMH: {
    label: "Vitesse moyenne estimée (temps d'arrivée)",
    description:
      "Vitesse utilisée pour estimer le temps d'arrivée affiché aux utilisateurs. À ajuster selon la réalité du trafic local (ex. Cotonou aux heures de pointe).",
    group: "presence",
  },
  NEARBY_RESET_JITTER_MS: {
    label: "Étalement des reconnexions après rotation d'identifiant",
    description:
      "Évite que tous les chauffeurs se reconnectent au même instant quand les identifiants anonymes changent, en étalant les reconnexions sur cette durée.",
    group: "presence",
  },
  NEARBY_FAMILY_FILTER_ENABLED: {
    label: "Cloisonner la visibilité par famille de véhicule",
    description:
      "Si activé, un chauffeur ne voit que les chauffeurs de véhicules similaires (ex. les motos entre elles). Désactivé, tout le monde voit tout le monde.",
    group: "presence",
  },
  NEARBY_VEHICLE_FAMILIES: {
    label: "Regroupement des types de véhicule en familles",
    description:
      "Définit quels types de véhicule sont considérés « concurrents directs » pour le filtre de visibilité ci-dessus (ex. STANDARD et CONFORT dans la même famille voiture).",
    group: "presence",
  },
  DRIVER_SESSION_TIMEOUT_MINUTES: {
    label: "Délai avant fermeture d'une session chauffeur inactive",
    description:
      "Si un chauffeur reste connecté sans émettre sa position GPS pendant cette durée (app plantée, réseau coupé…), sa session est fermée automatiquement.",
    group: "presence",
  },

  // ─── Recherche de chauffeur — course immédiate ───────────────────────────
  RIDE_MATCHING_INITIAL_RADIUS_KM_MOTO: {
    label: "Rayon de recherche initial — motos",
    description:
      "Distance de départ pour chercher un chauffeur moto disponible lors d'une course immédiate, avant élargissement progressif si personne n'est trouvé.",
    group: "matching",
  },
  RIDE_MATCHING_INITIAL_RADIUS_KM_STANDARD: {
    label: "Rayon de recherche initial — véhicules",
    description: "Distance de départ pour chercher un chauffeur (hors moto) disponible lors d'une course immédiate.",
    group: "matching",
  },
  RIDE_MATCHING_RADIUS_INCREMENT_KM: {
    label: "Pas d'élargissement du rayon de recherche",
    description:
      "De combien le rayon de recherche s'agrandit à chaque nouvelle tentative si aucun chauffeur n'est trouvé (motos et véhicules).",
    group: "matching",
  },
  RIDE_MATCHING_MAX_RADIUS_KM_MOTO: {
    label: "Rayon de recherche maximum — motos",
    description: "Distance au-delà de laquelle la recherche de chauffeur moto s'arrête et échoue (« aucun chauffeur trouvé »).",
    group: "matching",
  },
  RIDE_MATCHING_MAX_RADIUS_KM_STANDARD: {
    label: "Rayon de recherche maximum — véhicules",
    description: "Distance au-delà de laquelle la recherche de chauffeur (hors moto) s'arrête et échoue.",
    group: "matching",
  },

  // ─── Codes promo — garde-fou de marge ────────────────────────────────────
  PROMO_MARGIN_GUARD_RESIDUAL_PCT: {
    label: "Marge minimum préservée sur les codes promo",
    description:
      "Part de la marge habituelle de ForYou garantie même avec une forte remise (50 % par défaut = ForYou garde au moins la moitié de sa marge normale). Une remise plus généreuse est automatiquement plafonnée, sauf campagne à perte explicitement assumée.",
    group: "promo",
  },

  // ─── Réservations — fenêtre de réservation ───────────────────────────────
  RIDE_SCHEDULED_MIN_BOOKING_DELAY_MINUTES: {
    label: "Délai minimum avant le départ pour réserver",
    description: "Un passager doit réserver au moins ce délai à l'avance (2 h par défaut).",
    group: "scheduled",
    subgroup: "window",
  },
  RIDE_SCHEDULED_MAX_HORIZON_DAYS: {
    label: "Horizon maximum de réservation",
    description: "Un passager ne peut pas réserver plus loin que ce nombre de jours à l'avance.",
    group: "scheduled",
    subgroup: "window",
  },
  RIDE_SCHEDULED_MAX_ACTIVE_PER_PASSENGER: {
    label: "Nombre max. de réservations actives par passager",
    description: "Plafond de réservations qu'un même passager peut avoir en cours simultanément.",
    group: "scheduled",
    subgroup: "window",
  },

  // ─── Réservations — garantie & annulation ────────────────────────────────
  RIDE_SCHEDULED_GUARANTEE_RATE_PCT: {
    label: "Taux de garantie gelée à la réservation",
    description:
      "Pourcentage du prix estimé bloqué sur le portefeuille du passager dès la réservation, pour garantir sa présence (30 % par défaut).",
    group: "scheduled",
    subgroup: "guarantee",
  },
  RIDE_SCHEDULED_FREE_CANCELLATION_WINDOW_MINUTES: {
    label: "Délai d'annulation gratuite",
    description: "Jusqu'à ce délai avant le départ, le passager peut annuler sans pénalité et récupère toute sa garantie.",
    group: "scheduled",
    subgroup: "guarantee",
    warning: PROVISIONAL_WARNING,
  },
  RIDE_SCHEDULED_LATE_CANCELLATION_RETENTION_PCT: {
    label: "Retenue sur annulation tardive",
    description:
      "Part de la garantie retenue si le passager annule après le délai gratuit. Doit rester à 0 tant qu'aucune décision commerciale n'a validé une autre valeur.",
    group: "scheduled",
    subgroup: "guarantee",
  },

  // ─── Réservations — recherche & affectation du pilote ────────────────────
  RIDE_SCHEDULED_DISPATCH_WINDOW_MINUTES: {
    label: "Début de la recherche de pilote",
    description: "La recherche d'un chauffeur pour une réservation ne démarre que ce délai avant le départ prévu (1 h par défaut).",
    group: "scheduled",
    subgroup: "dispatch",
  },
  RIDE_SCHEDULED_MANUAL_ASSIGNMENT_THRESHOLD_MINUTES: {
    label: "Ouverture de l'affectation manuelle admin",
    description: "À partir de ce délai avant le départ, une réservation encore sans chauffeur devient assignable manuellement par un admin.",
    group: "scheduled",
    subgroup: "dispatch",
  },
  RIDE_SCHEDULED_NO_DRIVER_DECLARATION_MINUTES: {
    label: "Déclaration d'échec (aucun chauffeur trouvé)",
    description:
      "Si aucun chauffeur n'est trouvé ni affecté avant ce délai précédant le départ, la réservation est déclarée en échec : le passager est notifié et sa garantie restituée.",
    group: "scheduled",
    subgroup: "dispatch",
  },
  RIDE_SCHEDULED_MATCHING_JOB_INTERVAL_MINUTES: {
    label: "Fréquence de recherche automatique de pilote",
    description: "Toutes les combien de minutes le système recherche un chauffeur pour les réservations en attente.",
    group: "scheduled",
    subgroup: "dispatch",
    warning: "Nécessite un redémarrage du serveur worker pour être pris en compte — un changement à chaud n'a aucun effet immédiat.",
  },
  RIDE_SCHEDULED_PLATFORM_PRIORITY_ENABLED: {
    label: "Priorité aux chauffeurs en véhicule ForYou",
    description: "Si activé, la recherche de chauffeur privilégie d'abord ceux qui roulent avec un véhicule appartenant à la plateforme.",
    group: "scheduled",
    subgroup: "dispatch",
  },
  RIDE_SCHEDULED_PLATFORM_EXCLUSIVITY_MINUTES: {
    label: "Durée d'exclusivité chauffeurs plateforme",
    description: "Durée pendant laquelle seuls les chauffeurs en véhicule ForYou sont recherchés avant d'ouvrir aux autres.",
    group: "scheduled",
    subgroup: "dispatch",
  },
  RIDE_SCHEDULED_DRIVER_ACCEPT_TIMEOUT_SECONDS: {
    label: "Délai de réponse laissé au pilote",
    description: "Temps laissé à un chauffeur pour réagir à une proposition de réservation avant qu'elle ne soit proposée à un autre.",
    group: "scheduled",
    subgroup: "dispatch",
  },
  RIDE_SCHEDULED_INITIAL_RADIUS_KM_MOTO: {
    label: "Rayon de recherche initial — motos (réservation)",
    description: "Distance de départ pour chercher un chauffeur moto pour une réservation (distinct du rayon utilisé en course immédiate).",
    group: "scheduled",
    subgroup: "dispatch",
  },
  RIDE_SCHEDULED_INITIAL_RADIUS_KM_STANDARD: {
    label: "Rayon de recherche initial — véhicules (réservation)",
    description: "Distance de départ pour chercher un chauffeur (hors moto) pour une réservation.",
    group: "scheduled",
    subgroup: "dispatch",
  },
  RIDE_SCHEDULED_RADIUS_INCREMENT_KM: {
    label: "Pas d'élargissement du rayon (réservation)",
    description: "De combien le rayon de recherche s'agrandit à chaque tentative pour une réservation.",
    group: "scheduled",
    subgroup: "dispatch",
  },
  RIDE_SCHEDULED_MAX_RADIUS_KM_MOTO: {
    label: "Rayon de recherche maximum — motos (réservation)",
    description: "Distance au-delà de laquelle la recherche de chauffeur moto pour une réservation échoue définitivement.",
    group: "scheduled",
    subgroup: "dispatch",
  },
  RIDE_SCHEDULED_MAX_RADIUS_KM_STANDARD: {
    label: "Rayon de recherche maximum — véhicules (réservation)",
    description: "Distance au-delà de laquelle la recherche de chauffeur (hors moto) pour une réservation échoue définitivement.",
    group: "scheduled",
    subgroup: "dispatch",
  },
  RIDE_SCHEDULED_DEPARTURE_SAFETY_MARGIN_MINUTES: {
    label: "Marge de sécurité au déclenchement du départ",
    description: "Marge soustraite au temps de trajet estimé du chauffeur pour déclencher son départ automatique vers le point de rendez-vous.",
    group: "scheduled",
    subgroup: "dispatch",
  },

  // ─── Réservations — incidents, primes & pénalités ────────────────────────
  RIDE_SCHEDULED_DRIVER_BOOKING_BONUS_AMOUNT: {
    label: "Prime chauffeur pour une réservation honorée",
    description: "Montant fixe (FCFA) versé au chauffeur qui réalise une course réservée à l'avance, en compensation de la contrainte horaire.",
    group: "scheduled",
    subgroup: "incidents",
    warning: PROVISIONAL_WARNING,
  },
  RIDE_SCHEDULED_CLIENT_COMPENSATION_RATE_PCT: {
    label: "Compensation client en cas de défaillance",
    description:
      "Pourcentage de la garantie reversé directement au passager si le chauffeur annule, ne se présente pas, ou si aucun chauffeur n'est trouvé.",
    group: "scheduled",
    subgroup: "incidents",
    warning: PROVISIONAL_WARNING,
  },
  RIDE_SCHEDULED_DRIVER_ABSENCE_GRACE_MINUTES: {
    label: "Tolérance avant libération d'un pilote absent",
    description:
      "Durée d'absence de signal GPS tolérée avant qu'un chauffeur pré-affecté à une réservation ne soit automatiquement libéré (la réservation repart en recherche).",
    group: "scheduled",
    subgroup: "incidents",
  },
  RIDE_SCHEDULED_DRIVER_NO_SHOW_PENALTY_RATE_PCT: {
    label: "Pénalité chauffeur en cas de défaillance",
    description: "Pourcentage de la garantie prélevé sur le solde du chauffeur qui ne s'est pas présenté ou a annulé après confirmation.",
    group: "scheduled",
    subgroup: "incidents",
    warning: PROVISIONAL_WARNING,
  },
  RIDE_SCHEDULED_LATE_PICKUP_PENALTY_THRESHOLD_MINUTES: {
    label: "Seuil de retard déclenchant une pénalité",
    description: "Au-delà de ce retard à l'heure de rendez-vous, le chauffeur est considéré fautif et peut être pénalisé.",
    group: "scheduled",
    subgroup: "incidents",
    warning: PROVISIONAL_WARNING,
  },

  // ─── Contrats location-vente ──────────────────────────────────────────────
  VEHICLE_MARGIN_PCT: {
    label: "Marge appliquée sur le prix du véhicule",
    description: "Pourcentage ajouté au prix d'achat du véhicule pour calculer le montant total que le chauffeur doit rembourser via son contrat.",
    group: "contracts",
  },
  DRIVER_BLOCK_THRESHOLD: {
    label: "Seuil de découvert avant blocage chauffeur",
    description:
      "Multiplicateur du montant d'une échéance : le chauffeur est bloqué automatiquement dès que son solde de gains descend en dessous de −(ce nombre × montant d'une échéance). 2 = un découvert de 2 échéances impayées.",
    group: "contracts",
  },
  CONTRACT_FREQUENCY: {
    label: "Fréquence par défaut des échéances",
    description: "Rythme de prélèvement proposé par défaut à la création d'un nouveau contrat (journalier, hebdomadaire ou mensuel).",
    group: "contracts",
  },
  LATE_PAYMENT_PENALTY: {
    label: "Pénalité de retard de paiement",
    description: "Montant ou pourcentage appliqué en cas de retard de paiement d'une échéance.",
    group: "contracts",
  },
  PENALTY_TYPE: {
    label: "Type de pénalité de retard",
    description: "Détermine si la pénalité de retard ci-dessus est un montant fixe ou un pourcentage de l'échéance.",
    group: "contracts",
  },
  ALLOW_PARTIAL_PAYMENT: {
    label: "[Obsolète] Paiement partiel accepté",
    description: "N'a plus aucun effet sur le prélèvement automatique — conservé uniquement pour compatibilité historique.",
    group: "contracts",
  },
  RETRY_IMPAYEE_INSTALLMENTS: {
    label: "[Obsolète] Relance des échéances impayées",
    description: "N'a plus aucun effet sur le prélèvement automatique — conservé uniquement pour compatibilité historique.",
    group: "contracts",
  },
  VEHICLE_DEPRECIATION_RATE: {
    label: "Taux de dépréciation annuel du véhicule",
    description: "Pourcentage de perte de valeur appliqué chaque année à la valeur du véhicule.",
    group: "contracts",
  },
  MIN_WALLET_FOR_DEBIT: {
    label: "Solde minimum requis pour prélever une échéance",
    description: "Solde minimum que le portefeuille de gains du chauffeur doit conserver pour qu'une échéance puisse être prélevée automatiquement.",
    group: "contracts",
  },
  AUTO_UNBLOCK_ENABLED: {
    label: "Déblocage automatique après régularisation",
    description: "Si activé, un chauffeur bloqué pour impayé est automatiquement débloqué dès que sa dette est réglée.",
    group: "contracts",
  },
  PAYMENT_CRON_HOUR: {
    label: "Heure de prélèvement quotidien des échéances",
    description: "Heure de la journée (0-23) à laquelle le système prélève automatiquement les échéances du jour.",
    group: "contracts",
  },
  REMINDER_DAYS_BEFORE: {
    label: "Jours de rappel avant échéance",
    description: "Liste des délais (en jours avant l'échéance) auxquels un rappel est envoyé au chauffeur, séparés par des virgules.",
    group: "contracts",
  },
  CONTRACT_DIGITAL_SIGNATURE: {
    label: "Signature électronique du contrat",
    description: "Active la signature électronique du contrat directement par le chauffeur.",
    group: "contracts",
  },
  CONTRACT_PDF_AUTO: {
    label: "Génération automatique du PDF",
    description: "Génère automatiquement le PDF du contrat dès sa création.",
    group: "contracts",
  },
};

/** Résout le groupe d'une clé non cataloguée — fallback par préfixe, pour
 * qu'une future clé (NEARBY_, RIDE_MATCHING_ ou RIDE_SCHEDULED_, par
 * exemple) non encore ajoutée au catalogue rejoigne quand même le bon
 * groupe plutôt que "Autres paramètres". */
export function resolveConfigGroup(key: string): keyof typeof SYSTEM_CONFIG_GROUPS {
  const meta = SYSTEM_CONFIG_CATALOG[key];
  if (meta) return meta.group;
  if (key.startsWith("NEARBY_") || key.startsWith("DRIVER_SESSION_")) return "presence";
  if (key.startsWith("RIDE_SCHEDULED_")) return "scheduled";
  if (key.startsWith("RIDE_MATCHING_")) return "matching";
  if (key.startsWith("PROMO_MARGIN_GUARD_")) return "promo";
  if (
    key.startsWith("VEHICLE_") ||
    key.startsWith("CONTRACT_") ||
    key.includes("PAYMENT") ||
    key.startsWith("REMINDER_") ||
    key.startsWith("AUTO_UNBLOCK") ||
    key.startsWith("DRIVER_BLOCK") ||
    key.startsWith("PENALTY_") ||
    key.startsWith("MIN_WALLET_")
  ) {
    return "contracts";
  }
  return "other";
}
