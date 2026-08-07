"use client";

import { useEffect, useState, useTransition } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Eye,
  FileText,
  ImageIcon,
  ShieldCheck,
  ShieldX,
} from "lucide-react";
import { CanView } from "@/shared/ui/can-view";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Modal } from "@/shared/ui/modal";
import { Textarea } from "@/shared/ui/textarea";
import { toast } from "@/shared/ui/toast";
import { formatDate, formatRelative } from "@/shared/lib/format";
import {
  getDocumentOpenUrlAction,
  rejectDocumentAction,
  verifyDocumentAction,
  type ActionResult,
} from "../application/actions";
import {
  DOCUMENT_STATUS_META,
  DOCUMENT_TYPE_LABELS,
  formatBytes,
  type DocumentMetadata,
} from "../domain/document";
import {
  DocumentPreviewModal,
  isImagePreview,
  isPdfPreview,
} from "./document-preview-modal";

function notify(result: ActionResult<unknown>, successTitle: string) {
  if (result.ok) {
    toast({
      kind: "success",
      title: successTitle,
      description: result.message,
    });
  } else {
    toast({ kind: "error", title: "Échec", description: result.message });
  }
}

interface RejectModalProps {
  open: boolean;
  doc: DocumentMetadata | null;
  onClose: () => void;
  pathHint?: string;
}

