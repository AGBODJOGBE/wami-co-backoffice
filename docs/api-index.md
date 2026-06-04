# ForYou Platform API — Index des endpoints

Source : extrait de `docs/openapi.json` (OpenAPI 3.0, version 1.0.0).  
Base URL prod : `https://api.4u-foryou.com`.  
Total : 153 paths · 27 tags.

## Admin - Auth

| Method | Path | Summary |
|---|---|---|
| POST | `/api/admin/login` | Login admin |
| POST | `/api/admin/register` | Register new admin |

## Admin - Driver Management

| Method | Path | Summary |
|---|---|---|
| GET | `/api/admin/drivers/pending` | List pending drivers |
| PATCH | `/api/admin/drivers/{driverId}/approve` | Approve a driver |
| PATCH | `/api/admin/drivers/{driverId}/suspend` | Suspend a driver |
| PATCH | `/api/admin/drivers/{driverId}/reactivate` | Reactivate a suspended driver |

## Admin - Partner Management

| Method | Path | Summary |
|---|---|---|
| GET | `/api/admin/partners/pending` | List pending partners |
| PATCH | `/api/admin/partners/{partnerId}/validate` | Validate a partner |

## Admin - Pricing

| Method | Path | Summary |
|---|---|---|
| POST | `/api/admin/pricing-grid` | Create a new pricing grid version |
| GET | `/api/admin/pricing-grid/active` | Get active pricing grid |

## Admin - Promo Codes

| Method | Path | Summary |
|---|---|---|
| POST | `/api/admin/promo-codes` | Créer un code promo |
| GET | `/api/admin/promo-codes` | Lister les codes promo |
| PATCH | `/api/admin/promo-codes/{id}/toggle` | Activer ou désactiver un code promo |

## Admin - RBAC

| Method | Path | Summary |
|---|---|---|
| GET | `/api/admin/me/permissions` | Get my permissions |
| GET | `/api/admin/roles` | List all roles |
| GET | `/api/admin/permissions` | List all permissions |
| POST | `/api/admin/admins/{adminId}/grant-permission` | Grant a permission to an admin |

## Admin — Pricing

| Method | Path | Summary |
|---|---|---|
| PATCH | `/api/admin/ride-pricing/{vehicleType}` | Update pricing config for a vehicle type |

## Admin — Surge

| Method | Path | Summary |
|---|---|---|
| GET | `/api/admin/surge-rules` | List all active surge rules |
| POST | `/api/admin/surge-rules` | Create a surge rule |
| PATCH | `/api/admin/surge-rules/{ruleId}` | Update a surge rule (full replacement) |
| DELETE | `/api/admin/surge-rules/{ruleId}` | Delete a surge rule |

## Daily Route

| Method | Path | Summary |
|---|---|---|
| POST | `/api/driver/daily-routes` | Create a recurring daily route subscription |
| PATCH | `/api/driver/daily-routes/{routeId}/pause` | Pause a daily route |
| PATCH | `/api/driver/daily-routes/{routeId}/resume` | Resume a paused daily route |

## Delivery Orders

| Method | Path | Summary |
|---|---|---|
| POST | `/api/delivery/orders` | Create a delivery order |
| GET | `/api/delivery/orders` | List my delivery orders |
| POST | `/api/delivery/orders/calculate-price` | Calculate delivery price |
| GET | `/api/delivery/orders/track` | Track a delivery order |
| PATCH | `/api/delivery/orders/{orderId}/cancel` | Cancel a delivery order |
| POST | `/api/delivery/orders/{orderId}/inspect-pickup` | Inspect parcel at warehouse pickup |
| POST | `/api/delivery/orders/{orderId}/refuse` | Refuse a parcel at warehouse |
| PATCH | `/api/delivery/orders/{orderId}/arrive-recipient` | Arrive at recipient location |
| POST | `/api/delivery/orders/{orderId}/complete-delivery` | Complete delivery at stop |
| POST | `/api/delivery/orders/{orderId}/fail-delivery` | Record delivery failure |

