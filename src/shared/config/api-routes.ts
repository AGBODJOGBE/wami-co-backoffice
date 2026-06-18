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
    /** GET — current admin's effective permissions. */
    myPermissions: () => "/api/admin/me/permissions",
    /** GET — list every active role. */
    roles: () => "/api/admin/roles",
    /** GET — list every active permission, grouped by module. */
    permissions: () => "/api/admin/permissions",
    /** POST — grant a single permission to an admin. */
    grantPermission: (adminId: string) =>
      `/api/admin/admins/${adminId}/grant-permission`,
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
    /** GET — fetch the active ride-pricing config for a vehicle type. */
    getRidePricing: (vehicleType: string) =>
      `/api/admin/ride-pricing/${vehicleType}`,
    /** PATCH — update ride pricing for a vehicle type. */
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

  // ─── Admin: promo codes ────────────────────────────────────────────────────
  adminPromos: {
    /** POST — create a promo code. */
    create: () => "/api/admin/promo-codes",
    /** GET — list promo codes. */
    list: () => "/api/admin/promo-codes",
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
    /** PATCH — admin force a status transition (body: { status, reason }). */
    forceStatus: (rideId: string) => `/api/admin/rides/${rideId}/status`,
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
  },

  // ─── Admin: wallets ────────────────────────────────────────────────────────
  adminWallets: {
    /** GET — list every wallet (filters not yet documented). */
    list: () => "/api/admin/wallets",
    /** GET — full wallet detail (balance + metadata + owner). */
    detail: (walletId: string) => `/api/admin/wallets/${walletId}`,
  },

  // ─── Admin: payments ───────────────────────────────────────────────────────
  adminPayments: {
    /** GET — list payment intents (admin observability). */
    intents: () => "/api/admin/payments/intents",
  },

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
