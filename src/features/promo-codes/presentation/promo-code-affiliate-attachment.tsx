"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/shared/ui/button";
import { Combobox } from "@/shared/ui/combobox";
import { Input } from "@/shared/ui/input";
import { Modal } from "@/shared/ui/modal";
import { Spinner } from "@/shared/ui/spinner";
import { toast } from "@/shared/ui/toast";
import { CanView } from "@/shared/ui/can-view";
import { setPromoCodeAffiliateAction } from "../application/actions";
import {
  listAffiliatesForPickerAction,
  type AffiliatePickerItem,
} from "@/features/affiliate/application/actions";
import type { PromoCode, SetPromoCodeAffiliateResult } from "../domain/promo-code";

/** Modale compacte — rattacher/détacher un code promo depuis la liste,
 * sans ouvrir le détail complet du code. */
export function PromoCodeAffiliateModal({
  open,
  promo,
  onClose,
  onUpdated,
}: {
  open: boolean;
  promo: PromoCode | null;
  onClose: () => void;
  onUpdated: (result: SetPromoCodeAffiliateResult) => void;
}) {
  if (!promo) return null;
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={`Affiliation — ${promo.code}`}
      description="Rattache ce code à un influenceur, ou l'en détache."
    >
      <AffiliateAttachment
        promo={promo}
        onUpdated={(result) => {
          onUpdated(result);
          onClose();
        }}
        autoEdit
      />
    </Modal>
  );
}

/**
 * Rattachement/détachement d'un code promo à un influenceur — PATCH
 * /api/admin/promo-codes/:id/affiliate. Composant autonome, réutilisé à la
 * fois dans le modal détail d'un code et dans la liste (bouton par ligne).
 */
export function AffiliateAttachment({
  promo,
  onUpdated,
  autoEdit = false,
}: {
  promo: PromoCode;
  onUpdated: (result: SetPromoCodeAffiliateResult) => void;
  /** Ouvre directement le mode édition — utilisé par la modale compacte de la liste. */
  autoEdit?: boolean;
}) {
  const [editing, setEditing] = useState(autoEdit);
  const [affiliates, setAffiliates] = useState<AffiliatePickerItem[] | null>(null);
  const [loadingList, startLoadingList] = useTransition();
  const [selectedId, setSelectedId] = useState(promo.affiliateId ?? "");
  const [rate, setRate] = useState(promo.affiliateCommissionRate != null ? String(promo.affiliateCommissionRate) : "");
  const [pending, startTransition] = useTransition();

  function loadAffiliates() {
    if (affiliates) return;
    startLoadingList(async () => {
      const res = await listAffiliatesForPickerAction();
      if (res.success && res.data) {
        setAffiliates(res.data);
      } else {
        toast({ kind: "error", title: "Liste des affiliés indisponible", description: res.error });
      }
    });
  }

  function openEdit() {
    setSelectedId(promo.affiliateId ?? "");
    setRate(promo.affiliateCommissionRate != null ? String(promo.affiliateCommissionRate) : "");
    setEditing(true);
    loadAffiliates();
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (autoEdit) loadAffiliates();
  }, [autoEdit]);

  function handleSave() {
    if (!selectedId) {
      toast({ kind: "error", title: "Affilié requis" });
      return;
    }
    startTransition(async () => {
      const res = await setPromoCodeAffiliateAction(
        promo.id,
        selectedId,
        rate.trim() ? Number(rate) : null,
      );
      if (res.ok && res.data) {
        toast({ kind: "success", title: "Rattachement enregistré", description: res.message });
        onUpdated(res.data);
        setEditing(false);
      } else {
        toast({ kind: "error", title: "Échec", description: res.message });
      }
    });
  }

  function handleDetach() {
    startTransition(async () => {
      const res = await setPromoCodeAffiliateAction(promo.id, null, null);
      if (res.ok && res.data) {
        toast({ kind: "success", title: "Code détaché", description: res.message });
        onUpdated(res.data);
        setEditing(false);
      } else {
        toast({ kind: "error", title: "Échec", description: res.message });
      }
    });
  }

  const currentAffiliate = affiliates?.find((a) => a.affiliateId === promo.affiliateId);

  if (!editing) {
    return (
      <div className="flex items-center justify-between gap-3">
        <div>
          {promo.affiliateId ? (
            <>
              <p className="text-sm text-[color:var(--foreground)]">
                {currentAffiliate?.name ?? (
                  <span className="font-mono text-xs">{promo.affiliateId}</span>
                )}
              </p>
              <p className="text-xs text-[color:var(--muted-foreground)]">
                Taux :{" "}
                {promo.affiliateCommissionRate != null
                  ? `${promo.affiliateCommissionRate}% (spécifique à ce code)`
                  : "cascade (taux du profil, sinon config globale)"}
              </p>
            </>
          ) : (
            <p className="text-xs italic text-[color:var(--muted-foreground)]">
              Aucun affilié rattaché
            </p>
          )}
        </div>
        <CanView permission="promo.manage">
          <Button size="sm" variant="outline" onClick={openEdit}>
            {promo.affiliateId ? "Modifier" : "Rattacher"}
          </Button>
        </CanView>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Combobox
        label="Affilié"
        options={
          loadingList
            ? [{ value: "", label: "Chargement…" }]
            : (affiliates ?? []).map((a) => ({
                value: a.affiliateId,
                label: `${a.name} — ${a.phoneNumber}${a.status !== "ACTIVE" ? ` (${a.status})` : ""}`,
              }))
        }
        value={selectedId}
        onChange={setSelectedId}
      />
      <Input
        label="Taux pour ce code (%)"
        type="number"
        value={rate}
        onChange={(e) => setRate(e.target.value)}
        placeholder="vide = taux du profil affilié, puis config globale"
      />
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleSave} disabled={pending || !selectedId}>
          {pending && <Spinner size="sm" />}
          Enregistrer
        </Button>
        {promo.affiliateId && (
          <Button
            size="sm"
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400"
            onClick={handleDetach}
            disabled={pending}
          >
            Détacher
          </Button>
        )}
        {!autoEdit && (
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={pending}>
            Annuler
          </Button>
        )}
      </div>
    </div>
  );
}