## Delivery Rounds

| Method | Path | Summary |
|---|---|---|
| POST | `/api/delivery/rounds` | Create a delivery round |
| PATCH | `/api/delivery/rounds/{roundId}/accept` | Accept a delivery round |
| PATCH | `/api/delivery/rounds/{roundId}/decline` | Decline a delivery round |
| PATCH | `/api/delivery/rounds/{roundId}/start` | Start round - head to warehouse |
| PATCH | `/api/delivery/rounds/{roundId}/arrive-warehouse` | Arrive at warehouse |
| PATCH | `/api/delivery/rounds/{roundId}/start-tour` | Start delivery tour |
| PATCH | `/api/delivery/rounds/{roundId}/complete` | Complete delivery round |
| POST | `/api/delivery/rounds/{roundId}/location` | Update driver GPS location |

## Driver — Delivery B2C

| Method | Path | Summary |
|---|---|---|
| PATCH | `/api/driver/delivery/{orderId}/accept` | Accepter une demande de livraison |
| PATCH | `/api/driver/delivery/{orderId}/pickup-arrival` | Confirmer l'arrivée au point de collecte |
| PATCH | `/api/driver/delivery/{orderId}/pickup-photo` | Uploader la photo de collecte du colis |
| PATCH | `/api/driver/delivery/{orderId}/delivery-arrival` | Confirmer l'arrivée chez le destinataire |
| PATCH | `/api/driver/delivery/{orderId}/validate-otp` | Valider le code OTP du destinataire |
| PATCH | `/api/driver/delivery/{orderId}/delivery-photo` | Uploader la photo de livraison et compléter la livraison |
| PATCH | `/api/driver/delivery/{orderId}/pickup-failure` | Signaler un échec de collecte |
| PATCH | `/api/driver/delivery/{orderId}/delivery-failure` | Signaler un échec de livraison |
| DELETE | `/api/driver/delivery/{orderId}` | Annuler une commande de livraison (driver) |

## Drivers

| Method | Path | Summary |
|---|---|---|
| POST | `/api/drivers/send-otp` | Envoyer un code OTP par SMS |
| POST | `/api/drivers/verify-otp` | Vérifier le code OTP |
| POST | `/api/drivers/register` | Register new driver |
| POST | `/api/drivers/login` | Login driver |
| GET | `/api/drivers/profile` | Get driver profile |
| DELETE | `/api/drivers/profile` | Delete driver profile |
| PUT | `/api/drivers/password` | Change password |
| POST | `/api/drivers/password/forgot` | Request password reset |
| POST | `/api/drivers/password/reset` | Reset password with code |
| PATCH | `/api/drivers/fcm-token` | Update FCM token |
| PATCH | `/api/drivers/status` | Update driver status |
| GET | `/api/drivers/me/verify-token` | Verify token validity |
| GET | `/api/drivers/rides` | Get ride history |
| GET | `/api/drivers/referrals` | Get my referrals |

## Notifications

| Method | Path | Summary |
|---|---|---|
| GET | `/api/notifications` | Get notification history |
| PATCH | `/api/notifications/{notificationId}/read` | Mark notification as read |
| GET | `/api/notifications/stats` | Get notification delivery statistics |

## Offer — Driver

| Method | Path | Summary |
|---|---|---|
| POST | `/api/driver/offers` | Publish an intercity trip offer |
| PATCH | `/api/driver/offers/{offerId}/start` | Start the intercity trip |
| PATCH | `/api/driver/offers/{offerId}/complete` | Complete the intercity trip |
| DELETE | `/api/driver/offers/{offerId}/cancel` | Cancel an intercity offer |

## Offer — Passenger

| Method | Path | Summary |
|---|---|---|
| GET | `/api/passenger/offers` | Search available intercity offers |
| POST | `/api/passenger/offers/{offerId}/book` | Book seats on an intercity offer |
| DELETE | `/api/passenger/bookings/{bookingId}/cancel` | Cancel a booking |

