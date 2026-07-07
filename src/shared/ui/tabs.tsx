"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui/badge";

export interface TabDescriptor<TValue extends string> {
  value: TValue;
  label: ReactNode;
  badge?: {
    count: number;
    tone?: "primary" | "warning" | "danger" | "success" | "info" | "neutral";
  };
  content: ReactNode;
}

export interface TabsProps<TValue extends string> {
  defaultValue: TValue;
  tabs: TabDescriptor<TValue>[];
  className?: string;
}

export function Tabs<TValue extends string>({
  defaultValue,
  tabs,
  className,
}: TabsProps<TValue>) {
  const [active, setActive] = useState<TValue>(defaultValue);
  const current = tabs.find((tab) => tab.value === active) ?? tabs[0];

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <div
        role="tablist"
        className="flex flex-wrap gap-1 border-b border-[color:var(--border)]"
      >
        {tabs.map((tab) => {
          const isActive = tab.value === active;
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(tab.value)}
              className={cn(
                "relative inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition",
                "border-b-2 -mb-px",
                isActive
                  ? "border-[color:var(--primary)] text-[color:var(--primary)]"
                  : "border-transparent text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]",
              )}
            >
              {tab.label}
              {tab.badge ? (
                <Badge tone={tab.badge.tone ?? "neutral"}>{tab.badge.count}</Badge>
              ) : null}
            </button>
          );
        })}
      </div>
      <div role="tabpanel">{current.content}</div>
    </div>
  );
}
