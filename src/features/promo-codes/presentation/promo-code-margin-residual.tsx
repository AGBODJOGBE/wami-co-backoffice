"use client";

import { useState, useTransition } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Spinner } from "@/shared/ui/spinner";
import { toast } from "@/shared/ui/toast";
import { CanView } from "@/shared/ui/can-view";
import { setPromoCodeMarginResidualAction } from "../application/actions";
import type { PromoCode, SetPromoCodeMarginResidualResult } from "../domain/promo-code";

/**
 * Résiduel de marge minimum propre à ce code — PATCH
 * /api/admin/promo-codes/:id/margin-residual. Gardé derrière
 * `promo.manage-budgeted` (même garde que la création avec ce champ) : c'est
 * un levier de rentabilité, pas une simple option d'affichage.
 */
export function MarginResidualEditor({
  promo,
  onUpdated,
}: {
  promo: PromoCode;
  onUpdated: (result: SetPromoCodeMarginResidualResult) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(promo.marginResidualPct != null ? String(promo.marginResidualPct) : "");
  const [pending, startTransition] = useTransition();

  function openEdit() {
    setValue(promo.marginResidualPct != null ? String(promo.marginResidualPct) : "");
    setEditing(true);
  }

  function handleSave() {
    const parsed = value.trim() === "" ? null : Number(value);
    if (parsed != null && (isNaN(parsed) || parsed < 1 || parsed > 100)) {
      toast({ kind: "error", title: "Valeur invalide", description: "Entre 1 et 100, ou vide pour suivre le réglage global." });
      return;
    }
    startTransition(async () => {
      const res = await setPromoCodeMarginResidualAction(promo.id, parsed);
      if (res.ok && res.data) {
        toast({ kind: "success", title: "Résiduel mis à jour", description: res.message });
        onUpdated(res.data);
        setEditing(false);
      } else {
        toast({ kind: "error", title: "Échec", description: res.message });
      }
    });
  }

  if (!editing) {
    return (
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-[color:var(--foreground)]">
            {promo.marginResidualPct != null ? `${promo.marginResidualPct}%` : "Suit le réglage global"}
          </p>
          <p className="text-xs text-[color:var(--muted-foreground)]">
            Marge minimum conservée par ForYou sur ce code, point de départ du calcul de remise maximale.
          </p>
        </div>
        <CanView permission="promo.manage-budgeted">
          <Button size="sm" variant="outline" onClick={openEdit}>Modifier</Button>
        </CanView>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Input
        label="Résiduel de marge (%)"
        type="number"
        min={1}
        max={100}
        step={0.1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Vide = réglage global"
        hint="Entre 1 et 100, décimales permises."
      />
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleSave} disabled={pending}>
          {pending && <Spinner size="sm" />}
          Enregistrer
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={pending}>
          Annuler
        </Button>
      </div>
    </div>
  );
}