## Partners

| Method | Path | Summary |
|---|---|---|
| POST | `/api/partners/send-otp` | Envoyer un code OTP par SMS |
| POST | `/api/partners/verify-otp` | Vérifier le code OTP |
| POST | `/api/partners/register` | Register new partner |
| POST | `/api/partners/login` | Login partner |
| GET | `/api/partners/profile` | Get partner profile |
| DELETE | `/api/partners/profile` | Delete partner profile |
| PUT | `/api/partners/password` | Change partner password |
| POST | `/api/partners/password/forgot` | Request partner password reset |
| POST | `/api/partners/password/reset` | Reset partner password with code |
| PATCH | `/api/partners/fcm-token` | Update FCM token |

## Passenger - Promo Codes

| Method | Path | Summary |
|---|---|---|
| POST | `/api/admin/promo-codes/validate` | Valider un code promo avant une course |
| GET | `/api/passengers/promo-codes` | Codes promo disponibles |
| GET | `/api/passengers/promo-codes/usages` | Historique d'utilisation des codes promo |

## Passenger — Delivery B2C

| Method | Path | Summary |
|---|---|---|
| POST | `/api/passenger/delivery/estimate` | Estimer le prix d'une livraison |
| POST | `/api/passenger/delivery` | Créer une commande de livraison |
| GET | `/api/passenger/delivery/{orderId}` | Suivre une commande de livraison |
| DELETE | `/api/passenger/delivery/{orderId}` | Annuler une commande de livraison |

## Passengers

| Method | Path | Summary |
|---|---|---|
| POST | `/api/passengers/send-otp` | Envoyer un code OTP par SMS |
| POST | `/api/passengers/verify-otp` | Vérifier le code OTP |
| POST | `/api/passengers/register` | Inscription passager |
| POST | `/api/passengers/login` | Connexion passager |
| GET | `/api/passengers/profile` | Mon profil passager |
| DELETE | `/api/passengers/profile` | Supprimer mon profil passager |
| PUT | `/api/passengers/password` | Changer le mot de passe |
| POST | `/api/passengers/password/forgot` | Demander la réinitialisation du mot de passe |
| POST | `/api/passengers/password/reset` | Réinitialiser le mot de passe |
| PATCH | `/api/passengers/fcm-token` | Mettre à jour le token FCM |
| GET | `/api/passengers/me/verify-token` | Vérifier la validité du token |
| GET | `/api/passengers/rides` | Historique des courses |
| GET | `/api/passengers/referrals` | Mes parrainages |

## Payment

| Method | Path | Summary |
|---|---|---|
| GET | `/payment/status/{paymentIntentId}` | Get payment status |

## Ride — Driver

| Method | Path | Summary |
|---|---|---|
| PATCH | `/api/driver/rides/{rideId}/accept` | Accept a ride request |
| PATCH | `/api/driver/rides/{rideId}/arrived` | Mark arrived at pickup |
| PATCH | `/api/driver/rides/{rideId}/start` | Start the trip |
| PATCH | `/api/driver/rides/{rideId}/pause` | Pause an in-progress trip |
| PATCH | `/api/driver/rides/{rideId}/resume` | Resume a paused trip |
| PATCH | `/api/driver/rides/{rideId}/complete` | Complete the trip |
| PATCH | `/api/driver/rides/{rideId}/cancel` | Cancel the ride (driver) |
| GET | `/api/driver/rides/{rideId}` | Get ride details |
| POST | `/api/driver/rides/{rideId}/rating` | Rate the passenger |
| PATCH | `/api/driver/rides/{rideId}/destination-change/accept` | Accept passenger destination change |
| PATCH | `/api/driver/rides/{rideId}/destination-change/reject` | Reject passenger destination change |
| PATCH | `/api/driver/rides/{rideId}/reject` | Refuser une demande de course |

