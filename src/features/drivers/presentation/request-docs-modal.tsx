"use client";

import { useEffect, useState } from "react";
import { Button } from "@/shared/ui/button";
import { Modal } from "@/shared/ui/modal";
import { Textarea } from "@/shared/ui/textarea";
import { toast } from "@/shared/ui/toast";
import { useDriversStore } from "../store";
import type { DriverRow } from "../domain/driver";

const REQUIRED_DOCS = [
  "Permis de conduire",
  "Carte d'identité",
  "Casier judiciaire",
  "Carte grise",
  "Assurance",
];

export interface RequestDocsModalProps {
  open: boolean;
  driver: DriverRow | null;
  onClose: () => void;
}

export function RequestDocsModal({ open, driver, onClose }: RequestDocsModalProps) {
  const requestMissingDocs = useDriversStore((s) => s.requestMissingDocs);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (open && driver) {
      setSelected(new Set(driver.missingDocuments));
      setMessage("");
    }
  }, [open, driver]);

  function toggle(doc: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(doc)) next.delete(doc);
      else next.add(doc);
      return next;
    });
  }

  function handleSubmit() {
    if (!driver) return;
    const docs = REQUIRED_DOCS.filter((d) => selected.has(d));
    requestMissingDocs(driver.driverId, docs);
    toast({
      kind: "success",
      title: "Demande envoyée",
      description: `${driver.fullName} sera notifié des ${docs.length} pièce${
        docs.length > 1 ? "s" : ""
      } à compléter.`,
    });
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Demander des pièces complémentaires"
      description={
        driver
          ? `Sélectionnez les pièces manquantes à demander à ${driver.fullName}.`
          : ""
      }
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSubmit}>Envoyer la demande</Button>
        </>
      }
    >
      <div className="flex flex-col gap-2.5">
        {REQUIRED_DOCS.map((doc) => {
          const isChecked = selected.has(doc);
          return (
            <label
              key={doc}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-[color:var(--border)] px-4 py-3 transition hover:border-[color:var(--primary)]"
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => toggle(doc)}
                className="size-4 rounded border-[color:var(--border)] text-[color:var(--primary)] focus:ring-[color:var(--primary)]"
              />
              <span className="text-sm text-[color:var(--foreground)]">{doc}</span>
            </label>
          );
        })}
      </div>

      <div className="mt-4">
        <Textarea
          label="Message au driver (optionnel)"
          placeholder="Précisions sur la qualité attendue, etc."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
        />
      </div>
    </Modal>
  );
}
