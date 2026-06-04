"use client";

import dynamic from "next/dynamic";
import { Spinner } from "@/shared/ui/spinner";

const BeninMap = dynamic(
  () => import("./benin-map").then((m) => m.BeninMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[440px] items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)]/30">
        <Spinner label="Chargement de la carte…" />
      </div>
    ),
  },
);

export interface LivePin {
  lat: number;
  lng: number;
  name: string;
  status: "AVAILABLE" | "BUSY" | "OFFLINE";
}

export function BeninMapClient({ livePins }: { livePins?: LivePin[] } = {}) {
  return <BeninMap livePins={livePins} />;
}
