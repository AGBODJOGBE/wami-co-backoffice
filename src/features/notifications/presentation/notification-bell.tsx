"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { Bell, Check, X } from "lucide-react";
import { API_ROUTES } from "@/shared/config/api-routes";
import { clientFetch } from "@/shared/lib/api/client";
import { ApiError } from "@/shared/lib/api/types";
import { Spinner } from "@/shared/ui/spinner";
import { formatDateTime } from "@/shared/lib/format";
import { cn } from "@/shared/lib/cn";
import {
  PRIORITY_META,
  type NotificationHistory,
  type NotificationItem,
} from "../domain/notification";

const POLL_INTERVAL_MS = 30_000;
/** Posé quand l'API répond 404 : ce compte n'a pas de flux de notifications. On cesse alors
 * d'interroger (une requête perdue toutes les 30 s sur chaque page) pour le reste de la session. */
const UNAVAILABLE_KEY = "fyb:notifications:unavailable";

function readUnavailable(): boolean {
  try {
    return sessionStorage.getItem(UNAVAILABLE_KEY) === "1";
  } catch {
    return false;
  }
}
const PAGE_SIZE = 10;

export function NotificationBell() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, startMark] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  const [unavailable, setUnavailable] = useState(false);

  const fetchOnce = useCallback(async () => {
    if (readUnavailable()) {
      setUnavailable(true);
      setLoading(false);
      return;
    }
    if (typeof document !== "undefined" && document.hidden) return;
    try {
      const data = await clientFetch<NotificationHistory>(
        `${API_ROUTES.notifications.list()}?page=1&limit=${PAGE_SIZE}`,
      );
      setItems(data.notifications ?? []);
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        try {
          sessionStorage.setItem(UNAVAILABLE_KEY, "1");
        } catch {
          // stockage indisponible : on retentera au prochain chargement
        }
        setUnavailable(true);
      } else {
        setError(e instanceof Error ? e.message : "Erreur de chargement.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial + polling
  useEffect(() => {
    fetchOnce();
    if (readUnavailable()) return;
    const id = setInterval(() => {
      if (readUnavailable()) {
        clearInterval(id);
        return;
      }
      fetchOnce();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchOnce]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const unread = items.filter((i) => !i.isRead);
  const criticalUnread = unread.filter(
    (i) => i.priority === "CRITICAL" || i.priority === "HIGH",
  );
  const dotTone = criticalUnread.length > 0
    ? "bg-[color:var(--danger)]"
    : unread.length > 0
      ? "bg-[color:var(--secondary)]"
      : "";

  function markRead(id: string) {
    startMark(async () => {
      try {
        await clientFetch(API_ROUTES.notifications.markRead(id), {
          method: "PATCH",
        });
        setItems((cur) =>
          cur.map((it) =>
            it.id === id
              ? { ...it, isRead: true, readAt: new Date().toISOString() }
              : it,
          ),
        );
      } catch {
        // silent — next poll will resync
      }
    });
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-md p-2 text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)] hover:text-[color:var(--foreground)]"
        aria-label="Notifications"
      >
        <Bell className="size-5" />
        {dotTone ? (
          <span
            className={cn(
              "absolute right-1.5 top-1.5 inline-flex size-2 rounded-full ring-2 ring-[color:var(--background)]",
              dotTone,
            )}
            aria-hidden
          />
        ) : null}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-2 flex w-96 max-w-[calc(100vw-2rem)] flex-col rounded-xl border border-[color:var(--border)] bg-[color:var(--background)] shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-[color:var(--border)] px-4 py-3">
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-[color:var(--foreground)]">
                Notifications
              </span>
              <span className="text-[10px] text-[color:var(--muted-foreground)]">
                {unread.length} non lue{unread.length > 1 ? "s" : ""} ·
                {unavailable ? " indisponible" : ` rafraîchi toutes les ${POLL_INTERVAL_MS / 1000}s`}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)]"
              aria-label="Fermer"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Spinner label="Chargement…" />
              </div>
            ) : error ? (
              <p className="px-4 py-6 text-center text-sm text-[color:var(--danger)]">
                {error}
              </p>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-[color:var(--muted-foreground)]">
                Aucune notification récente.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-[color:var(--border)]">
                {items.map((it) => {
                  const meta = PRIORITY_META[it.priority];
                  return (
                    <li
                      key={it.id}
                      className={cn(
                        "flex flex-col gap-1 px-4 py-3",
                        !it.isRead && "bg-[color:var(--primary-soft)]/15",
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className={cn(
                            "mt-1 inline-flex size-1.5 shrink-0 rounded-full",
                            meta.tone === "danger"
                              ? "bg-[color:var(--danger)]"
                              : meta.tone === "warning"
                                ? "bg-[color:var(--warning)]"
                                : meta.tone === "info"
                                  ? "bg-[color:var(--primary)]"
                                  : "bg-[color:var(--muted-foreground)]",
                          )}
                        />
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-medium text-[color:var(--foreground)]">
                            {it.type}
                          </span>
                          <p className="text-sm text-[color:var(--foreground)]">
                            {it.message}
                          </p>
                          <span className="text-[10px] text-[color:var(--muted-foreground)]">
                            {formatDateTime(it.createdAt)} · {it.channel} · {meta.label}
                          </span>
                        </div>
                        {!it.isRead ? (
                          <button
                            type="button"
                            onClick={() => markRead(it.id)}
                            className="ml-auto rounded-md p-1 text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)] hover:text-[color:var(--success)]"
                            aria-label="Marquer comme lue"
                            title="Marquer comme lue"
                          >
                            <Check className="size-4" />
                          </button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
