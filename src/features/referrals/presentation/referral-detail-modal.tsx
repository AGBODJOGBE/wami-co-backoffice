"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/shared/ui/badge";
import { Modal } from "@/shared/ui/modal";
import { Spinner } from "@/shared/ui/spinner";
import { toast } from "@/shared/ui/toast";
import { formatDateTime, formatXof } from "@/shared/lib/format";
import { fetchFilleulDetailAction, fetchParrainDetailAction } from "../application/actions";
import {
  REFERRAL_STATUS_LABELS,
  REFERRAL_STATUS_TONES,
  REFERRAL_TYPE_LABELS,
  type Referral,
} from "../domain/referral";

function ReferralRow({ r }: { r: Referral }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[color:var(--border)] px-3 py-2.5">
      <div className="flex flex-col gap-0.5">
        <span className="font-mono text-xs text-[color:var(--foreground)]">{r.referredUserId}</span>
        <span className="text-[11px] text-[color:var(--muted-foreground)]">
          Code {r.referralCode} · {formatDateTime(r.createdAt)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Badge tone="neutral">
          {REFERRAL_TYPE_LABELS[r.referralType as keyof typeof REFERRAL_TYPE_LABELS] ?? r.referralType}
        </Badge>
        <Badge tone={REFERRAL_STATUS_TONES[r.status as keyof typeof REFERRAL_STATUS_TONES] ?? "neutral"}>
          {REFERRAL_STATUS_LABELS[r.status as keyof typeof REFERRAL_STATUS_LABELS] ?? r.status}
        </Badge>
        <span className="font-mono text-xs font-semibold">
          {r.status === "VALIDATED" ? formatXof(r.referredReward) : "—"}
        </span>
      </div>
    </div>
  );
}

/** Détail d'un filleul unique — GET /api/admin/referrals/filleuls/:userId */
export function FilleulDetailModal({
  userId,
  onClose,
}: {
  userId: string | null;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [referral, setReferral] = useState<Referral | null>(null);

  useEffect(() => {
    if (!userId) { setReferral(null); return; }
    setLoading(true);
    fetchFilleulDetailAction(userId).then((r) => {
      setLoading(false);
      if (r.ok && r.data) setReferral(r.data);
      else {
        toast({ kind: "error", title: "Introuvable", description: r.message });
        onClose();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return (
    <Modal
      open={!!userId}
      onClose={onClose}
      title="Détail du filleul"
      description={userId ?? undefined}
    >
      {loading ? (
        <div className="flex justify-center py-8"><Spinner size="lg" /></div>
      ) : referral ? (
        <ReferralRow r={referral} />
      ) : (
        <p className="text-sm text-[color:var(--muted-foreground)]">Aucune donnée.</p>
      )}
    </Modal>
  );
}

/** Détail d'un parrain — tous ses filleuls, GET /api/admin/referrals/parrains/:userId.
 * Contrairement à la liste "Parrains" (agrégée côté client depuis les 200
 * premiers parrainages), ceci interroge le backend sans limite pour CE parrain. */
export function ParrainDetailModal({
  userId,
  referralCode,
  onClose,
}: {
  userId: string | null;
  referralCode?: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [referrals, setReferrals] = useState<Referral[]>([]);

  useEffect(() => {
    if (!userId) { setReferrals([]); return; }
    setLoading(true);
    fetchParrainDetailAction(userId).then((r) => {
      setLoading(false);
      if (r.ok) setReferrals(r.data ?? []);
      else {
        toast({ kind: "error", title: "Introuvable", description: r.message });
        onClose();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const validated = referrals.filter((r) => r.status === "VALIDATED").length;
  const totalEarned = referrals
    .filter((r) => r.status === "VALIDATED")
    .reduce((s, r) => s + r.referrerReward, 0);

  return (
    <Modal
      open={!!userId}
      onClose={onClose}
      size="lg"
      title="Filleuls de ce parrain"
      description={referralCode ? `Code ${referralCode} · ${userId}` : userId ?? undefined}
    >
      {loading ? (
        <div className="flex justify-center py-8"><Spinner size="lg" /></div>
      ) : referrals.length === 0 ? (
        <p className="text-sm text-[color:var(--muted-foreground)]">Aucun filleul.</p>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-4 text-xs text-[color:var(--muted-foreground)]">
            <span>{referrals.length} filleul{referrals.length !== 1 ? "s" : ""}</span>
            <span>{validated} validé{validated !== 1 ? "s" : ""}</span>
            <span>Total gagné : <strong className="text-[color:var(--foreground)]">{formatXof(totalEarned)}</strong></span>
          </div>
          <div className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto">
            {referrals.map((r) => <ReferralRow key={r.referralId} r={r} />)}
          </div>
        </div>
      )}
    </Modal>
  );
}
