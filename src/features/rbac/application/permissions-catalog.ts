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

export const MISSING_PERMISSIONS: MissingPermissionEntry[] = [
  // payment
  { code: "payment.view_all",            name: "Voir les paiements",                                      module: "payment",      category: "VIEW"         },
  // driver
  { code: "driver.approve",              name: "Approuver un driver",                                     module: "driver",       category: "DRIVER"       },
  { code: "driver.update_type",          name: "Modifier le type de driver",                              module: "driver",       category: "DRIVER"       },
  // driver_bonus
  { code: "driver_bonus.config.view",    name: "Voir les barèmes bonus driver",                           module: "driver_bonus", category: "DRIVER_BONUS" },
  { code: "driver_bonus.config.manage",  name: "Créer et gérer les barèmes bonus driver",                 module: "driver_bonus", category: "DRIVER_BONUS" },
  { code: "driver_bonus.awards.view",    name: "Voir l'historique des bonus attribués",                   module: "driver_bonus", category: "DRIVER_BONUS" },
  // referral
  { code: "referral.view_all",           name: "Voir tous les parrainages",                               module: "referral",     category: "REFERRAL"     },
  { code: "referral.config.view",        name: "Voir la configuration parrainage",                        module: "referral",     category: "REFERRAL"     },
  { code: "referral.config.manage",      name: "Gérer la configuration parrainage",                       module: "referral",     category: "REFERRAL"     },
  { code: "referral.validate",           name: "Valider un parrainage manuellement",                      module: "referral",     category: "REFERRAL"     },
  // vehicle
  { code: "vehicle.view_all",            name: "Voir tous les véhicules",                                 module: "vehicle",      category: "VEHICLE"      },
  { code: "vehicle.verify",              name: "Vérifier et approuver un véhicule",                       module: "vehicle",      category: "VEHICLE"      },
  { code: "vehicle.manage",              name: "Gérer les véhicules (assignation, maintenance, retrait)", module: "vehicle",      category: "VEHICLE"      },
  // promo_code
  { code: "promo_code.view_all",         name: "Voir tous les codes promo",                               module: "promo_code",   category: "PROMO_CODE"   },
  { code: "promo_code.manage",           name: "Créer et gérer les codes promo",                          module: "promo_code",   category: "PROMO_CODE"   },
  // notification
  { code: "notification.send",           name: "Envoyer des notifications push",                          module: "notification", category: "NOTIFICATION" },
  // app_config
  { code: "app_config.view",             name: "Voir la configuration système",                           module: "app_config",   category: "APP_CONFIG"   },
  { code: "app_config.manage",           name: "Modifier la configuration système",                       module: "app_config",   category: "APP_CONFIG"   },
  // passenger
  { code: "passenger.view_all",          name: "Voir tous les passagers",                                 module: "passenger",    category: "PASSENGER"    },
  // document
  { code: "document.verify",             name: "Vérifier les documents soumis",                           module: "document",     category: "DOCUMENT"     },
  // delivery_b2c
  { code: "delivery_b2c.view_all",       name: "Voir toutes les livraisons B2C",                          module: "delivery_b2c", category: "DELIVERY_B2C" },
  { code: "delivery_b2c.manage",         name: "Gérer les livraisons B2C",                                module: "delivery_b2c", category: "DELIVERY_B2C" },
  // wallet / transactions
  { code: "wallet.credit",               name: "Créditer un wallet manuellement",                         module: "wallet",       category: "WALLET"       },
  { code: "wallet.debit",                name: "Débiter un wallet manuellement",                          module: "wallet",       category: "WALLET"       },
  { code: "wallet.withdrawal.manage",    name: "Approuver / rejeter les demandes de retrait",             module: "wallet",       category: "WALLET"       },
  { code: "transaction.view_all",        name: "Voir toutes les transactions",                            module: "wallet",       category: "WALLET"       },
];
