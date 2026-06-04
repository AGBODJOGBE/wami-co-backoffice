"use client";

import { useEffect, useState } from "react";
import {
  Download,
  ExternalLink,
  FileText,
  Loader2,
} from "lucide-react";
import { Modal } from "@/shared/ui/modal";
import { Button } from "@/shared/ui/button";
import { getDocumentOpenUrlAction } from "../application/actions";
import {
  DOCUMENT_TYPE_LABELS,
  isImageDocument,
  type DocumentMetadata,
} from "../domain/document";

function hasImageExtension(name?: string | null): boolean {
  if (!name) return false;
  return /\.(png|jpe?g|gif|webp|avif|heic|svg)(\?|$)/i.test(name);
}
function hasPdfExtension(name?: string | null): boolean {
  if (!name) return false;
  return /\.pdf(\?|$)/i.test(name);
}

/** Best-effort detection: doc.type is a hint, originalName is the truth. */
export function isImagePreview(doc: DocumentMetadata): boolean {
  return isImageDocument(doc) || hasImageExtension(doc.originalName);
}
export function isPdfPreview(doc: DocumentMetadata): boolean {
  return hasPdfExtension(doc.originalName);
}

export interface DocumentPreviewModalProps {
  open: boolean;
  doc: DocumentMetadata | null;
  onClose: () => void;
}

/**
 * Renders a document inline (no popup, no new tab):
 * - Images: full-bleed `<img>` (max 70vh, contained)
 * - PDFs: native `<iframe>` (browser PDF viewer)
 * - Other: fallback card with download & open-in-new-tab affordances
 *
 * For private documents (those without a permanent `url`), the modal asks
 * the BFF for a short-lived signed URL via `getDocumentOpenUrlAction`.
 */
export function DocumentPreviewModal({
  open,
  doc,
  onClose,
}: DocumentPreviewModalProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !doc) {
      setUrl(null);
      setError(null);
      setLoading(false);
      return;
    }
    // Public docs: use the permanent URL directly.
    if (doc.url && doc.isPublic) {
      setUrl(doc.url);
      return;
    }
    // Otherwise mint a signed URL — also fine when isPublic is undefined
    // and only fileKey is known.
    setLoading(true);
    let cancelled = false;
    void getDocumentOpenUrlAction({
      directUrl: doc.url,
      fileKey: doc.fileKey,
    }).then((r) => {
      if (cancelled) return;
      if (r.ok && r.data) setUrl(r.data.url);
      else setError(r.message);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, doc]);

  if (!doc) return null;

  const kind = isImagePreview(doc)
    ? "image"
    : isPdfPreview(doc)
      ? "pdf"
      : "other";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={DOCUMENT_TYPE_LABELS[doc.type]}
      description={doc.originalName}
      size="xl"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {url ? (
              <>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
                >
                  <ExternalLink className="size-3.5" />
                  Nouvel onglet
                </a>
                <a
                  href={url}
                  download={doc.originalName}
                  className="inline-flex items-center gap-1.5 text-xs text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
                >
                  <Download className="size-3.5" />
                  Télécharger
                </a>
              </>
            ) : null}
          </div>
          <Button variant="ghost" onClick={onClose}>
            Fermer
          </Button>
        </div>
      }
    >
      {loading && !url ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-[color:var(--muted-foreground)]">
          <Loader2 className="size-5 animate-spin" />
          Chargement de l&apos;aperçu…
        </div>
      ) : error ? (
        <div className="rounded-lg border border-[color:var(--danger)]/30 bg-[color:var(--danger)]/5 p-4 text-sm text-[color:var(--danger)]">
          {error}
        </div>
      ) : url && kind === "image" ? (
        <div className="flex items-center justify-center bg-[color:var(--muted)]/30 p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={DOCUMENT_TYPE_LABELS[doc.type]}
            className="max-h-[72vh] w-auto rounded-md object-contain"
          />
        </div>
      ) : url && kind === "pdf" ? (
        <iframe
          src={url}
          title={doc.originalName}
          className="h-[72vh] w-full rounded-md border border-[color:var(--border)] bg-white"
        />
      ) : url ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <FileText className="size-10 text-[color:var(--muted-foreground)]" />
          <p className="text-sm text-[color:var(--muted-foreground)]">
            Aperçu in-app non disponible pour ce type de fichier.
          </p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[color:var(--primary)] hover:underline"
          >
            <ExternalLink className="size-4" />
            Ouvrir le fichier
          </a>
        </div>
      ) : null}
    </Modal>
  );
}
