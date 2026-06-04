"use server";

import { revalidatePath } from "next/cache";
import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import { ApiError } from "@/shared/lib/api/types";

export interface ActionResult<T = undefined> {
  ok: boolean;
  message: string;
  data?: T;
}

function fail<T>(error: unknown, fallback: string): ActionResult<T> {
  if (error instanceof ApiError) {
    return { ok: false, message: error.message || fallback };
  }
  return {
    ok: false,
    message: error instanceof Error ? error.message : fallback,
  };
}

export interface ForceRideStatusResult {
  rideId: string;
  rideNumber: string;
  oldStatus: string;
  newStatus: string;
  reason: string;
}

/**
 * PATCH /api/admin/rides/{rideId}/status — admin force a status transition.
 * Allowed transitions:
 *   - any → CANCELLED_SYSTEM
 *   - IN_PROGRESS / PAUSED → COMPLETED
 *   - DISPUTED → COMPLETED / RATED
 */
export async function forceRideStatusAction(
  rideId: string,
  status: string,
  reason: string,
): Promise<ActionResult<ForceRideStatusResult>> {
  try {
    const data = await apiFetch<ForceRideStatusResult>(
      API_ROUTES.adminRides.forceStatus(rideId),
      { method: "PATCH", body: { status, reason } },
    );
    revalidatePath("/vtc/rides");
    revalidatePath(`/vtc/rides/${rideId}`);
    return { ok: true, message: data.rideNumber ?? "Statut forcé.", data };
  } catch (e) {
    return fail(e, "Force-status impossible.");
  }
}

/**
 * Driver-side lifecycle endpoints. These are exposed in the swagger under
 * `/api/driver/rides/{id}/*`. Calling them from the admin console lets
 * ops unstick a ride when the driver app fails (lost network, crash,
 * no-show). The backend authorizes admin tokens to act on behalf of
 * the assigned driver.
 *
 * Body shapes:
 *   - accept/arrived/start/pause/resume → empty
 *   - cancel → { reason }
 *   - complete → { actualDistanceMeters, actualDurationSeconds,
 *                  passengerWalletId, driverWalletId }
 */

type SimpleDriverAction =
  | "accept"
  | "arrived"
  | "start"
  | "pause"
  | "resume";

const DRIVER_ENDPOINT: Record<
  SimpleDriverAction,
  (rideId: string) => string
> = {
  accept: (id) => API_ROUTES.driverRides.accept(id),
  arrived: (id) => API_ROUTES.driverRides.arrived(id),
  start: (id) => API_ROUTES.driverRides.start(id),
  pause: (id) => API_ROUTES.driverRides.pause(id),
  resume: (id) => API_ROUTES.driverRides.resume(id),
};

const SIMPLE_ACTION_LABEL: Record<SimpleDriverAction, string> = {
  accept: "Course acceptée.",
  arrived: "Driver marqué arrivé.",
  start: "Course démarrée.",
  pause: "Course mise en pause.",
  resume: "Course reprise.",
};

async function callSimpleDriverAction(
  rideId: string,
  action: SimpleDriverAction,
): Promise<ActionResult<unknown>> {
  try {
    const data = await apiFetch<unknown>(DRIVER_ENDPOINT[action](rideId), {
      method: "PATCH",
    });
    revalidatePath("/vtc/rides");
    revalidatePath(`/vtc/rides/${rideId}`);
    return { ok: true, message: SIMPLE_ACTION_LABEL[action], data };
  } catch (e) {
    return fail(e, `${action} impossible.`);
  }
}

// Next.js requires every "use server" export to be an async function
// declaration (not an arrow / not a const) — even if it just delegates.
export async function driverAcceptRideAction(rideId: string) {
  return callSimpleDriverAction(rideId, "accept");
}
export async function driverArrivedRideAction(rideId: string) {
  return callSimpleDriverAction(rideId, "arrived");
}
export async function driverStartRideAction(rideId: string) {
  return callSimpleDriverAction(rideId, "start");
}
export async function driverPauseRideAction(rideId: string) {
  return callSimpleDriverAction(rideId, "pause");
}
export async function driverResumeRideAction(rideId: string) {
  return callSimpleDriverAction(rideId, "resume");
}

/** PATCH /api/driver/rides/{id}/cancel — driver cancels (body: reason). */
export async function driverCancelRideAction(
  rideId: string,
  reason: string,
): Promise<ActionResult<unknown>> {
  try {
    const data = await apiFetch<unknown>(API_ROUTES.driverRides.cancel(rideId), {
      method: "PATCH",
      body: { reason },
    });
    revalidatePath("/vtc/rides");
    revalidatePath(`/vtc/rides/${rideId}`);
    return { ok: true, message: "Course annulée côté driver.", data };
  } catch (e) {
    return fail(e, "Annulation driver impossible.");
  }
}

export interface DriverCompleteBody {
  actualDistanceMeters: number;
  actualDurationSeconds: number;
  passengerWalletId: string;
  driverWalletId: string;
}

/** PATCH /api/driver/rides/{id}/complete — needs GPS + wallets. */
export async function driverCompleteRideAction(
  rideId: string,
  body: DriverCompleteBody,
): Promise<ActionResult<unknown>> {
  try {
    const data = await apiFetch<unknown>(
      API_ROUTES.driverRides.complete(rideId),
      { method: "PATCH", body },
    );
    revalidatePath("/vtc/rides");
    revalidatePath(`/vtc/rides/${rideId}`);
    return { ok: true, message: "Course terminée.", data };
  } catch (e) {
    return fail(e, "Complete impossible.");
  }
}
