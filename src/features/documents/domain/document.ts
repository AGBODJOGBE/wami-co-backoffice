/**
 * Documents domain (admin perspective).
 * Mirrors the OpenAPI schemas DocumentMetadata / DocumentType / DocumentStatus.
 */

export type DocumentType =
  | "DRIVERS_LICENSE"
  | "IDENTITY_CARD"
  | "CRIMINAL_RECORD"
  | "REGISTRATION_CARD"
  | "INSURANCE"
  | "PICKUP_PHOTO"
  | "DELIVERY_PHOTO"
  | "PROFILE_PHOTO";

export type DocumentStatus = "PENDING" | "VERIFIED" | "REJECTED" | "EXPIRED";

export type OwnerType = "DRIVER" | "PASSENGER" | "VEHICLE";

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  DRIVERS_LICENSE: "Permis de conduire",
  IDENTITY_CARD: "Carte nationale d'identité",
  CRIMINAL_RECORD: "Casier judiciaire",
  REGISTRATION_CARD: "Carte grise",
  INSURANCE: "Attestation d'assurance",
  PICKUP_PHOTO: "Photo de collecte",
  DELIVERY_PHOTO: "Photo de livraison",
  PROFILE_PHOTO: "Photo de profil",
};

export const DOCUMENT_STATUS_META: Record<
  DocumentStatus,
  {
    label: string;
    tone: "warning" | "success" | "danger" | "neutral";
  }
> = {
  PENDING: { label: "En attente", tone: "warning" },
  VERIFIED: { label: "Vérifié", tone: "success" },
  REJECTED: { label: "Rejeté", tone: "danger" },
  EXPIRED: { label: "Expiré", tone: "neutral" },
};

export interface DocumentMetadata {
  documentId: string;
  type: DocumentType;
  originalName: string;
  status: DocumentStatus;
  sizeBytes: number;
  expiresAt: string | null;
  createdAt: string;
  /** Private R2 storage key. Required to mint a signed URL when isPublic
   * is false. Public uploads expose the permanent URL directly. */
  fileKey?: string | null;
  /** Permanent URL when isPublic is true (PROFILE_PHOTO, PICKUP_PHOTO,
   * DELIVERY_PHOTO). For private docs this is undefined — call
   * GET /api/documents/signed-url?key=fileKey to mint a temporary URL. */
  url?: string | null;
  isPublic?: boolean;
}

/** Image-like document types — those we want to preview, not just download. */
export const IMAGE_DOCUMENT_TYPES: DocumentType[] = [
  "PROFILE_PHOTO",
  "PICKUP_PHOTO",
  "DELIVERY_PHOTO",
];

export function isImageDocument(d: Pick<DocumentMetadata, "type">): boolean {
  return IMAGE_DOCUMENT_TYPES.includes(d.type);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}
