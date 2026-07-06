"use client";

import { useState, useTransition } from "react";
import { Button } from "@/shared/ui/button";
import { Modal } from "@/shared/ui/modal";
import { Textarea } from "@/shared/ui/textarea";
import { toast } from "@/shared/ui/toast";
import { suspendContractAction } from "../application/actions";

interface Props {
  open: boolean;
  contractId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ContractSuspendModal({ open, contractId, onClose, onSuccess }: Props) {
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();

  function submit() {
    start(async () => {
      const r = await suspendContractAction(contractId, reason.trim() || undefined);
      if (r.ok) {
        toast({ kind: "success", title: "Contrat suspendu", description: r.message });
        setReason("");
        onSuccess?.();
        onClose();
      } else {
        toast({ kind: "error", title: "Échec", description: r.message });
      }
    });
  }

  function handleClose() {
    if (!pending) {
      setReason("");
      onClose();
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      size="md"
      title="Suspendre le contrat"
      description="Le contrat passera au statut « Suspendu ». Le chauffeur ne pourra plus passer en ligne."
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={pending}>
            Annuler
          </Button>
          <Button variant="primary" onClick={submit} isLoading={pending}>
            {pending ? "Suspension…" : "Confirmer la suspension"}
          </Button>
        </>
      }
    >
      <Textarea
        label="Motif (optionnel)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Ex. : Impayés accumulés, litige en cours…"
        rows={3}
      />
    </Modal>
  );
}
