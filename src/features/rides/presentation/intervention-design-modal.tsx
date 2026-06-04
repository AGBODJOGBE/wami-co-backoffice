"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Flag,
  MapPin,
  PauseCircle,
  Play,
  PlayCircle,
  ShieldX,
  Star,
  XCircle,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Modal } from "@/shared/ui/modal";
import { Textarea } from "@/shared/ui/textarea";
import { toast } from "@/shared/ui/toast";
import { cn } from "@/shared/lib/cn";
import {
  driverAcceptRideAction,
  driverArrivedRideAction,
  driverCancelRideAction,
  driverPauseRideAction,
  driverResumeRideAction,
  driverStartRideAction,
  forceRideStatusAction,
  type ActionResult,
} from "../application/actions";

/**
 * Action vocabulary:
 *   - driver-* : calls /api/driver/rides/{id}/<verb>. The admin acts on
 *                behalf of the assigned driver (lets ops unstick a ride
 *                when the driver app fails).
 *   - admin-*  : calls /api/admin/rides/{id}/status. Pure admin override —
 *                always logged, requires a reason.
 */
type ActionKey =
  | "driver-accept"
  | "driver-arrived"
  | "driver-start"
  | "driver-pause"
  | "driver-resume"
  | "driver-cancel"
  | "admin-cancel-system"
  | "admin-complete"
  | "admin-rated";

interface ActionDef {
  key: ActionKey;
  label: string;
  description: string;
  icon: typeof Flag;
  tone: "primary" | "warning" | "success" | "danger" | "neutral";
  /** Whether this action needs a reason from the admin. Force-admin
   *  always needs one (audit); driver-cancel does too; driver progression
   *  doesn't. */
  needsReason: boolean;
}

const ACTIONS: Record<ActionKey, ActionDef> = {
  "driver-accept": {
    key: "driver-accept",
    label: "Accepter la course",
    description: "Le driver assigné prend la course (REQUESTED → ACCEPTED).",
    icon: CheckCircle2,
    tone: "primary",
    needsReason: false,
  },
  "driver-arrived": {
    key: "driver-arrived",
    label: "Marquer arrivé au pickup",
    description: "Le driver est sur place (ACCEPTED → ARRIVED).",
    icon: MapPin,
    tone: "primary",
    needsReason: false,
  },
  "driver-start": {
    key: "driver-start",
    label: "Démarrer la course",
    description: "Le passager est à bord (ARRIVED → IN_PROGRESS).",
    icon: PlayCircle,
    tone: "primary",
    needsReason: false,
  },
  "driver-pause": {
    key: "driver-pause",
    label: "Mettre en pause",
    description: "Pause facturée après 5 min cumulées (IN_PROGRESS → PAUSED).",
    icon: PauseCircle,
    tone: "warning",
    needsReason: false,
  },
  "driver-resume": {
    key: "driver-resume",
    label: "Reprendre",
    description: "Reprendre une course en pause (PAUSED → IN_PROGRESS).",
    icon: Play,
    tone: "primary",
    needsReason: false,
  },
  "driver-cancel": {
    key: "driver-cancel",
    label: "Annuler côté driver",
    description:
      "Statut CANCELLED_DRIVER. Indemnité no-show appliquée si déjà ARRIVED.",
    icon: XCircle,
    tone: "danger",
    needsReason: true,
  },
  "admin-cancel-system": {
    key: "admin-cancel-system",
    label: "Annuler (système / admin)",
    description: "Statut CANCELLED_SYSTEM. Disponible sur tous les statuts.",
    icon: ShieldX,
    tone: "danger",
    needsReason: true,
  },
  "admin-complete": {
    key: "admin-complete",
    label: "Forcer terminée",
    description: "IN_PROGRESS / PAUSED → COMPLETED. Audit obligatoire.",
    icon: Flag,
    tone: "success",
    needsReason: true,
  },
  "admin-rated": {
    key: "admin-rated",
    label: "Forcer notée",
    description: "DISPUTED → RATED. Clôture une course litigieuse.",
    icon: Star,
    tone: "success",
    needsReason: true,
  },
};

