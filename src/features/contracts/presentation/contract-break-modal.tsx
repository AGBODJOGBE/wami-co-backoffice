"use client";

import { useState, useTransition } from "react";
import { Button } from "@/shared/ui/button";
import { Modal } from "@/shared/ui/modal";
import { Textarea } from "@/shared/ui/textarea";
import { toast } from "@/shared/ui/toast";
import { breakContractAction } from "../application/actions";

interface Props {
  open: boolean;
  contractId: string;
  vehicleId?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ContractBreakModal({
  open,
  contractId,
  vehicleId,
  onClose,
  onSuccess,
}: Props) {
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();

  function submit() {
    if (!reason.trim()) {
      toast({
        kind: "error",
        title: "Motif requis",
        description: "Veuillez indiquer le motif de résiliation.",
      });
      return;
    }
    start(async () => {
      const r = await breakContractAction(contractId, reason.trim(), vehicleId);
      if (r.ok) {
        toast({ kind: "success", title: "Contrat résilié", description: r.message });
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
      title="Résilier le contrat"
      description="Cette action est irréversible. Le contrat passera au statut « Résilié »."
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={pending}>
            Annuler
          </Button>
          <Button variant="danger" onClick={submit} isLoading={pending}>
            {pending ? "Résiliation…" : "Confirmer la résiliation"}
          </Button>
        </>
      }
    >
      <Textarea
        label="Motif de résiliation *"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Ex. : Non-paiement répété, accord mutuel, véhicule sinistré…"
        rows={4}
        required
      />
    </Modal>
  );
}
