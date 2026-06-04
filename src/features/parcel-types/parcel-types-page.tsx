"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Power } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { ConfirmModal } from "@/shared/ui/confirm-modal";
import { Input } from "@/shared/ui/input";
import { Modal } from "@/shared/ui/modal";
import { PageHeader } from "@/shared/ui/page-header";
import { Textarea } from "@/shared/ui/textarea";
import { toast } from "@/shared/ui/toast";
import { PARCEL_TYPE_META, type ParcelType } from "@/features/delivery/domain/delivery";
import {
  useParcelTypesStore,
  type ParcelCategoryRow,
} from "./store";

function EditCategoryModal({
  open,
  category,
  onClose,
}: {
  open: boolean;
  category: ParcelCategoryRow | null;
  onClose: () => void;
}) {
  const update = useParcelTypesStore((s) => s.update);
  const [description, setDescription] = useState("");
  const [basePrice, setBasePrice] = useState(0);
  const [pricePerKm, setPricePerKm] = useState(0);

  useEffect(() => {
    if (open && category) {
      setDescription(category.description);
      setBasePrice(category.basePrice);
      setPricePerKm(category.pricePerKm);
    }
  }, [open, category]);

  function handleSubmit() {
    if (!category) return;
    update(category.type, { description, basePrice, pricePerKm });
    toast({
      kind: "success",
      title: "Catégorie mise à jour",
      description: PARCEL_TYPE_META[category.type].label,
    });
    onClose();
  }

  if (!category) return null;
  const meta = PARCEL_TYPE_META[category.type];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Modifier ${meta.label}`}
      description="La catégorie sera propagée aux apps passager et driver à la prochaine sync."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSubmit}>Enregistrer</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 rounded-lg bg-[color:var(--muted)] p-3 text-sm">
          <span className="text-2xl" aria-hidden>
            {meta.emoji}
          </span>
          <div className="flex-1">
            <p className="font-medium text-[color:var(--foreground)]">{meta.label}</p>
            <p className="text-xs text-[color:var(--muted-foreground)]">
              ≤ {meta.maxKg} kg · véhicule par défaut {meta.defaultVehicle}
            </p>
          </div>
        </div>

        <Textarea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Prix de base (FCFA)"
            type="number"
            value={basePrice}
            onChange={(e) => setBasePrice(Number(e.target.value))}
          />
          <Input
            label="Prix / km (FCFA)"
            type="number"
            value={pricePerKm}
            onChange={(e) => setPricePerKm(Number(e.target.value))}
          />
        </div>
      </div>
    </Modal>
  );
}

export function ParcelTypesPage() {
  const categories = useParcelTypesStore((s) => s.categories);
  const toggleActive = useParcelTypesStore((s) => s.toggleActive);

  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ParcelCategoryRow | null>(null);

  const [confirm, setConfirm] = useState<{
    open: boolean;
    target: ParcelCategoryRow | null;
  }>({ open: false, target: null });

  function openEdit(cat: ParcelCategoryRow) {
    setEditTarget(cat);
    setEditOpen(true);
  }

  function runToggle() {
    if (!confirm.target) return;
    toggleActive(confirm.target.type);
    const meta = PARCEL_TYPE_META[confirm.target.type];
    toast({
      kind: "info",
      title: confirm.target.isActive
        ? "Catégorie désactivée"
        : "Catégorie réactivée",
      description: meta.label,
    });
    setConfirm({ open: false, target: null });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Référentiel livraison"
        title="Catégories de colis"
        dataSource="mock"
        description="6 catégories — exposées aux apps passager et driver."
        actions={
          <>
            <Button variant="outline" size="sm">
              Synchroniser apps mobiles
            </Button>
            <Button size="sm" disabled>
              <Plus className="size-4" />
              Nouvelle catégorie
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {categories.map((cat) => {
          const meta = PARCEL_TYPE_META[cat.type as ParcelType];
          return (
            <Card key={cat.type} className="flex flex-col gap-4 p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="flex size-12 items-center justify-center rounded-xl bg-[color:var(--primary-soft)] text-2xl"
                    aria-hidden
                  >
                    {meta.emoji}
                  </span>
                  <div className="flex flex-col leading-tight">
                    <p className="text-base font-semibold text-[color:var(--foreground)]">
                      {meta.label}
                    </p>
                    <p className="text-xs text-[color:var(--muted-foreground)]">
                      {cat.description}
                    </p>
                  </div>
                </div>
                {cat.isActive ? (
                  <Badge tone="success">Actif</Badge>
                ) : (
                  <Badge tone="neutral">Désactivé</Badge>
                )}
              </div>

              <dl className="grid grid-cols-2 gap-y-2 text-sm">
                <dt className="text-xs text-[color:var(--muted-foreground)]">Poids max</dt>
                <dd className="text-right font-mono text-[color:var(--foreground)]">
                  {meta.maxKg} kg
                </dd>
                <dt className="text-xs text-[color:var(--muted-foreground)]">
                  Véhicule par défaut
                </dt>
                <dd className="text-right font-medium text-[color:var(--foreground)]">
                  {meta.defaultVehicle}
                </dd>
                <dt className="text-xs text-[color:var(--muted-foreground)]">Prix de base</dt>
                <dd className="text-right font-mono text-[color:var(--foreground)]">
                  {cat.basePrice.toLocaleString("fr-FR")} FCFA
                </dd>
                <dt className="text-xs text-[color:var(--muted-foreground)]">Prix / km</dt>
                <dd className="text-right font-mono text-[color:var(--foreground)]">
                  {cat.pricePerKm} FCFA
                </dd>
              </dl>

              <div className="grid grid-cols-2 gap-3 rounded-lg bg-[color:var(--muted)] p-3 text-xs">
                <div>
                  <p className="text-[color:var(--muted-foreground)]">Volume / mois</p>
                  <p className="text-sm font-semibold text-[color:var(--foreground)]">
                    {cat.ordersThisMonth.toLocaleString("fr-FR")}
                  </p>
                </div>
                <div>
                  <p className="text-[color:var(--muted-foreground)]">Taux de succès</p>
                  <p className="text-sm font-semibold text-[color:var(--foreground)]">
                    {cat.successRate.toFixed(1)} %
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 border-t border-[color:var(--border)] pt-3">
                <Button variant="outline" size="sm" onClick={() => openEdit(cat)}>
                  <Pencil className="size-3.5" />
                  Éditer
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirm({ open: true, target: cat })}
                >
                  <Power className="size-3.5" />
                  {cat.isActive ? "Désactiver" : "Activer"}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <EditCategoryModal
        open={editOpen}
        category={editTarget}
        onClose={() => setEditOpen(false)}
      />

      <ConfirmModal
        open={confirm.open}
        onClose={() => setConfirm({ open: false, target: null })}
        onConfirm={runToggle}
        title={
          confirm.target?.isActive
            ? "Désactiver cette catégorie ?"
            : "Réactiver cette catégorie ?"
        }
        description={
          confirm.target ? (
            <p>
              Les apps mobiles cesseront / reprendront de proposer{" "}
              <span className="font-medium">
                {PARCEL_TYPE_META[confirm.target.type as ParcelType].label}
              </span>{" "}
              à la prochaine sync.
            </p>
          ) : null
        }
        confirmLabel={confirm.target?.isActive ? "Désactiver" : "Réactiver"}
        tone={confirm.target?.isActive ? "danger" : "primary"}
      />
    </div>
  );
}
