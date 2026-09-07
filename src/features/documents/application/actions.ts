"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { API_ROUTES } from "@/shared/config/api-routes";
import { env } from "@/shared/config/env";
import { apiFetch } from "@/shared/lib/api/server";
import {
  ApiError,
  extractFailureMessage,
  type ApiResponse,
} from "@/shared/lib/api/types";
import { SESSION_COOKIE } from "@/features/auth/application/session-cookie";
import { getDocumentSignedUrl } from "./api";
import type {
  DocumentType,
  OwnerType,
} from "../domain/document";

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

/**
 * Verify a document. The path on which the document lives (e.g. driver
 * detail) is unknown to us at action time, so we revalidate the most likely
 * roots. The caller can pass `pathHint` for a precise revalidation.
 */
export async function verifyDocumentAction(
  id: string,
  pathHint?: string,
): Promise<ActionResult> {
  try {
    await apiFetch<unknown>(API_ROUTES.documents.verify(id), {
      method: "POST",
    });
    if (pathHint) revalidatePath(pathHint);
    revalidatePath("/vtc/drivers");
    return { ok: true, message: "Document vérifié." };
  } catch (e) {
    return fail(e, "Vérification impossible.");
  }
}

export async function rejectDocumentAction(
  id: string,
  reason: string,
  pathHint?: string,
): Promise<ActionResult> {
  try {
    await apiFetch<unknown>(API_ROUTES.documents.reject(id), {
      method: "POST",
      body: { reason },
    });
    if (pathHint) revalidatePath(pathHint);
    revalidatePath("/vtc/drivers");
    return { ok: true, message: "Document rejeté." };
  } catch (e) {
    return fail(e, "Rejet impossible.");
  }
}

export interface UploadedDocument {
  documentId: string;
  /** Signed URL (private docs, 1h) or permanent URL (public). */
  url?: string | null;
  /** R2 key for private docs — what the vehicle-creation endpoint stores. */
  fileKey?: string | null;
  type: DocumentType | string;
  ownerType: OwnerType | string;
  ownerId: string;
  isPublic?: boolean;
  originalName?: string;
  sizeBytes?: number;
}

export interface UploadDocumentInput {
  file: File;
  documentType: DocumentType;
  ownerType: OwnerType;
  /** Required when ownerType === "VEHICLE". */
  vehicleId?: string;
  /** ISO date — required for INSURANCE, optional otherwise. */
  expiresAt?: string;
}

/**
 * POST /api/documents/upload — multipart/form-data.
 *
 * Forwards the user-selected File directly to the backend (no JSON
 * encoding, no base64 detour). We can't reuse `apiFetch` because it
 * always stringifies the body — multipart needs the browser-set
 * boundary header, so we go raw `fetch` here.
 */
export async function uploadDocumentAction(
  input: UploadDocumentInput,
): Promise<ActionResult<UploadedDocument>> {
  try {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (!token) return { ok: false, message: "Session expirée." };

    const fd = new FormData();
    fd.set("file", input.file);
    fd.set("documentType", input.documentType);
    fd.set("ownerType", input.ownerType);
    if (input.vehicleId) fd.set("vehicleId", input.vehicleId);
    if (input.expiresAt) fd.set("expiresAt", input.expiresAt);

    const url = `${env.apiBaseUrl}${API_ROUTES.documents.upload()}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      body: fd,
      // multipart: do NOT set Content-Type — the browser/runtime adds
      // the boundary automatically.
    });

    const rawText = await res.text();
    let payload: ApiResponse<UploadedDocument> | null = null;
    try {
      payload = JSON.parse(rawText) as ApiResponse<UploadedDocument>;
    } catch {
      // not JSON — keep rawText for the message
    }

    if (!res.ok || !payload || payload.success === false) {
      const message =
        (payload && payload.success === false
          ? extractFailureMessage(payload)
          : null) ||
        rawText.slice(0, 300).trim() ||
        `Upload échoué (HTTP ${res.status}).`;
      return { ok: false, message };
    }
    return { ok: true, message: "Document uploadé.", data: payload.data };
  } catch (e) {
    return fail(e, "Upload impossible.");
  }
}

/**
 * PUT /api/documents/admin/:id/replace — multipart/form-data.
 *
 * Admin replaces a VERIFIED document with a new file.
 * Status is reset to PENDING by the backend after replacement.
 */
export async function replaceDocumentAction(
  documentId: string,
  file: File,
  pathHint?: string,
): Promise<ActionResult> {
  try {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (!token) return { ok: false, message: "Session expirée." };

    const fd = new FormData();
    fd.set("file", file);

    const url = `${env.apiBaseUrl}${API_ROUTES.documents.adminReplace(documentId)}`;
    const res = await fetch(url, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      body: fd,
    });

    const rawText = await res.text();
    let payload: ApiResponse<unknown> | null = null;
    try { payload = JSON.parse(rawText) as ApiResponse<unknown>; } catch { /* not JSON */ }

    if (!res.ok || !payload || payload.success === false) {
      const message =
        (payload && payload.success === false ? extractFailureMessage(payload) : null) ||
        rawText.slice(0, 300).trim() ||
        `Remplacement échoué (HTTP ${res.status}).`;
      return { ok: false, message };
    }

    if (pathHint) revalidatePath(pathHint);
    revalidatePath("/vtc/drivers");
    return { ok: true, message: "Document remplacé. Statut repassé à En attente." };
  } catch (e) {
    return fail(e, "Remplacement impossible.");
  }
}

/**
 * DELETE /api/documents/admin/:id
 *
 * Admin deletes a PENDING or REJECTED document.
 * VERIFIED documents cannot be deleted (legal proof).
 */
export async function deleteDocumentAdminAction(
  documentId: string,
  pathHint?: string,
): Promise<ActionResult> {
  try {
    await apiFetch<unknown>(API_ROUTES.documents.adminDelete(documentId), {
      method: "DELETE",
    });
    if (pathHint) revalidatePath(pathHint);
    revalidatePath("/vtc/drivers");
    return { ok: true, message: "Document supprimé." };
  } catch (e) {
    return fail(e, "Suppression impossible.");
  }
}

/**
 * Resolve the URL to open for a document:
 *   - If `directUrl` is already provided (public doc), pass it through.
 *   - Otherwise mint a short-lived signed URL from the private fileKey.
 *
 * Called from the client when the user clicks "Ouvrir" — keeps the fileKey
 * resolution on the server so we never leak it via the URL bar.
 */
export async function getDocumentOpenUrlAction(input: {
  directUrl?: string | null;
  fileKey?: string | null;
}): Promise<ActionResult<{ url: string }>> {
  if (input.directUrl) {
    return { ok: true, message: "URL publique", data: { url: input.directUrl } };
  }
  if (!input.fileKey) {
    return { ok: false, message: "Aucun fileKey ni URL pour ce document." };
  }
  try {
    const url = await getDocumentSignedUrl(input.fileKey);
    if (!url) {
      return { ok: false, message: "URL signée indisponible." };
    }
    return { ok: true, message: "OK", data: { url } };
  } catch (e) {
    return fail(e, "Génération de l'URL signée impossible.");
  }
}