/** What's offered depending on the ride's current status. When the status
 *  isn't known (no defaultRideId — admin pastes a UUID manually), we
 *  expose everything and let the backend gate. */
function actionsFor(currentStatus?: string): ActionKey[] {
  if (!currentStatus) {
    return [
      "driver-accept",
      "driver-arrived",
      "driver-start",
      "driver-pause",
      "driver-resume",
      "driver-cancel",
      "admin-cancel-system",
      "admin-complete",
      "admin-rated",
    ];
  }
  switch (currentStatus) {
    case "REQUESTED":
    case "MATCHED":
      return ["driver-accept", "admin-cancel-system"];
    case "ACCEPTED":
      return ["driver-arrived", "driver-cancel", "admin-cancel-system"];
    case "ARRIVED":
      return ["driver-start", "driver-cancel", "admin-cancel-system"];
    case "IN_PROGRESS":
      return ["driver-pause", "admin-complete", "admin-cancel-system"];
    case "PAUSED":
      return ["driver-resume", "admin-complete", "admin-cancel-system"];
    case "DISPUTED":
      return ["admin-complete", "admin-rated", "admin-cancel-system"];
    // Terminal: nothing to do.
    case "COMPLETED":
    case "RATED":
    case "CANCELLED_PASSENGER":
    case "CANCELLED_DRIVER":
    case "CANCELLED_SYSTEM":
      return [];
    default:
      return ["admin-cancel-system"];
  }
}

const TONE_CHIP: Record<ActionDef["tone"], string> = {
  primary:
    "bg-[color:var(--primary-soft)] text-[color:var(--primary)] border-[color:var(--primary)]/30",
  warning:
    "bg-[color:var(--warning)]/10 text-[color:var(--warning)] border-[color:var(--warning)]/30",
  success:
    "bg-[color:var(--success)]/10 text-[color:var(--success)] border-[color:var(--success)]/30",
  danger:
    "bg-[color:var(--danger)]/10 text-[color:var(--danger)] border-[color:var(--danger)]/30",
  neutral: "bg-[color:var(--muted)] text-[color:var(--foreground)] border-transparent",
};

function notify(r: ActionResult<unknown>, ok: string) {
  if (r.ok) {
    toast({ kind: "success", title: ok, description: r.message });
  } else {
    toast({ kind: "error", title: "Échec", description: r.message });
  }
}

export interface InterventionDesignModalProps {
  open: boolean;
  onClose: () => void;
  defaultRideId?: string;
  defaultRideNumber?: string;
  /** Current status of the targeted ride — when provided we trim the
   *  available actions to those the backend will accept. */
  currentStatus?: string;
}