## Ride — Passenger

| Method | Path | Summary |
|---|---|---|
| POST | `/api/passenger/rides/estimate` | Get ride price estimate |
| POST | `/api/passenger/rides` | Request a new ride |
| GET | `/api/passenger/rides/{rideId}` | Track a ride |
| DELETE | `/api/passenger/rides/{rideId}` | Cancel a ride |
| POST | `/api/passenger/rides/{rideId}/rating` | Rate the driver |
| PATCH | `/api/passenger/rides/{rideId}/payment-split` | Set wallet/cash split |
| POST | `/api/passenger/rides/{rideId}/destination-change` | Request a new dropoff mid-ride |
| GET | `/api/passenger/rides/nearby-drivers` | Drivers disponibles autour du passager |
| POST | `/api/rides/{rideId}/accept-fallback` | Accepter un véhicule de substitution |

## Users

| Method | Path | Summary |
|---|---|---|
| POST | `/api/users` | Create new user |
| GET | `/api/users/{id}` | Get user by ID |
| POST | `/api/users/{id}/verify-phone` | Verify phone number |
| POST | `/api/users/{id}/resend-verification` | Resend verification codes |
| POST | `/api/users/{id}/verify-email` | Verify email address |
| POST | `/api/users/{id}/add-email` | Add email to user |
| PATCH | `/api/users/{id}/email` | Change email address |
| PATCH | `/api/users/{id}/phone` | Change phone number |
| PATCH | `/api/users/{id}/name` | Update user name |
| PATCH | `/api/users/{id}/address` | Update user address |
| PATCH | `/api/users/{id}/gender` | Update user gender |
| POST | `/api/users/{id}/profiles/passenger` | Activate passenger profile |
| POST | `/api/users/{id}/profiles/driver` | Activate driver profile |
| POST | `/api/users/{id}/profiles/partner` | Activate partner profile |
| PATCH | `/api/users/{id}/driver-category` | Update driver category |
| POST | `/api/users/{id}/deactivate` | Deactivate user account |
| POST | `/api/users/{id}/activate` | Activate user account |

## Wallet

| Method | Path | Summary |
|---|---|---|
| GET | `/api/wallets/{walletId}/balance` | Solde du wallet |
| GET | `/api/wallets/{walletId}/balance/check` | Vérifier la suffisance du solde |
| GET | `/api/wallets/{walletId}/transactions` | Historique des transactions |
| POST | `/api/wallets/{walletId}/recharge` | Recharger le wallet via Mobile Money |
| POST | `/api/wallets/{walletId}/withdraw` | Demander un retrait |
| POST | `/api/wallets/{walletId}/consolidate` | Consolider un sous-solde vers MAIN |
| POST | `/api/wallets/{walletId}/transfer` | Envoyer de l'argent à un autre utilisateur |
| POST | `/api/wallets/{walletId}/credit` | Créditer un sous-solde (Admin) |
| POST | `/api/wallets/{walletId}/debit` | Débiter un wallet (Admin) |

## Warehouses

| Method | Path | Summary |
|---|---|---|
| POST | `/api/delivery/warehouses` | Add a new warehouse |
| GET | `/api/delivery/warehouses` | List partner warehouses |
| GET | `/api/delivery/warehouses/{warehouseId}` | Get warehouse details |
| PUT | `/api/delivery/warehouses/{warehouseId}` | Update warehouse |
| PATCH | `/api/delivery/warehouses/{warehouseId}/deactivate` | Deactivate warehouse |

## Webhooks

| Method | Path | Summary |
|---|---|---|
| POST | `/webhooks/fedapay` | FedaPay webhook callback |
| POST | `/webhooks/kkiapay` | KKiaPay webhook callback |
| POST | `/webhooks/mtn` | MTN MoMo webhook callback |
| POST | `/webhooks/moov` | Moov Money webhook callback |

