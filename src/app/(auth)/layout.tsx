import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[color:var(--primary)] via-[color:var(--primary)] to-[#152a55] px-4 py-12">
      <div
        aria-hidden
        className="absolute -left-32 top-1/2 size-96 -translate-y-1/2 rounded-full bg-[color:var(--secondary)]/20 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -right-24 -top-24 size-80 rounded-full bg-white/5 blur-3xl"
      />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-6">
        {children}
      </div>

      <p className="relative z-10 mt-6 text-xs text-white/60">
        © {new Date().getFullYear()} 4U / ForYou — Bénin
      </p>
    </div>
  );
}