export function InterventionDesignModal({
  open,
  onClose,
  defaultRideId,
  defaultRideNumber,
  currentStatus,
}: InterventionDesignModalProps) {
  const [rideId, setRideId] = useState(defaultRideId ?? "");
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();

  const allowedKeys = useMemo(
    () => actionsFor(currentStatus),
    [currentStatus],
  );
  const [actionKey, setActionKey] = useState<ActionKey | null>(
    allowedKeys[0] ?? null,
  );

  useEffect(() => {
    if (!open) return;
    setRideId(defaultRideId ?? "");
    setReason("");
    setActionKey(actionsFor(currentStatus)[0] ?? null);
  }, [open, defaultRideId, currentStatus]);

  const def = actionKey ? ACTIONS[actionKey] : null;

  async function dispatchAction(): Promise<ActionResult<unknown>> {
    if (!actionKey) throw new Error("Action manquante.");
    const id = rideId.trim();
    switch (actionKey) {
      case "driver-accept":
        return driverAcceptRideAction(id);
      case "driver-arrived":
        return driverArrivedRideAction(id);
      case "driver-start":
        return driverStartRideAction(id);
      case "driver-pause":
        return driverPauseRideAction(id);
      case "driver-resume":
        return driverResumeRideAction(id);
      case "driver-cancel":
        return driverCancelRideAction(id, reason.trim());
      case "admin-cancel-system":
        return forceRideStatusAction(id, "CANCELLED_SYSTEM", reason.trim());
      case "admin-complete":
        return forceRideStatusAction(id, "COMPLETED", reason.trim());
      case "admin-rated":
        return forceRideStatusAction(id, "RATED", reason.trim());
    }
  }

  function submit() {
    if (!def) return;
    if (!rideId.trim()) {
      toast({
        kind: "error",
        title: "Ride ID requis",
        description: "Renseigne l'identifiant de la course.",
      });
      return;
    }
    if (def.needsReason && reason.trim().length < 5) {
      toast({
        kind: "error",
        title: "Motif requis",
        description: "Précise le motif (au moins 5 caractères) — tracé audit.",
      });
      return;
    }
    start(async () => {
      const r = await dispatchAction();
      notify(r, def.label);
      if (r.ok) onClose();
    });
  }

  const noActions = allowedKeys.length === 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Intervention sur une course"
      size="lg"
      description={
        defaultRideNumber
          ? `Course ${defaultRideNumber} — toute action est loguée.`
          : "Toute action est loguée — admin id + horodatage + transition."
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Annuler
          </Button>
          <Button
            variant={def?.tone === "danger" ? "danger" : "primary"}
            onClick={submit}
            isLoading={pending}
            disabled={!def || noActions}
          >
            {pending ? "Application…" : "Confirmer"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-2 rounded-md border border-[color:var(--warning)]/30 bg-[color:var(--warning)]/10 px-3 py-2 text-xs text-[color:var(--warning)]">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p suppressHydrationWarning>
            Toute intervention est <strong>loguée</strong> avec l’identifiant
            admin et l’horodatage, et propagée en temps réel sur les apps
            concernées.
          </p>
        </div>

        <Input
          label="ID de la course *"
          value={rideId}
          onChange={(e) => setRideId(e.target.value)}
          placeholder="UUID de la ride"
          required
          disabled={!!defaultRideId}
        />

        {noActions ? (
          <div className="rounded-md border border-[color:var(--border)] bg-[color:var(--muted)]/40 p-3 text-sm text-[color:var(--muted-foreground)]">
            La course est dans un état terminal — aucune action n&apos;est
            plus autorisée.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
              Action à effectuer *
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {allowedKeys.map((k) => {
                const d = ACTIONS[k];
                const Icon = d.icon;
                const selected = actionKey === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setActionKey(k)}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border p-3 text-left transition cursor-pointer",
                      selected
                        ? TONE_CHIP[d.tone] + " ring-2 ring-offset-1"
                        : "border-[color:var(--border)] bg-[color:var(--background)] hover:border-[color:var(--primary)]/50",
                    )}
                  >
                    <Icon
                      className={cn(
                        "mt-0.5 size-5 shrink-0",
                        selected ? "" : "text-[color:var(--muted-foreground)]",
                      )}
                    />
                    <span className="flex flex-col leading-tight">
                      <span className="text-sm font-semibold">{d.label}</span>
                      <span className="text-[11px] text-[color:var(--muted-foreground)]">
                        {d.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {def?.needsReason ? (
          <Textarea
            label="Motif (obligatoire) *"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={
              def.key.startsWith("driver-")
                ? "Driver injoignable depuis 15 min, no-show passager…"
                : "Driver injoignable depuis 15 min, passager remboursé…"
            }
            rows={4}
            required
          />
        ) : (
          <p className="rounded-md border border-[color:var(--border)] bg-[color:var(--muted)]/30 p-3 text-[11px] text-[color:var(--muted-foreground)]">
            Cette action n&apos;a pas de motif obligatoire — elle correspond
            à une transition de cycle de vie normale (côté driver).
          </p>
        )}

        {!currentStatus ? (
          <p className="text-[10px] text-[color:var(--muted-foreground)]">
            Transitions backend : tout statut → CANCELLED_SYSTEM ·
            IN_PROGRESS / PAUSED → COMPLETED · DISPUTED → COMPLETED / RATED.
            Les actions driver suivent le cycle REQUESTED → ACCEPTED →
            ARRIVED → IN_PROGRESS ⇄ PAUSED → COMPLETED.
          </p>
        ) : null}
      </div>

    </Modal>
  );
}
