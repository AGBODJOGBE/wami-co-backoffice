export interface MissingPermissionEntry {
  code: string;
  name: string;
  module: string;
  category: string;
}

export interface SyncPermissionDetail {
  code: string;
  name: string;
  module: string;
  status: "created" | "skipped" | "failed";
  error?: string;
}

export interface SyncPermissionsResult {
  created: number;
  skipped: number;
  failed: number;
  details: SyncPermissionDetail[];
}

/**
 * Catalogue complet des permissions de la plateforme.
 * Regroupe :
 *   — Les permissions déjà seedées côté backend (SYSTEM_PERMISSIONS) → statut "skipped" lors du sync
 *   — Les permissions non seedées mais requises par le frontend → statut "created" lors du sync
 *
 * Source backend : src/modules/admin/domain/services/SystemPermissions.ts
 */
export const MISSING_PERMISSIONS: MissingPermissionEntry[] = [

  // ─── COURSES VTC ────────────────────────────────────────────────────────────
  { code: "ride.view_all",                        name: "Voir toutes les courses",                                        module: "ride",         category: "VIEW"         },
  { code: "ride.update_status",                   name: "Modifier le statut d'une course",                                module: "ride",         category: "MANAGE"       },

  // ─── CONTRATS LOCATION-VENTE ─────────────────────────────────────────────────
  { code: "contract.view_all",                    name: "Voir tous les contrats",                                         module: "contract",     category: "VIEW"         },
  { code: "contract.create",                      name: "Créer un contrat",                                               module: "contract",     category: "MANAGE"       },
  { code: "contract.break",                       name: "Résilier un contrat",                                            module: "contract",     category: "MANAGE"       },
  { code: "contract.suspend",                     name: "Suspendre un contrat",                                           module: "contract",     category: "MANAGE"       },
  { code: "contract.resume",                      name: "Reprendre un contrat",                                           module: "contract",     category: "MANAGE"       },
  { code: "contract.modify_terms",                name: "Modifier les termes d'un contrat",                               module: "contract",     category: "MANAGE"       },
  { code: "contract.driver.unblock",              name: "Débloquer un chauffeur (contrat)",                               module: "contract",     category: "MANAGE"       },
  { code: "contract.installment.manual_payment",  name: "Enregistrer un paiement manuel de contrat",                      module: "contract",     category: "MANAGE"       },
  { code: "contract.config.manage",               name: "Gérer la configuration des contrats",                            module: "contract",     category: "CONFIG"       },
  { code: "contract.audit.view",                  name: "Voir le journal d'audit des contrats",                           module: "contract",     category: "VIEW"         },

  // ─── CHAUFFEURS ──────────────────────────────────────────────────────────────
  { code: "driver.view_all",                      name: "Voir tous les chauffeurs",                                       module: "driver",       category: "VIEW"         },
  { code: "driver.suspend",                       name: "Suspendre un chauffeur",                                         module: "driver",       category: "MANAGE"       },
  { code: "driver.reactivate",                    name: "Réactiver un chauffeur suspendu",                                module: "driver",       category: "MANAGE"       },
  { code: "driver.update_info",                   name: "Modifier les infos d'identité d'un chauffeur",                   module: "driver",       category: "MANAGE"       },
  { code: "driver.welcome_bonus.manage",          name: "Gérer le bonus de bienvenue chauffeur",                          module: "driver",       category: "CONFIG"       },
  { code: "driver.approve",                       name: "Approuver un chauffeur",                                         module: "driver",       category: "MANAGE"       },
  { code: "driver.update_type",                   name: "Modifier le type de chauffeur",                                  module: "driver",       category: "MANAGE"       },

  // ─── BONUS CHAUFFEURS ────────────────────────────────────────────────────────
  { code: "driver_bonus.config.view",             name: "Voir les barèmes bonus chauffeur",                               module: "driver_bonus", category: "VIEW"         },
  { code: "driver_bonus.config.manage",           name: "Créer et gérer les barèmes bonus chauffeur",                     module: "driver_bonus", category: "MANAGE"       },
  { code: "driver_bonus.awards.view",             name: "Voir l'historique des bonus attribués",                          module: "driver_bonus", category: "VIEW"         },

  // ─── VÉHICULES ───────────────────────────────────────────────────────────────
  { code: "vehicle.view_all",                     name: "Voir tous les véhicules",                                        module: "vehicle",      category: "VIEW"         },
  { code: "vehicle.verify",                       name: "Vérifier et approuver un véhicule",                              module: "vehicle",      category: "MANAGE"       },
  { code: "vehicle.manage",                       name: "Gérer les véhicules (assignation, maintenance, retrait)",        module: "vehicle",      category: "MANAGE"       },

  // ─── PASSAGERS ───────────────────────────────────────────────────────────────
  { code: "passenger.view_all",                   name: "Voir tous les passagers",                                        module: "passenger",    category: "VIEW"         },

  // ─── UTILISATEURS ────────────────────────────────────────────────────────────
  { code: "user.view_all",                        name: "Voir tous les utilisateurs",                                     module: "user",         category: "VIEW"         },

  // ─── SUIVI PILOTES (FLEET) ───────────────────────────────────────────────────
  { code: "fleet.monitor",                        name: "Suivre les pilotes et leur activité (courses, wallet, statut)", module: "fleet",        category: "MONITOR"      },

  // ─── WALLETS & TRANSACTIONS ──────────────────────────────────────────────────
  { code: "wallet.view_all",                      name: "Voir tous les wallets",                                          module: "wallet",       category: "VIEW"         },
  { code: "wallet.credit",                        name: "Créditer un wallet manuellement",                                module: "wallet",       category: "MANAGE"       },
  { code: "wallet.debit",                         name: "Débiter un wallet manuellement",                                 module: "wallet",       category: "MANAGE"       },
  { code: "wallet.withdrawal.manage",             name: "Approuver / rejeter les demandes de retrait",                   module: "wallet",       category: "MANAGE"       },
  { code: "transaction.view_all",                 name: "Voir toutes les transactions",                                   module: "wallet",       category: "VIEW"         },

  // ─── PAIEMENTS MOBILE MONEY ──────────────────────────────────────────────────
  { code: "payment.view_all",                     name: "Voir tous les paiements MoMo",                                   module: "payment",      category: "VIEW"         },

  // ─── FACTURATION ─────────────────────────────────────────────────────────────
  { code: "billing.invoice.generate",             name: "Générer les factures partenaires",                               module: "billing",      category: "INVOICE"      },
  { code: "billing.cod.reconcile",                name: "Réconcilier les montants COD",                                   module: "billing",      category: "COD"          },
  { code: "billing.balance.view",                 name: "Voir les soldes des comptes partenaires",                        module: "billing",      category: "VIEW"         },

  // ─── LIVRAISON B2B ───────────────────────────────────────────────────────────
  { code: "delivery.order.view_all",              name: "Voir toutes les commandes B2B",                                  module: "delivery",     category: "VIEW"         },
  { code: "delivery.order.cancel",                name: "Annuler une commande B2B",                                       module: "delivery",     category: "MANAGE"       },
  { code: "delivery.round.create",                name: "Créer une tournée de livraison",                                 module: "delivery",     category: "MANAGE"       },
  { code: "delivery.round.reassign",              name: "Réassigner une tournée à un autre pilote",                       module: "delivery",     category: "MANAGE"       },
  { code: "delivery.round.abort",                 name: "Annuler une tournée en urgence",                                 module: "delivery",     category: "MANAGE"       },

  // ─── LIVRAISON B2C ───────────────────────────────────────────────────────────
  { code: "delivery_b2c.view_all",                name: "Voir toutes les livraisons B2C",                                 module: "delivery_b2c", category: "VIEW"         },
  { code: "delivery_b2c.manage",                  name: "Gérer les livraisons B2C",                                       module: "delivery_b2c", category: "MANAGE"       },

  // ─── ABONNEMENTS B2B ─────────────────────────────────────────────────────────
  { code: "subscription.plan.view",               name: "Voir les forfaits d'abonnement B2B",                             module: "subscription", category: "VIEW"         },
  { code: "subscription.plan.manage",             name: "Gérer les forfaits d'abonnement B2B",                            module: "subscription", category: "MANAGE"       },

  // ─── PARTENAIRES ─────────────────────────────────────────────────────────────
  { code: "partner.view_all",                     name: "Voir tous les partenaires",                                      module: "partner",      category: "VIEW"         },
  { code: "partner.validate",                     name: "Valider un partenaire",                                          module: "partner",      category: "MANAGE"       },
  { code: "partner.suspend",                      name: "Suspendre un partenaire",                                        module: "partner",      category: "MANAGE"       },
  { code: "partner.reactivate",                   name: "Réactiver un partenaire",                                        module: "partner",      category: "MANAGE"       },

  // ─── PARRAINAGE ──────────────────────────────────────────────────────────────
  { code: "referral.view_all",                    name: "Voir tous les parrainages",                                      module: "referral",     category: "VIEW"         },
  { code: "referral.config.view",                 name: "Voir la configuration parrainage",                               module: "referral",     category: "VIEW"         },
  { code: "referral.config.manage",               name: "Gérer la configuration parrainage",                              module: "referral",     category: "MANAGE"       },
  { code: "referral.validate",                    name: "Valider un parrainage manuellement",                             module: "referral",     category: "MANAGE"       },

  // ─── CODES PROMO ─────────────────────────────────────────────────────────────
  { code: "promo_code.view_all",                  name: "Voir tous les codes promo",                                      module: "promo_code",   category: "VIEW"         },
  { code: "promo_code.manage",                    name: "Créer et gérer les codes promo",                                 module: "promo_code",   category: "MANAGE"       },

  // ─── TARIFICATION ────────────────────────────────────────────────────────────
  { code: "pricing.grid.configure",               name: "Configurer la grille tarifaire",                                 module: "pricing",      category: "CONFIG"       },
  { code: "pricing.partner_override.set",         name: "Configurer un tarif préférentiel partenaire",                    module: "pricing",      category: "CONFIG"       },

  // ─── ANALYTICS ───────────────────────────────────────────────────────────────
  { code: "analytics.view",                       name: "Voir le dashboard analytics",                                    module: "analytics",    category: "VIEW"         },
  { code: "analytics.export",                     name: "Exporter les données analytics (CSV/Excel)",                     module: "analytics",    category: "EXPORT"       },

  // ─── LITIGES ─────────────────────────────────────────────────────────────────
  { code: "dispute.manage",                       name: "Ouvrir et investiguer les litiges",                              module: "dispute",      category: "MANAGE"       },
  { code: "dispute.resolve",                      name: "Résoudre un litige",                                             module: "dispute",      category: "MANAGE"       },

  // ─── NOTIFICATIONS ───────────────────────────────────────────────────────────
  { code: "notification.send",                    name: "Envoyer des notifications push",                                 module: "notification", category: "MANAGE"       },

  // ─── DOCUMENTS ───────────────────────────────────────────────────────────────
  { code: "document.verify",                      name: "Vérifier et valider les documents soumis",                       module: "document",     category: "MANAGE"       },
  { code: "document.replace",                     name: "Remplacer un document vérifié (admin)",                          module: "document",     category: "MANAGE"       },
  { code: "document.delete",                      name: "Supprimer un document en attente ou rejeté (admin)",             module: "document",     category: "MANAGE"       },

  // ─── WALLET CONFIG ───────────────────────────────────────────────────────────
  { code: "wallet.config.manage",                 name: "Modifier la configuration wallet (bonus, taux, seuils)",         module: "wallet",       category: "CONFIG"       },

  // ─── CONFIGURATION SYSTÈME ───────────────────────────────────────────────────
  { code: "app_config.view",                      name: "Voir la configuration système",                                  module: "app_config",   category: "VIEW"         },
  { code: "app_config.manage",                    name: "Modifier la configuration système",                              module: "app_config",   category: "MANAGE"       },

  // ─── ADMINS ──────────────────────────────────────────────────────────────────
  { code: "admin.view_all",                       name: "Voir tous les admins",                                           module: "admin",        category: "VIEW"         },
  { code: "admin.create",                         name: "Créer un administrateur",                                        module: "admin",        category: "MANAGE"       },
  { code: "admin.update_role",                    name: "Modifier le rôle d'un administrateur",                           module: "admin",        category: "MANAGE"       },
  { code: "admin.suspend",                        name: "Suspendre un administrateur",                                    module: "admin",        category: "MANAGE"       },
  { code: "admin.deactivate",                     name: "Désactiver un administrateur",                                   module: "admin",        category: "MANAGE"       },
  { code: "admin.reactivate",                     name: "Réactiver un administrateur",                                    module: "admin",        category: "MANAGE"       },
  { code: "admin.grant_permission",               name: "Accorder une permission individuelle à un admin",                module: "admin",        category: "PERMISSION"   },
  { code: "admin.revoke_permission",              name: "Révoquer une permission individuelle d'un admin",                module: "admin",        category: "PERMISSION"   },

  // ─── RÔLES ───────────────────────────────────────────────────────────────────
  { code: "role.create",                          name: "Créer un rôle",                                                  module: "role",         category: "MANAGE"       },
  { code: "role.update",                          name: "Modifier un rôle",                                               module: "role",         category: "MANAGE"       },
  { code: "role.deactivate",                      name: "Désactiver un rôle",                                             module: "role",         category: "MANAGE"       },

  // ─── PERMISSIONS ─────────────────────────────────────────────────────────────
  { code: "permission.create",                    name: "Créer une permission",                                           module: "permission",   category: "MANAGE"       },
  { code: "permission.update",                    name: "Modifier une permission existante",                              module: "permission",   category: "MANAGE"       },
];
