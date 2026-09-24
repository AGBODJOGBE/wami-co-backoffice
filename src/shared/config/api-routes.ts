/**
 * Single source of truth for every backend API endpoint consumed by the
 * ForYouBoard admin console.
 *
 * RULE: every file that needs to call a backend route MUST import the path
 * from here. Never inline a string like `"/api/foo"` in a fetch call.
 *
 * - Each entry is a function so dynamic segments stay typed.
 * - Group by module for readability.
 * - When adding a new endpoint, update both this file and any DAL/action
 *   that uses it. No exceptions.
 */

export const API_ROUTES = {
  // ─── Admin auth ────────────────────────────────────────────────────────────
  admin: {
    /** POST — phone + password. Returns `{ token, admin }`. */
    login: () => "/api/admin/login",
    /** POST — register a new admin (super-admin only). */
    register: () => "/api/admin/register",
    /** PUT — the logged-in admin changes their OWN password. Body: { currentPassword, newPassword }. */
    changePassword: () => "/api/admin/password",
    /** GET — current admin's effective permissions. */
    myPermissions: () => "/api/admin/me/permissions",
    /** GET — list every active role. POST — create a custom role. Body: { name, displayName, permissionIds }. */
    roles: () => "/api/admin/roles",
    /** PATCH — add/remove permissions on a role. Body: { add: string[], remove: string[] }. */
    updateRolePermissions: (roleId: string) =>
      `/api/admin/roles/${roleId}/permissions`,
    /** GET — list every active permission, grouped by module. */
    permissions: () => "/api/admin/permissions",
    /** POST — create a new permission. Body: { code, name, module, category }. */
    createPermission: () => "/api/admin/permissions",
    /** POST — grant a single permission to an admin. */
    grantPermission: (adminId: string) =>
      `/api/admin/admins/${adminId}/grant-permission`,
    /** GET — list all admin accounts (dedicated admin profile endpoint). */
    listAdmins: () => "/api/admin/admins",
    /** PATCH — change an admin's role. */
    updateAdminRole: (adminId: string) => `/api/admin/admins/${adminId}/role`,
    /** PATCH — deactivate an admin. */
    deactivateAdmin: (adminId: string) => `/api/admin/admins/${adminId}/deactivate`,
    /** PATCH — reactivate an admin. */
    reactivateAdmin: (adminId: string) => `/api/admin/admins/${adminId}/reactivate`,
  },

  // ─── Admin: drivers ────────────────────────────────────────────────────────
  adminDrivers: {
    /** GET — drivers awaiting validation. */
    pending: () => "/api/admin/drivers/pending",
    /** GET — list every driver, enriched with user and vehicle info. */
    list: () => "/api/admin/drivers",
    /** GET — list every currently online driver, with GPS position. */
    online: () => "/api/admin/drivers/online",
    /** PATCH — approve a pending driver. */
    approve: (driverId: string) => `/api/admin/drivers/${driverId}/approve`,
    /** PATCH — suspend a driver. */
    suspend: (driverId: string) => `/api/admin/drivers/${driverId}/suspend`,
    /** PATCH — reactivate a suspended driver. */
    reactivate: (driverId: string) =>
      `/api/admin/drivers/${driverId}/reactivate`,
    /** GET — historique paginé des sessions de connexion d'un driver. Query: page, limit, from, to. */
    sessions: (driverId: string) => `/api/admin/drivers/${driverId}/sessions`,
    /** GET — temps de connexion par jour calendaire (Bénin) pour un driver. Query: from, to (YYYY-MM-DD). */
    sessionsDaily: (driverId: string) => `/api/admin/drivers/${driverId}/sessions/daily`,
    /** GET — rapport flotte : temps de connexion par jour pour tous les drivers actifs. Query: from, to[, driverId]. */
    connectionTime: () => `/api/admin/drivers/connection-time`,
    /** PATCH — modifier les infos personnelles du driver (firstName, lastName, phoneNumber, email, gender, address). */
    updateInfo: (driverId: string) => `/api/admin/drivers/${driverId}/info`,
    /** GET — liste tous les drivers en dette (walletEARNINGS < 0). Query: page, limit. */
    commissionDebts: () => "/api/admin/drivers/commission-debts",
    /** GET — détail des transactions à l'origine de la dette d'un driver. Query: page, limit. */
    driverCommissionDebts: (driverId: string) => `/api/admin/drivers/${driverId}/commission-debts`,
    /** PATCH — changer le type de service du driver. Body: { driverType: "VTC" | "DELIVERY" | "BOTH" }. */
    updateDriverType: (driverId: string) => `/api/admin/drivers/${driverId}/driver-type`,
  },

  // ─── Admin: partners ───────────────────────────────────────────────────────
  adminPartners: {
    /** GET — partners awaiting validation. */
    pending: () => "/api/admin/partners/pending",
    /** PATCH — validate a partner. */
    validate: (partnerId: string) =>
      `/api/admin/partners/${partnerId}/validate`,
  },

  // ─── Admin: pricing ────────────────────────────────────────────────────────
  adminPricing: {
    /** POST — create a pricing grid. */
    createGrid: () => "/api/admin/pricing-grid",
    /** GET — currently active pricing grid. */
    activeGrid: () => "/api/admin/pricing-grid/active",
    // NOTE: GET /api/admin/ride-pricing/:vehicleType n'existe PAS côté backend —
    // uniquement PATCH. Ne pas appeler getRidePricing en GET.
    /** @deprecated GET n'existe pas côté backend — utiliser updateRidePricing (PATCH) uniquement. */
    getRidePricing: (vehicleType: string) =>
      `/api/admin/ride-pricing/${vehicleType}`,
    /** PATCH — update ride pricing for a vehicle type. Body: RidePricingInput. */
    updateRidePricing: (vehicleType: string) =>
      `/api/admin/ride-pricing/${vehicleType}`,
  },

  // ─── Admin: pricing profiles ───────────────────────────────────────────────
  adminPricingProfiles: {
    /** GET — list pricing profiles (query: serviceKey?, vehicleType?, isActive?). */
    list: () => "/api/admin/pricing/profiles",
    /** POST — create a pricing profile. */
    create: () => "/api/admin/pricing/profiles",
    /** GET — pricing profile detail. */
    detail: (id: string) => `/api/admin/pricing/profiles/${id}`,
    /** PATCH — update a pricing profile (inactive only). */
    update: (id: string) => `/api/admin/pricing/profiles/${id}`,
    /** DELETE — delete a pricing profile (inactive only). */
    remove: (id: string) => `/api/admin/pricing/profiles/${id}`,
    /** POST — activate a pricing profile. */
    activate: (id: string) => `/api/admin/pricing/profiles/${id}/activate`,
    /** POST — deactivate a pricing profile. */
    deactivate: (id: string) =>
      `/api/admin/pricing/profiles/${id}/deactivate`,
  },

  // ─── Admin: pricing zones ──────────────────────────────────────────────────
  adminPricingZones: {
    /** GET — list pricing zones. Query: serviceKey? */
    list: () => "/api/admin/pricing/zones",
    /** POST — create a zone. Body: { serviceKey, code, name, type }. */
    create: () => "/api/admin/pricing/zones",
    /** PATCH — update a zone (name, type, isActive). Code is immutable. */
    update: (id: string) => `/api/admin/pricing/zones/${id}`,
    /** DELETE — delete a zone. */
    remove: (id: string) => `/api/admin/pricing/zones/${id}`,
  },

  // ─── Admin: promo codes ────────────────────────────────────────────────────
  adminPromos: {
    /** POST — create a promo code. */
    create: () => "/api/admin/promo-codes",
    /** GET — list promo codes. */
    list: () => "/api/admin/promo-codes",
    /** PATCH — attach (or detach) this code to an affiliate. Body: { affiliateId: string | null, commissionRate: number | null }. Permission: promo.manage. */
    setAffiliate: (id: string) => `/api/admin/promo-codes/${id}/affiliate`,
    /** PATCH — toggle active flag. */
    toggle: (id: string) => `/api/admin/promo-codes/${id}/toggle`,
    /** POST — validate a promo code before a ride (used by passenger app). */
    validate: () => "/api/admin/promo-codes/validate",
  },

  // ─── Admin: surge rules ────────────────────────────────────────────────────
  adminSurge: {
    /** GET — list surge rules. */
    list: () => "/api/admin/surge-rules",
    /** POST — create a surge rule. */
    create: () => "/api/admin/surge-rules",
    /** PATCH — update a surge rule. */
    update: (ruleId: string) => `/api/admin/surge-rules/${ruleId}`,
    /** DELETE — delete a surge rule. */
    remove: (ruleId: string) => `/api/admin/surge-rules/${ruleId}`,
  },

  // ─── Admin: rides ──────────────────────────────────────────────────────────
  adminRides: {
    /** GET — list every ride (filters: status, vehicleType, fromDate, toDate). */
    list: () => "/api/admin/rides",
    /** GET — full enriched ride detail (driver, vehicle, GPS, financials…). */
    detail: (rideId: string) => `/api/admin/rides/${rideId}`,
    /** PATCH — admin force a status transition (body: { status, reason }). */
    forceStatus: (rideId: string) => `/api/admin/rides/${rideId}/status`,
    /** GET — permanent telemetry summary of a ride (distances, durations, system decisions, GPS signal quality). Permission: ride.telemetry.view. EVERY access is logged (fail-closed: 503 if the log write fails). */
    telemetry: (rideId: string) => `/api/admin/rides/${rideId}/telemetry`,
    /** GET — raw GPS track as GeoJSON for map replay. Query: every (decimation, default 1). Permission: ride.telemetry.track.view (OPS_ADMIN only). EVERY access is logged. */
    /** GET — trace de règlement de la garantie d'une réservation (gel, libération/capture/imputation, compensation, pénalité). Permission: ride.scheduled.settlement.view. */
    guaranteeSettlement: (rideId: string) => `/api/admin/rides/${rideId}/guarantee-settlement`,
    track: (rideId: string, every?: number) =>
      `/api/admin/rides/${rideId}/track${every && every > 1 ? `?every=${every}` : ""}`,
  },

  // ─── Admin: réservations programmées (bascule manuelle) ────────────────────
  adminScheduledRides: {
    /** GET — réservations sans pilote à l'approche du départ + pilotes candidats. Permission: ride.scheduled.assign.view. */
    manualAssignmentQueue: () => "/api/admin/scheduled-rides/manual-assignment",
    /** POST — impose un pilote à une réservation (il ne peut pas refuser). Body: { driverId } SEUL. Permission: ride.scheduled.assign. */
    assignDriver: (rideId: string) => `/api/admin/scheduled-rides/${rideId}/manual-assignment`,
  },

  // ─── Driver: ride lifecycle (admin uses these to act on behalf of driver) ──
  driverRides: {
    /** PATCH — driver accepts a REQUESTED/MATCHED ride. No body. */
    accept: (rideId: string) => `/api/driver/rides/${rideId}/accept`,
    /** PATCH — driver marks arrived at pickup. No body. */
    arrived: (rideId: string) => `/api/driver/rides/${rideId}/arrived`,
    /** PATCH — driver starts the trip. No body. */
    start: (rideId: string) => `/api/driver/rides/${rideId}/start`,
    /** PATCH — driver pauses an in-progress trip. No body. */
    pause: (rideId: string) => `/api/driver/rides/${rideId}/pause`,
    /** PATCH — driver resumes a paused trip. No body. */
    resume: (rideId: string) => `/api/driver/rides/${rideId}/resume`,
    /** PATCH — driver completes the trip (body: actualDistanceMeters,
     *  actualDurationSeconds, passengerWalletId, driverWalletId). */
    complete: (rideId: string) => `/api/driver/rides/${rideId}/complete`,
    /** PATCH — driver cancels the ride (body: { reason }). */
    cancel: (rideId: string) => `/api/driver/rides/${rideId}/cancel`,
  },

  // ─── Admin: delivery (B2C — commandes individuelles passager → driver) ────
  adminDelivery: {
    /** GET — list every B2C delivery order, sorted by createdAt desc,
     *  enriched with driver + passenger. */
    list: () => "/api/admin/delivery",
    /** GET — full enriched detail (parcel, recipient, OTP, photos…). */
    detail: (orderId: string) => `/api/admin/delivery/${orderId}`,
    /** DELETE — cancel any delivery (body: { reason? }). */
    cancel: (orderId: string) => `/api/admin/delivery/${orderId}`,
  },

  // ─── Admin: wallets ────────────────────────────────────────────────────────
  adminWallets: {
    /** GET — list every wallet. Query: walletType, status, page, limit. */
    list: () => "/api/admin/wallets",
    /** GET — full wallet detail (balance + metadata + owner). */
    detail: (walletId: string) => `/api/admin/wallets/${walletId}`,
    /** POST — manually credit a sub-balance (admin only). Body: { balanceType, amount, type, description }. */
    credit: (walletId: string) => `/api/wallets/${walletId}/credit`,
    /** POST — manually debit a wallet (admin only). Body: { balanceType, amount, type, description }. */
    debit: (walletId: string) => `/api/wallets/${walletId}/debit`,
    /** GET — list withdrawal requests. Query: page, limit. */
    withdrawals: () => "/api/admin/withdrawals",
    /** PATCH — approve a PENDING withdrawal. No body. */
    approveWithdrawal: (id: string) => `/api/admin/withdrawals/${id}/approve`,
    /** PATCH — reject a PENDING withdrawal. Body: { reason: string }. */
    rejectWithdrawal: (id: string) => `/api/admin/withdrawals/${id}/reject`,
    /** GET — list all transactions (admin). Query: type, walletType, direction, page, limit. */
    transactions: () => "/api/admin/transactions",
  },

  // ─── Admin: wallet grant campaigns (bulk credit, maker-checker) ────────────
  adminWalletGrants: {
    /** POST — preview before creating. Body: CreateWalletGrantCampaignInput. Permission: wallet.grant.request. */
    preview: () => "/api/admin/wallet/grants/preview",
    /** POST — create a campaign in PENDING state. Permission: wallet.grant.request. */
    create: () => "/api/admin/wallet/grants",
    /** GET — list all campaigns. Query: status, page, limit. Permission: wallet.grant.view. */
    list: () => "/api/admin/wallet/grants",
    /** GET — full campaign detail with grant lines. Permission: wallet.grant.view. */
    detail: (id: string) => `/api/admin/wallet/grants/${id}`,
    /** POST — approve and execute a PENDING campaign. Permission: wallet.grant.approve. */
    approve: (id: string) => `/api/admin/wallet/grants/${id}/approve`,
    /** POST — reject a PENDING campaign. Permission: wallet.grant.approve. */
    reject: (id: string) => `/api/admin/wallet/grants/${id}/reject`,
    /** POST — cancel (requester can cancel their own PENDING campaign). Permission: wallet.grant.request. */
    cancel: (id: string) => `/api/admin/wallet/grants/${id}/cancel`,
    /** POST — retry failed grant lines. Permission: wallet.grant.approve. */
    retryFailed: (id: string) => `/api/admin/wallet/grants/${id}/retry-failed`,
  },

  // ─── Admin: affiliates (programme d'affiliation) ──────────────────────────
  affiliates: {
    /** GET — list all affiliate profiles. Permission: affiliate.view. */
    list: () => "/api/admin/affiliates",
    /** GET — eligibility of a phone number BEFORE creation (NO_ACCOUNT | NO_PASSENGER_PROFILE | ALREADY_AFFILIATE | ELIGIBLE). Permission: affiliate.view. */
    eligibility: (phone: string) => `/api/admin/affiliates/eligibility?phone=${encodeURIComponent(phone)}`,
    /** POST — create an affiliate profile for an EXISTING passenger account. Body: CreateAffiliateProfileInput. Permission: affiliate.manage. */
    create: () => "/api/admin/affiliates",
    /** GET — full admin detail of one affiliate. Permission: affiliate.view. */
    detail: (id: string) => `/api/admin/affiliates/${id}`,
    /** GET — global affiliate config. Permission: affiliate.config.manage. */
    config: () => "/api/admin/affiliates/config",
    /** PATCH — update global affiliate config. Permission: affiliate.config.manage. */
    updateConfig: () => "/api/admin/affiliates/config",
    /** PATCH — update a profile's commission rate. Body: { commissionRate }. Permission: affiliate.manage. */
    updateCommissionRate: (id: string) => `/api/admin/affiliates/${id}/commission-rate`,
    /** POST — suspend a profile. Body: { mode, reason }. Permission: affiliate.manage. */
    suspend: (id: string) => `/api/admin/affiliates/${id}/suspend`,
    /** POST — reactivate a suspended profile. Permission: affiliate.manage. */
    reactivate: (id: string) => `/api/admin/affiliates/${id}/reactivate`,
    /** POST — permanently close a partnership (ACTIVE|SUSPENDED → CLOSED). Body: { reason } required. Permission: affiliate.manage. */
    close: (id: string) => `/api/admin/affiliates/${id}/close`,
    /** POST — reopen a closed partnership (CLOSED → ACTIVE). Body: { reason } required. Permission: affiliate.manage. */
    reopen: (id: string) => `/api/admin/affiliates/${id}/reopen`,
    /** GET — full commission detail. Permission: affiliate.view. */
    commissionDetail: (commissionId: string) => `/api/admin/affiliates/commissions/${commissionId}`,
    /** POST — hold (freeze) a commission. Body: { reason }. Permission: affiliate.manage. */
    holdCommission: (commissionId: string) => `/api/admin/affiliates/commissions/${commissionId}/hold`,
    /** POST — release a held commission. Permission: affiliate.manage. */
    releaseCommission: (commissionId: string) => `/api/admin/affiliates/commissions/${commissionId}/release`,
    /** POST — cancel a held commission. Body: { reason }. Permission: affiliate.manage. */
    cancelCommission: (commissionId: string) => `/api/admin/affiliates/commissions/${commissionId}/cancel`,
    /** GET — durable trace of every affiliated promo usage that produced NO commission
     * (profile not found/suspended/closed/sanctioned, self-referral, zero rate, missing
     * base amount, exhausted net amount…). Permission: affiliate.view. */
    commissionSkips: (query?: {
      affiliateId?: string;
      reason?: string;
      resolved?: boolean;
      from?: string;
      to?: string;
      limit?: number;
      offset?: number;
    }) => {
      const p = new URLSearchParams();
      if (query?.affiliateId) p.set("affiliateId", query.affiliateId);
      if (query?.reason) p.set("reason", query.reason);
      if (query?.resolved !== undefined) p.set("resolved", String(query.resolved));
      if (query?.from) p.set("from", query.from);
      if (query?.to) p.set("to", query.to);
      if (query?.limit !== undefined) p.set("limit", String(query.limit));
      if (query?.offset !== undefined) p.set("offset", String(query.offset));
      const qs = p.toString();
      return `/api/admin/affiliates/commission-skips${qs ? `?${qs}` : ""}`;
    },
  },

  // ─── Admin: payments ───────────────────────────────────────────────────────
  // adminPayments.intents → GET /api/admin/payments/intents — ❌ 500 côté backend,
  // permission non configurée. Ne pas utiliser tant que le backend n'est pas corrigé.
  // adminPayments: {
  //   intents: () => "/api/admin/payments/intents",
  // },

  // ─── Vehicles ──────────────────────────────────────────────────────────────
  vehicles: {
    /** GET — public-ish vehicle detail (admin is also allowed). */
    detail: (id: string) => `/api/vehicles/${id}`,
    /** POST — create a platform-owned vehicle. */
    create: () => "/api/vehicles/admin/add",
    /** GET — list every vehicle. */
    list: () => "/api/vehicles/admin/all",
    /** GET — vehicles owned by a specific driver. */
    byDriver: (driverId: string) => `/api/vehicles/admin/driver/${driverId}`,
    /** PUT — update a vehicle. */
    update: (id: string) => `/api/vehicles/admin/${id}`,
    /** DELETE — admin-level delete. */
    remove: (id: string) => `/api/vehicles/admin/${id}`,
    /** POST — verify a vehicle. */
    verify: (id: string) => `/api/vehicles/admin/${id}/verify`,
    /** POST — reject a vehicle. */
    reject: (id: string) => `/api/vehicles/admin/${id}/reject`,
    /** POST — assign a platform vehicle to a driver. */
    assign: (id: string) => `/api/vehicles/admin/${id}/assign`,
    /** POST — unassign a platform vehicle. */
    unassign: (id: string) => `/api/vehicles/admin/${id}/unassign`,
    /** PATCH — change a vehicle's category. */
    setCategory: (id: string) => `/api/vehicles/admin/${id}/category`,
    /** PATCH — activate SEVERAL categories at once (CAR only; admin may exceed the ceiling, which is then raised). Body: { categories: VehicleCategory[] } — the full list of ticked boxes, it replaces the previous one. */
    setActiveCategories: (id: string) => `/api/vehicles/admin/${id}/active-categories`,
    /** POST — start maintenance. */
    startMaintenance: (id: string) =>
      `/api/vehicles/admin/${id}/maintenance/start`,
    /** POST — complete maintenance. */
    completeMaintenance: (id: string) =>
      `/api/vehicles/admin/${id}/maintenance/complete`,
    /** POST — definitively retire a vehicle. */
    retire: (id: string) => `/api/vehicles/admin/${id}/retire`,
  },

  // ─── Documents (admin) ─────────────────────────────────────────────────────
  documents: {
    /** GET — documents for a given owner (driver, partner, …). */
    byOwner: (ownerId: string) => `/api/documents/admin/owner/${ownerId}`,
    /** POST — verify a document. */
    verify: (id: string) => `/api/documents/admin/${id}/verify`,
    /** POST — reject a document. */
    reject: (id: string) => `/api/documents/admin/${id}/reject`,
    /** GET — issue a signed URL from a private file fileKey. */
    signedUrl: () => "/api/documents/signed-url",
    /** GET — the connected user's own documents (driver/passenger). */
    myDocuments: () => "/api/documents/my-documents",
    /** POST multipart — upload a standalone file. Body fields :
     *  file (binary), documentType, ownerType, vehicleId (when VEHICLE),
     *  expiresAt (optional). Response shape : {documentId, url, fileKey,
     *  isPublic, …}. */
    upload: () => "/api/documents/upload",
    /** PUT multipart — admin replaces a VERIFIED document with a new file.
     *  Status resets to PENDING after replacement. */
    adminReplace: (id: string) => `/api/documents/admin/${id}/replace`,
    /** DELETE — admin deletes a PENDING or REJECTED document (never VERIFIED). */
    adminDelete: (id: string) => `/api/documents/admin/${id}`,
  },

  // ─── Admin: contrats location-vente ────────────────────────────────────────
  adminContracts: {
    /** GET  — liste paginée. Query: page, limit, statut (ACTIF|ROMPU|TERMINE|SOLDE), driverId */
    list: () => "/api/admin/contracts",
    /** POST — créer un contrat. Body: CreateContractInput */
    create: () => "/api/admin/contracts",
    /** GET  — snapshot KPIs de la flotte */
    kpis: () => "/api/admin/contracts/dashboard/kpis",
    /** GET  — journal d'audit. Query: contractId, driverId, action, page, limit */
    auditLogs: () => "/api/admin/contracts/audit-logs",
    /** GET  — détail d'un contrat */
    detail: (id: string) => `/api/admin/contracts/${id}`,
    /** GET  — échéancier d'un contrat */
    installments: (id: string) => `/api/admin/contracts/${id}/installments`,
    /** POST — paiement manuel hors wallet contre la dette d'un contrat. Body: { amount } */
    manualPayment: (contractId: string) =>
      `/api/admin/contracts/${contractId}/manual-payment`,
    /** POST — résilier un contrat. Body: { reason } */
    break: (id: string) => `/api/admin/contracts/${id}/break`,
    /** POST — suspendre un contrat actif. Body: { reason? } */
    suspend: (id: string) => `/api/admin/contracts/${id}/suspend`,
    /** POST — reprendre un contrat suspendu. Body: {} */
    resume: (id: string) => `/api/admin/contracts/${id}/resume`,
    /** POST — débloquer manuellement un chauffeur suspendu pour impayés */
    unblockDriver: (driverId: string) =>
      `/api/admin/contracts/drivers/${driverId}/unblock`,
  },

  // ─── Admin: parrainage ────────────────────────────────────────────────────
  adminReferrals: {
    /** GET — stats globales du programme. */
    stats: () => "/api/admin/referrals/stats",
    /** GET — liste tous les parrainages. Query: status, referralType, dateFrom, dateTo, page, limit. */
    list: () => "/api/admin/referrals",
    /** GET — liste des filleuls (referred). */
    filleuls: () => "/api/admin/referrals/filleuls",
    /** GET — liste des parrains (referrers). */
    parrains: () => "/api/admin/referrals/parrains",
    /** POST — valider manuellement un parrainage. */
    validate: (referralId: string) => `/api/admin/referrals/${referralId}/validate`,
    /** POST — expirer manuellement un parrainage. */
    expire: (referralId: string) => `/api/admin/referrals/${referralId}/expire`,
    /** GET — liste toutes les configs. */
    configs: () => "/api/admin/referrals/config",
    /** GET — config active. */
    activeConfig: () => "/api/admin/referrals/config/active",
    /** POST — créer une config. */
    createConfig: () => "/api/admin/referrals/config",
    /** PUT — mettre à jour une config. */
    updateConfig: (id: string) => `/api/admin/referrals/config/${id}`,
    /** POST — activer une config. */
    activateConfig: (id: string) => `/api/admin/referrals/config/${id}/activate`,
    /** POST — désactiver une config. */
    deactivateConfig: (id: string) => `/api/admin/referrals/config/${id}/deactivate`,
    /** DELETE — supprimer une config. */
    deleteConfig: (id: string) => `/api/admin/referrals/config/${id}`,
  },

  // ─── Admin: wallet PLATFORM revenue ──────────────────────────────────────────
  adminPlatform: {
    /** GET — solde wallet PLATFORM + décomposition des revenus par source.
     *  Query params (optionnels): fromDate (ISO), toDate (ISO). */
    revenue: () => "/api/admin/platform/revenue",
  },

  appConfig: {
    /** GET — list all mobile app version configs. */
    list: () => "/api/app-config",
    /** PUT — create or update a version config for a given appType × platform. */
    upsert: (appType: string, platform: string) =>
      `/api/app-config/${appType}/${platform}`,
  },

  // ─── Admin: driver bonus — Système C (Paliers / Bienvenue) ──────────────
  adminDriverBonus: {
    /** GET  — liste tous les barèmes (query: vehicleCategory?, isActive?). */
    configs: () => "/api/admin/driver-bonus/config",
    /** POST — créer un barème (SUPER_ADMIN). */
    createConfig: () => "/api/admin/driver-bonus/config",
    /** GET  — détail d'un barème. */
    config: (id: string) => `/api/admin/driver-bonus/config/${id}`,
    /** PUT  — mettre à jour un barème. */
    updateConfig: (id: string) => `/api/admin/driver-bonus/config/${id}`,
    /** DELETE — soft-delete (refusé si actif). */
    deleteConfig: (id: string) => `/api/admin/driver-bonus/config/${id}`,
    /** POST — activer (désactive l'éventuel actif de même catégorie). */
    activateConfig: (id: string) => `/api/admin/driver-bonus/config/${id}/activate`,
    /** POST — désactiver. */
    deactivateConfig: (id: string) => `/api/admin/driver-bonus/config/${id}/deactivate`,
    /** GET  — historique des bonus déjà versés (query: driverId?, vehicleCategory?, from?, to?, page?, limit?). */
    awards: () => "/api/admin/driver-bonus/awards",

    // ── Système A — Activité quotidienne ─────────────────────────────────
    /** GET  — liste barèmes activité (query: vehicleCategory?, isActive?, includeDeleted?). */
    activityConfigs: () => "/api/admin/driver-bonus/activity-config",
    /** POST — créer un barème activité. Body: { name, description?, vehicleCategory, tiers }. */
    createActivityConfig: () => "/api/admin/driver-bonus/activity-config",
    /** GET  — détail d'un barème activité. */
    activityConfig: (id: string) => `/api/admin/driver-bonus/activity-config/${id}`,
    /** PUT  — mettre à jour. */
    updateActivityConfig: (id: string) => `/api/admin/driver-bonus/activity-config/${id}`,
    /** DELETE — soft-delete. */
    deleteActivityConfig: (id: string) => `/api/admin/driver-bonus/activity-config/${id}`,
    /** POST — activer. */
    activateActivityConfig: (id: string) => `/api/admin/driver-bonus/activity-config/${id}/activate`,
    /** POST — désactiver. */
    deactivateActivityConfig: (id: string) => `/api/admin/driver-bonus/activity-config/${id}/deactivate`,
    /** GET  — journal journalier (query: driverId?, vehicleCategory?, from?, to?, paid?, page?, limit?). */
    activityLedger: () => "/api/admin/driver-bonus/activity-ledger",
    /** GET  — payouts versés (query: driverId?, from?, to?, page?, limit?). */
    activityPayouts: () => "/api/admin/driver-bonus/activity-payouts",

    // ── Système B — Qualité mensuelle ─────────────────────────────────────
    /** GET  — liste barèmes qualité. */
    qualityConfigs: () => "/api/admin/driver-bonus/quality-config",
    /** POST — créer un barème qualité. Body: { name, description?, vehicleCategory, minRidesPerMonth, tiers }. */
    createQualityConfig: () => "/api/admin/driver-bonus/quality-config",
    /** GET  — détail. */
    qualityConfig: (id: string) => `/api/admin/driver-bonus/quality-config/${id}`,
    /** PUT  — mettre à jour. */
    updateQualityConfig: (id: string) => `/api/admin/driver-bonus/quality-config/${id}`,
    /** DELETE — soft-delete. */
    deleteQualityConfig: (id: string) => `/api/admin/driver-bonus/quality-config/${id}`,
    /** POST — activer. */
    activateQualityConfig: (id: string) => `/api/admin/driver-bonus/quality-config/${id}/activate`,
    /** POST — désactiver. */
    deactivateQualityConfig: (id: string) => `/api/admin/driver-bonus/quality-config/${id}/deactivate`,
    /** GET  — journal mensuel (query: driverId?, vehicleCategory?, from?, to?, page?, limit?). */
    qualityLedger: () => "/api/admin/driver-bonus/quality-ledger",

    // ── RunConfig — Cadence & kill-switches ───────────────────────────────
    /** GET  — singleton RunConfig. */
    runConfig: () => "/api/admin/driver-bonus/run-config",
    /** PUT  — mettre à jour le RunConfig. Body: tous champs optionnels. */
    updateRunConfig: () => "/api/admin/driver-bonus/run-config",
  },

  // ─── Admin: driver welcome bonus campaign ─────────────────────────────────
  driverWelcomeBonus: {
    /** GET — config de la campagne bonus de bienvenue (singleton). */
    get: () => "/api/admin/driver-welcome-bonus",
    /** PATCH — modifier la campagne. Body: { bonusAmountFcfa?, maxEligibleDrivers?, isActive? }. */
    configure: () => "/api/admin/driver-welcome-bonus",
  },

  // ─── Admin: wallet config (frais P2P, consolidation, minimums de retrait) ──
  adminWalletConfig: {
    /** GET — lire la config wallet (singleton). */
    get: () => "/api/admin/wallet-config",
    /** PATCH — mettre à jour la config. Tous les champs sont optionnels. */
    update: () => "/api/admin/wallet-config",
  },

  // ─── Admin: finance — vue créances croisées ────────────────────────────────
  adminFinance: {
    /** GET — vue agrégée des créances par driver (contrats + commissions).
     *  Query: page (défaut 1), limit (défaut 20, max 100). */
    receivablesOverview: () => "/api/admin/finance/receivables-overview",
  },

  // ─── System config (clés dynamiques en base) ──────────────────────────────
  systemConfig: {
    /** GET  — lister toutes les clés de config système. */
    list: () => "/api/app-config/config",
    /** GET  — lire une clé de config système (ex: PAYMENT_TOLERANCE_DAYS) */
    get: (key: string) => `/api/app-config/config/${key}`,
    /** PUT  — mettre à jour une clé. Body: { value: string }. Rôle: SUPER_ADMIN */
    update: (key: string) => `/api/app-config/config/${key}`,
  },

  // ─── Admin: users (passengers, drivers by role) ────────────────────────────
  adminUsers: {
    /** GET — list users filtered by role, search, isActive. */
    list: () => "/api/admin/users",
  },

  // ─── Notifications (admin can read) ────────────────────────────────────────
  notifications: {
    /** GET — list notifications for current user. */
    list: () => "/api/notifications",
    /** PATCH — mark a notification as read. */
    markRead: (notificationId: string) =>
      `/api/notifications/${notificationId}/read`,
    /** GET — notification stats. */
    stats: () => "/api/notifications/stats",
  },
} as const;

export type ApiRoutes = typeof API_ROUTES;
