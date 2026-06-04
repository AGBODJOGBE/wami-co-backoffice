"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/shared/ui/button";
import { Modal } from "@/shared/ui/modal";
import { Textarea } from "@/shared/ui/textarea";

export interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "primary" | "danger";
  withReason?: { label: string; placeholder?: string; required?: boolean };
  isLoading?: boolean;
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel = "Annuler",
  tone = "primary",
  withReason,
  isLoading = false,
}: ConfirmModalProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    if (withReason?.required && !reason.trim()) {
      setError("Une raison est requise.");
      return;
    }
    onConfirm(reason.trim() || undefined);
    setReason("");
    setError(null);
  }

  function handleClose() {
    setReason("");
    setError(null);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={handleConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {description ? (
        <div className="text-sm text-[color:var(--muted-foreground)]">{description}</div>
      ) : null}
      {withReason ? (
        <div className="mt-4">
          <Textarea
            label={withReason.label}
            placeholder={withReason.placeholder}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError(null);
            }}
            error={error ?? undefined}
            rows={3}
          />
        </div>
      ) : null}
    </Modal>
  );
}
