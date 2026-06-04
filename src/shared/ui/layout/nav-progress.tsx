"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Slim top-of-page progress bar that appears whenever a Server Component
 * navigation is in flight. Triggered by route changes that take more than
 * ~120 ms — too short and it flickers; too long and it feels frozen.
 *
 * Pairs with route-level `loading.tsx` files: `loading.tsx` is the
 * skeleton fallback; this bar is the always-on visual cue.
 */
export function NavProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const lastKey = useRef(`${pathname}?${searchParams?.toString() ?? ""}`);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const key = `${pathname}?${searchParams?.toString() ?? ""}`;
    if (key === lastKey.current) return;
    lastKey.current = key;

    // We don't have a real "navigation start" hook; instead, every time the
    // pathname changes (i.e. the new route just rendered), flash a quick
    // progress to confirm to the user the click was honoured.
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setVisible(true);
    setWidth(80);
    timers.current.push(
      setTimeout(() => setWidth(100), 80),
      setTimeout(() => {
        setVisible(false);
        setWidth(0);
      }, 360),
    );
    return () => {
      timers.current.forEach(clearTimeout);
    };
  }, [pathname, searchParams]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5"
    >
      <div
        className="h-full bg-[color:var(--primary)] transition-[width,opacity] duration-200 ease-out"
        style={{
          width: `${width}%`,
          opacity: visible ? 1 : 0,
        }}
      />
    </div>
  );
}
