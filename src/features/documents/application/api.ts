import "server-only";

import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import type { DocumentMetadata, OwnerType } from "../domain/document";

function asDocuments(raw: unknown): DocumentMetadata[] {
  if (Array.isArray(raw)) return raw as DocumentMetadata[];
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.documents)) return obj.documents as DocumentMetadata[];
    if (Array.isArray(obj.data)) return obj.data as DocumentMetadata[];
  }
  return [];
}

export async function listDocumentsByOwner(
  ownerId: string,
  ownerType: OwnerType = "DRIVER",
): Promise<DocumentMetadata[]> {
  // The backend guard requires vehicleId in query when ownerType=VEHICLE.
  // When ownerId IS the vehicleId, pass it in both path and query.
  const query: Record<string, string> = { ownerType };
  if (ownerType === "VEHICLE") query.vehicleId = ownerId;
  const raw = await apiFetch<unknown>(API_ROUTES.documents.byOwner(ownerId), {
    query,
  });
  const docs = asDocuments(raw);
  if (docs.length === 0 && raw) {
    console.warn(
      `[documents] unexpected shape for owner/${ownerId}:`,
      JSON.stringify(raw).slice(0, 200),
    );
  }
  return docs;
}

/**
 * GET /api/documents/signed-url — issue a short-lived signed URL for a
 * private document. Forwarded from a Server Action so the key never has
 * to be exposed to the client until we hand it the resulting URL.
 */
export async function getDocumentSignedUrl(
  fileKey: string,
): Promise<string | null> {
  const raw = await apiFetch<unknown>(API_ROUTES.documents.signedUrl(), {
    query: { key: fileKey },
  });
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (typeof obj.url === "string") return obj.url;
    if (typeof obj.signedUrl === "string") return obj.signedUrl;
    if (obj.data && typeof obj.data === "object") {
      const inner = obj.data as Record<string, unknown>;
      if (typeof inner.url === "string") return inner.url;
      if (typeof inner.signedUrl === "string") return inner.signedUrl;
    }
  }
  return null;
}
