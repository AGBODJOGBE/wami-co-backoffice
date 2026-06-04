"use client";

import { useId, useRef, useState, useTransition } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  ImageIcon,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { toast } from "@/shared/ui/toast";
import {
  uploadDocumentAction,
  type UploadDocumentInput,
  type UploadedDocument,
} from "@/features/documents/application/actions";

const DEFAULT_ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";
const DEFAULT_MAX_MB = 10;

export interface FileUploadValue {
  /** What gets sent to the back when the form is submitted — for vehicle
   *  creation that's the signed URL (private) or permanent URL (public). */
  url: string;
  /** R2 key for private docs (returned by /api/documents/upload). */
  fileKey?: string | null;
  /** Saved server-side document id, useful for later deletion / verify. */
  documentId: string;
  /** Local file metadata for display purposes (filename + preview). */
  fileName: string;
  fileSize: number;
  /** Local object URL for the picked image — used for instant preview
   *  before the server URL comes back. Revoked when the value clears. */
  previewObjectUrl?: string;
}

export interface FileUploadProps {
  /** Visible label above the dropzone. */
  label: string;
  /** What goes into documentType when forwarding to the backend. */
  documentType: UploadDocumentInput["documentType"];
  /** What goes into ownerType when forwarding. */
  ownerType: UploadDocumentInput["ownerType"];
  /** Required when ownerType === "VEHICLE". */
  vehicleId?: string;
  /** Optional ISO date forwarded as expiresAt (assurance, permis…). */
  expiresAt?: string;
  /** Current value (from controlling form state). */
  value: FileUploadValue | null;
  onChange: (next: FileUploadValue | null) => void;
  /** Accept attribute — defaults to "image/jpeg,image/png,image/webp,application/pdf". */
  accept?: string;
  /** Hard cap in MiB — defaults to 10. */
  maxMb?: number;
  /** Required marker (just visual; submit-time validation lives in the form). */
  required?: boolean;
  /** Helper line under the field. */
  hint?: string;
  className?: string;
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} o`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} Ko`;
  return `${(b / (1024 * 1024)).toFixed(1)} Mo`;
}

/**
 * Drop-zone + native file picker, auto-uploads to /api/documents/upload as
 * soon as a file is picked. Shows preview (image thumb or PDF icon),
 * filename, status (uploading / uploaded / error), and a remove button.
 *
 * Always controlled — the parent owns the value and reads `.url` when
 * submitting the surrounding form (e.g. vehicle create with
 * `registrationCardUrl`).
 */
export function FileUpload({
  label,
  documentType,
  ownerType,
  vehicleId,
  expiresAt,
  value,
  onChange,
  accept = DEFAULT_ACCEPT,
  maxMb = DEFAULT_MAX_MB,
  required,
  hint,
  className,
}: FileUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setError(null);

    if (file.size > maxMb * 1024 * 1024) {
      setError(`Fichier trop volumineux (max ${maxMb} Mo).`);
      return;
    }

    // Optimistic preview using a local blob URL — replaced by the server
    // URL once /api/documents/upload returns.
    const previewObjectUrl = file.type.startsWith("image/")
      ? URL.createObjectURL(file)
      : undefined;

    start(async () => {
      const r = await uploadDocumentAction({
        file,
        documentType,
        ownerType,
        vehicleId,
        expiresAt,
      });
      if (!r.ok || !r.data) {
        setError(r.message);
        if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
        toast({
          kind: "error",
          title: "Upload échoué",
          description: r.message,
        });
        return;
      }
      const data: UploadedDocument = r.data;
      if (value?.previewObjectUrl) URL.revokeObjectURL(value.previewObjectUrl);
      onChange({
        url: data.url ?? "",
        fileKey: data.fileKey ?? null,
        documentId: data.documentId,
        fileName: file.name,
        fileSize: file.size,
        previewObjectUrl,
      });
    });
  }

  function clear() {
    if (value?.previewObjectUrl) URL.revokeObjectURL(value.previewObjectUrl);
    onChange(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const isImage = !!value?.previewObjectUrl;
  const hasValue = !!value;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={inputId}
        className="text-sm font-medium text-[color:var(--foreground)]"
      >
        {label}
        {required ? (
          <span className="ml-0.5 text-[color:var(--danger)]">*</span>
        ) : null}
      </label>

      {hasValue ? (
        <div className="flex items-center gap-3 rounded-lg border border-[color:var(--success)]/30 bg-[color:var(--success)]/5 p-2">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value.previewObjectUrl}
              alt={value.fileName}
              className="size-14 shrink-0 rounded-md border border-[color:var(--border)] object-cover"
            />
          ) : (
            <span className="flex size-14 shrink-0 items-center justify-center rounded-md border border-[color:var(--border)] bg-[color:var(--primary-soft)] text-[color:var(--primary)]">
              <FileText className="size-6" />
            </span>
          )}
          <div className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="truncate text-sm font-medium text-[color:var(--foreground)]">
              {value.fileName}
            </span>
            <span className="text-[11px] text-[color:var(--muted-foreground)]">
              {formatBytes(value.fileSize)}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-[color:var(--success)]">
              <CheckCircle2 className="size-3" />
              Uploadé
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clear}
            title="Retirer"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFiles(e.dataTransfer.files);
          }}
          className={cn(
            "flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed px-3 py-5 text-center transition cursor-pointer",
            dragOver
              ? "border-[color:var(--primary)] bg-[color:var(--primary-soft)]/40"
              : error
                ? "border-[color:var(--danger)]/50 bg-[color:var(--danger)]/5"
                : "border-[color:var(--border)] bg-[color:var(--background)] hover:border-[color:var(--primary)]/50 hover:bg-[color:var(--muted)]/30",
            pending && "opacity-60 cursor-progress",
          )}
        >
          {pending ? (
            <Loader2 className="size-6 animate-spin text-[color:var(--primary)]" />
          ) : (
            <span className="flex size-9 items-center justify-center rounded-full bg-[color:var(--primary-soft)] text-[color:var(--primary)]">
              {accept.startsWith("image/") ? (
                <ImageIcon className="size-4" />
              ) : (
                <Upload className="size-4" />
              )}
            </span>
          )}
          <span className="text-sm font-medium text-[color:var(--foreground)]">
            {pending ? "Envoi en cours…" : "Glisse un fichier ou clique"}
          </span>
          <span className="text-[11px] text-[color:var(--muted-foreground)]">
            JPG · PNG · WebP · PDF · max {maxMb} Mo
          </span>
        </label>
      )}

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {error ? (
        <p className="inline-flex items-center gap-1 text-xs text-[color:var(--danger)]">
          <AlertTriangle className="size-3" />
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-[color:var(--muted-foreground)]">{hint}</p>
      ) : null}
    </div>
  );
}