function RejectDocumentModal({
  open,
  doc,
  onClose,
  pathHint,
}: RejectModalProps) {
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  if (!doc) return null;

  function submit() {
    if (!doc) return;
    if (reason.trim().length < 5) {
      toast({
        kind: "error",
        title: "Raison requise",
        description: "Précise le motif (au moins 5 caractères).",
      });
      return;
    }
    start(async () => {
      const r = await rejectDocumentAction(
        doc.documentId,
        reason.trim(),
        pathHint,
      );
      notify(r, "Document rejeté");
      if (r.ok) onClose();
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Rejeter le document"
      description={`${DOCUMENT_TYPE_LABELS[doc.type]} — ${doc.originalName}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Annuler
          </Button>
          <Button variant="danger" onClick={submit} isLoading={pending}>
            Rejeter
          </Button>
        </>
      }
    >
      <Textarea
        label="Raison du rejet (visible par le pilote)"
        rows={4}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Photo floue — merci de re-uploader une photo lisible du recto…"
        required
      />
    </Modal>
  );
}

function VerifyButton({
  doc,
  pathHint,
}: {
  doc: DocumentMetadata;
  pathHint?: string;
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="primary"
      size="sm"
      isLoading={pending}
      fullWidth
      onClick={() =>
        start(async () => {
          const r = await verifyDocumentAction(doc.documentId, pathHint);
          notify(r, "Document vérifié");
        })
      }
    >
      <ShieldCheck className="size-4" />
      Vérifier
    </Button>
  );
}

/**
 * Lazy-resolves the preview URL of an image-typed document:
 * - Public uploads with a permanent `url` are used directly
 * - Private uploads need a signed URL minted server-side from `fileKey`
 *
 * Returns `undefined` while pending; `null` if we can't get a URL at all.
 */
function useImageThumbUrl(doc: DocumentMetadata): string | null | undefined {
  const eligible = isImagePreview(doc);
  const initial =
    eligible && doc.url && doc.isPublic ? doc.url : undefined;
  const [url, setUrl] = useState<string | null | undefined>(initial);

  useEffect(() => {
    if (!eligible) {
      setUrl(null);
      return;
    }
    if (doc.url && doc.isPublic) {
      setUrl(doc.url);
      return;
    }
    if (!doc.fileKey && !doc.url) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    void getDocumentOpenUrlAction({
      directUrl: doc.url,
      fileKey: doc.fileKey,
    }).then((r) => {
      if (cancelled) return;
      setUrl(r.ok && r.data ? r.data.url : null);
    });
    return () => {
      cancelled = true;
    };
  }, [eligible, doc.url, doc.isPublic, doc.fileKey]);

  return url;
}

/** Color-coded expiry chip. Returns null when the doc has no expiry. */
function ExpiryChip({ iso }: { iso: string | null }) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
  let toneClass: string;
  let label: string;
  if (days < 0) {
    toneClass =
      "border-[color:var(--danger)]/30 bg-[color:var(--danger)]/10 text-[color:var(--danger)]";
    label = `Expiré depuis ${Math.abs(days)} j`;
  } else if (days <= 30) {
    toneClass =
      "border-[color:var(--danger)]/30 bg-[color:var(--danger)]/10 text-[color:var(--danger)]";
    label = `Expire dans ${days} j`;
  } else if (days <= 90) {
    toneClass =
      "border-[color:var(--warning)]/30 bg-[color:var(--warning)]/10 text-[color:var(--warning)]";
    label = `Expire dans ${days} j`;
  } else {
    toneClass =
      "border-[color:var(--success)]/30 bg-[color:var(--success)]/10 text-[color:var(--success)]";
    label = `Valide ${days} j`;
  }
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium " +
        toneClass
      }
      title={`Expire le ${formatDate(iso)}`}
    >
      <CalendarClock className="size-3" />
      <span>{label}</span>
      <span className="opacity-70">· {formatDate(iso)}</span>
    </span>
  );
}

/** Big clickable thumbnail filling the card top. */
function CardThumbnail({
  doc,
  onOpen,
}: {
  doc: DocumentMetadata;
  onOpen: () => void;
}) {
  const url = useImageThumbUrl(doc);
  const isImage = isImagePreview(doc);
  const isPdf = isPdfPreview(doc);

  return (
    <button
      type="button"
      onClick={onOpen}
      title="Aperçu"
      suppressHydrationWarning
      className="group relative flex h-32 w-full shrink-0 items-center justify-center overflow-hidden rounded-t-xl border-b border-[color:var(--border)] bg-[color:var(--muted)]/40 cursor-pointer"
    >
      {isImage && url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={DOCUMENT_TYPE_LABELS[doc.type]}
          className="h-full w-full object-cover transition group-hover:scale-[1.02]"
        />
      ) : isImage ? (
        <ImageIcon className="size-10 text-[color:var(--secondary)]/60" />
      ) : isPdf ? (
        <div className="flex flex-col items-center justify-center gap-1">
          <FileText className="size-10 text-[color:var(--danger)]/80" />
          <span className="rounded bg-[color:var(--danger)]/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[color:var(--danger)]">
            PDF
          </span>
        </div>
      ) : (
        <FileText className="size-10 text-[color:var(--primary)]/60" />
      )}
      <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-[color:var(--foreground)]">
          <Eye className="size-3.5" />
          Aperçu
        </span>
      </span>
    </button>
  );
}

/** A single document card (used inside the grid). */
function DocumentCard({
  doc,
  onOpen,
  onReject,
  pathHint,
}: {
  doc: DocumentMetadata;
  onOpen: () => void;
  onReject: () => void;
  pathHint?: string;
}) {
  const meta = DOCUMENT_STATUS_META[doc.status];
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--background)] shadow-sm transition hover:shadow-md">
      <div className="relative">
        <CardThumbnail doc={doc} onOpen={onOpen} />
        <span className="absolute right-2 top-2">
          <Badge tone={meta.tone}>{meta.label}</Badge>
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-3">
        <button
          type="button"
          onClick={onOpen}
          suppressHydrationWarning
          className="text-left text-sm font-semibold text-[color:var(--foreground)] hover:underline cursor-pointer"
        >
          {DOCUMENT_TYPE_LABELS[doc.type]}
        </button>

        <ExpiryChip iso={doc.expiresAt} />

        <div className="mt-auto flex items-center gap-2 text-[11px] text-[color:var(--muted-foreground)]">
          <span>{formatBytes(doc.sizeBytes)}</span>
          <span>·</span>
          <span title={doc.createdAt}>
            Uploadé {formatRelative(doc.createdAt)}
          </span>
          {doc.isPublic ? (
            <>
              <span>·</span>
              <span>public</span>
            </>
          ) : null}
        </div>
      </div>

      <footer className="flex flex-col gap-2 border-t border-[color:var(--border)] bg-[color:var(--muted)]/20 p-2">
        {doc.status === "PENDING" ? (
          <CanView permission="document.verify">
            <div className="grid grid-cols-2 gap-2">
              <VerifyButton doc={doc} pathHint={pathHint} />
              <Button variant="outline" size="sm" onClick={onReject} fullWidth>
                <ShieldX className="size-4" />
                Rejeter
              </Button>
            </div>
          </CanView>
        ) : doc.status === "REJECTED" ? (
          <div className="flex items-center justify-center gap-1.5 text-xs text-[color:var(--danger)]">
            <ShieldX className="size-3.5" />
            Document rejeté
          </div>
        ) : doc.status === "VERIFIED" ? (
          <div className="flex items-center justify-center gap-1.5 text-xs text-[color:var(--success)]">
            <CheckCircle2 className="size-3.5" />
            Vérifié
          </div>
        ) : (
          <div className="flex items-center justify-center gap-1.5 text-xs text-[color:var(--warning)]">
            <AlertTriangle className="size-3.5" />
            Expiré
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={onOpen} fullWidth>
          <Eye className="size-4" />
          Voir le document
        </Button>
      </footer>
    </article>
  );
}

export interface DocumentsListProps {
  documents: DocumentMetadata[];
  /** Path used by Server Actions for precise revalidation. */
  pathHint?: string;
  /** Empty-state message. */
  emptyMessage?: string;
  /** Hide the summary badges row (useful when embedded next to a header). */
  compact?: boolean;
}

/**
 * Reusable grid of document cards — used in driver detail, vehicle detail,
 * partner detail, … Any page that consumes `GET /api/documents/admin/owner`
 * (or the connected user's `my-documents`) should drop this in.
 *
 * Clicking a card opens an in-app preview modal (image or PDF). External
 * tab + download stay available inside the modal as secondary affordances.
 */
export function DocumentsList({
  documents,
  pathHint,
  emptyMessage = "Aucun document n'a été uploadé.",
  compact = false,
}: DocumentsListProps) {
  const [rejectTarget, setRejectTarget] = useState<DocumentMetadata | null>(
    null,
  );
  const [previewTarget, setPreviewTarget] = useState<DocumentMetadata | null>(
    null,
  );

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-[color:var(--border)] bg-[color:var(--muted)]/30 px-6 py-12 text-center">
        <FileText className="size-10 text-[color:var(--muted-foreground)]" />
        <p className="text-sm text-[color:var(--muted-foreground)]">
          {emptyMessage}
        </p>
      </div>
    );
  }

  const pendingCount = documents.filter((d) => d.status === "PENDING").length;
  const verifiedCount = documents.filter((d) => d.status === "VERIFIED").length;
  const rejectedCount = documents.filter((d) => d.status === "REJECTED").length;
  const expiredCount = documents.filter((d) => d.status === "EXPIRED").length;

  return (
    <div className="flex flex-col gap-4">
      {!compact ? (
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge tone="warning">{pendingCount} en attente</Badge>
          <Badge tone="success">{verifiedCount} vérifiés</Badge>
          {rejectedCount > 0 ? (
            <Badge tone="danger">{rejectedCount} rejetés</Badge>
          ) : null}
          {expiredCount > 0 ? (
            <Badge tone="neutral">{expiredCount} expirés</Badge>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {documents.map((doc) => (
          <DocumentCard
            key={doc.documentId}
            doc={doc}
            onOpen={() => setPreviewTarget(doc)}
            onReject={() => setRejectTarget(doc)}
            pathHint={pathHint}
          />
        ))}
      </div>

      <RejectDocumentModal
        open={!!rejectTarget}
        doc={rejectTarget}
        onClose={() => setRejectTarget(null)}
        pathHint={pathHint}
      />

      <DocumentPreviewModal
        open={!!previewTarget}
        doc={previewTarget}
        onClose={() => setPreviewTarget(null)}
      />
    </div>
  );
}
