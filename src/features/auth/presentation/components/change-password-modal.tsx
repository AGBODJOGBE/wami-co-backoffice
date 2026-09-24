"use client";

import { useState, useTransition } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Modal } from "@/shared/ui/modal";
import { toast } from "@/shared/ui/toast";
import { changePasswordAction } from "../../application/actions";

export function ChangePasswordModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function close() {
    setCurrent("");
    setNext("");
    setConfirm("");
    setError(null);
    onClose();
  }

  function submit() {
    if (next !== confirm) {
      setError("La confirmation ne correspond pas au nouveau mot de passe.");
      return;
    }
    setError(null);
    start(async () => {
      const r = await changePasswordAction(current, next);
      if (r.ok) {
        toast({ kind: "success", title: "Mot de passe modifié", description: r.message });
        close();
      } else {
        setError(r.message);
      }
    });
  }

  return (
    <Modal
      open={open}
      onClose={close}
      size="sm"
      title="Changer mon mot de passe"
      description="8 caractères minimum, avec une majuscule, une minuscule et un chiffre."
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={pending}>
            Annuler
          </Button>
          <Button
            onClick={submit}
            isLoading={pending}
            disabled={!current || !next || !confirm}
          >
            Modifier
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Input
          label="Mot de passe actuel *"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
        <Input
          label="Nouveau mot de passe *"
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
        <Input
          label="Confirmer le nouveau mot de passe *"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {error ? (
          <p className="text-sm text-[color:var(--danger)]" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
