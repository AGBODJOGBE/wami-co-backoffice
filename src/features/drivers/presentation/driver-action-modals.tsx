"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/shared/ui/button";
import { Modal } from "@/shared/ui/modal";
import { Textarea } from "@/shared/ui/textarea";
import { toast } from "@/shared/ui/toast";
import {
  approveDriverAction,
  reactivateDriverAction,
  suspendDriverAction,
  type ActionResult,
} from "../application/actions";

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

export interface DriverTarget {
  driverId: string;
  /** Optional human-readable label shown in the modal header. */
  label?: string;
}

export interface SuspendDriverModalProps {
  open: boolean;
  target: DriverTarget | null;
  onClose: () => void;
}

export function SuspendDriverModal({
  open,
  target,
  onClose,
}: SuspendDriverModalProps) {
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  if (!target) return null;

  function submit() {
    if (!target) return;
    if (reason.trim().length < 5) {
      toast({
        kind: "error",
        title: "Raison requise",
        description: "Décris le motif (au moins 5 caractères) — il est tracé dans l'audit.",
      });
      return;
    }
    start(async () => {
      const r = await suspendDriverAction(target.driverId, reason.trim());
      notify(r, "Driver suspendu");
      if (r.ok) onClose();
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Suspendre ce driver"
      description={target.label ?? `Driver ${target.driverId.slice(0, 8)}…`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Annuler
          </Button>
          <Button variant="danger" onClick={submit} isLoading={pending}>
            Suspendre
          </Button>
        </>
      }
    >
      <Textarea
        label="Raison de suspension"
        rows={4}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Ex. Comportement non professionnel signalé par des clients"
        hint="Obligatoire pour l'audit trail."
        required
      />
    </Modal>
  );
}

/**
 * Inline async button for the simple actions (approve/reactivate) that
 * don't need any extra input. Shows a spinner while the Server Action runs.
 */
export interface DriverInlineActionButtonProps {
  driverId: string;
  action: "approve" | "reactivate";
  label: string;
  variant?: "primary" | "outline" | "secondary";
  size?: "sm" | "md";
}

export function DriverInlineActionButton({
  driverId,
  action,
  label,
  variant = "primary",
  size = "sm",
}: DriverInlineActionButtonProps) {
  const [pending, start] = useTransition();

  function run() {
    start(async () => {
      const r =
        action === "approve"
          ? await approveDriverAction(driverId)
          : await reactivateDriverAction(driverId);
      notify(r, action === "approve" ? "Driver approuvé" : "Driver réactivé");
    });
  }

  return (
    <Button variant={variant} size={size} onClick={run} isLoading={pending}>
      {label}
    </Button>
  );
}
