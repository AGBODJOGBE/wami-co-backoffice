"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { Car, Loader2, Package, Search, X } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/cn";
import {
  loadSearchIndex,
  type SearchHit,
  type SearchIndex,
} from "../application/actions";

const MAX_RESULTS = 8;
const MIN_QUERY = 1;

function tokensFromQuery(q: string): string[] {
  return q
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

/** Score the haystack against tokens. Returns null when any token misses
 * — i.e. all tokens must appear (AND semantics). Lower is better. */
function score(hay: string, tokens: string[]): number | null {
  let sum = 0;
  for (const t of tokens) {
    const i = hay.indexOf(t);
    if (i === -1) return null;
    sum += i; // earlier matches → lower score → higher rank
  }
  return sum;
}

interface ResolvedHit extends SearchHit {
  _score: number;
}

export function TopbarSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [index, setIndex] = useState<SearchIndex | null>(null);
  const [indexLoading, setIndexLoading] = useState(false);
  const [indexError, setIndexError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const ensureIndex = useCallback(async () => {
    if (index || indexLoading) return;
    setIndexLoading(true);
    setIndexError(null);
    try {
      const idx = await loadSearchIndex();
      setIndex(idx);
    } catch (e) {
      setIndexError(e instanceof Error ? e.message : "Erreur de chargement.");
    } finally {
      setIndexLoading(false);
    }
  }, [index, indexLoading]);

  // Cmd-K / Ctrl-K focuses the input from anywhere.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Click outside closes the dropdown.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const tokens = useMemo(() => tokensFromQuery(query), [query]);

  const results: ResolvedHit[] = useMemo(() => {
    if (!index || tokens.length === 0) return [];
    const scored: ResolvedHit[] = [];
    for (const hit of index.hits) {
      const s = score(hit.haystack, tokens);
      if (s === null) continue;
      scored.push({ ...hit, _score: s });
    }
    scored.sort((a, b) => a._score - b._score);
    return scored.slice(0, MAX_RESULTS);
  }, [index, tokens]);

  // Reset highlight when results change.
  useEffect(() => {
    setHighlight(0);
  }, [query]);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
    router.push(href);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (!open || results.length === 0) {
      if (e.key === "Enter" && tokens.length > 0) {
        // First exact-ref match — typing a full FY-RD-... and pressing
        // Enter without arrow-nav should still navigate.
        const ref = tokens.join("");
        const exact = index?.hits.find(
          (h) => h.ref.toLowerCase() === ref || h.id === tokens[0],
        );
        if (exact) go(exact.href);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(results[highlight].href);
    }
  }

  const showDropdown =
    open && (query.length >= MIN_QUERY || indexLoading || !!indexError);

  return (
    <div
      ref={rootRef}
      className="relative flex h-10 flex-1 items-center gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 transition focus-within:border-[color:var(--primary)] focus-within:ring-2 focus-within:ring-[color:var(--primary)]/30 sm:max-w-md"
    >
      {indexLoading ? (
        <Loader2 className="size-4 shrink-0 animate-spin text-[color:var(--muted-foreground)]" />
      ) : (
        <Search className="size-4 shrink-0 text-[color:var(--muted-foreground)]" />
      )}
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          setOpen(true);
          void ensureIndex();
        }}
        onKeyDown={onKeyDown}
        placeholder="Rechercher une course, une livraison, un téléphone…"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={showDropdown}
        className="h-full w-full bg-transparent text-sm text-[color:var(--foreground)] placeholder:text-[color:var(--muted-foreground)] focus:outline-none"
      />
      {query ? (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            inputRef.current?.focus();
          }}
          aria-label="Effacer"
          className="rounded p-0.5 text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
        >
          <X className="size-3.5" />
        </button>
      ) : (
        <kbd className="hidden rounded border border-[color:var(--border)] bg-[color:var(--muted)]/40 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-[color:var(--muted-foreground)] sm:inline">
          ⌘K
        </kbd>
      )}

      {showDropdown ? (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-40 mt-2 max-h-[24rem] overflow-y-auto rounded-xl border border-[color:var(--border)] bg-[color:var(--background)] py-1 shadow-xl"
        >
          {indexError ? (
            <p className="px-4 py-3 text-xs text-[color:var(--danger)]">
              Index indisponible : {indexError}
            </p>
          ) : indexLoading && !index ? (
            <p className="flex items-center gap-2 px-4 py-3 text-xs text-[color:var(--muted-foreground)]">
              <Loader2 className="size-3.5 animate-spin" />
              Indexation en cours…
            </p>
          ) : query.length < MIN_QUERY ? (
            <p className="px-4 py-3 text-xs text-[color:var(--muted-foreground)]">
              Tape au moins {MIN_QUERY} caractère pour chercher dans{" "}
              {index?.hits.length.toLocaleString("fr-FR") ?? 0} entrées
              (courses + livraisons).
            </p>
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-xs text-[color:var(--muted-foreground)]">
              Aucun résultat pour « {query} ».
            </p>
          ) : (
            <ul className="flex flex-col">
              {results.map((hit, i) => {
                const Icon = hit.kind === "ride" ? Car : Package;
                const isHl = i === highlight;
                return (
                  <li key={`${hit.kind}-${hit.id}`} role="option" aria-selected={isHl}>
                    <button
                      type="button"
                      onMouseEnter={() => setHighlight(i)}
                      onClick={() => go(hit.href)}
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-2 text-left transition",
                        isHl
                          ? "bg-[color:var(--primary-soft)] text-[color:var(--foreground)]"
                          : "hover:bg-[color:var(--muted)]/60",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-lg",
                          hit.kind === "ride"
                            ? "bg-[color:var(--primary-soft)] text-[color:var(--primary)]"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col leading-tight">
                        <span className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-semibold text-[color:var(--foreground)]">
                            {hit.ref}
                          </span>
                          <span className="text-[10px] uppercase tracking-wider text-[color:var(--muted-foreground)]">
                            {hit.kind === "ride" ? "Course" : "Livraison"}
                          </span>
                        </span>
                        <span className="truncate text-xs text-[color:var(--muted-foreground)]">
                          {hit.subtitle}
                        </span>
                      </span>
                      <Badge tone={hit.statusTone}>{hit.statusLabel}</Badge>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {index && results.length > 0 ? (
            <p className="border-t border-[color:var(--border)] px-3 py-2 text-[10px] text-[color:var(--muted-foreground)]">
              <kbd className="font-mono">↑↓</kbd> naviguer ·{" "}
              <kbd className="font-mono">Enter</kbd> ouvrir ·{" "}
              <kbd className="font-mono">Esc</kbd> fermer
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
