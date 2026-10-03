import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { G } from "./layout";

/** Fallback avant mesure / SSR — 2×3 sur grille sm */
export const DEFAULT_PAGE_SIZE = 6;

type BreakpointStep = { minWidth: number; value: number };

/** Suivre la largeur pour un pageSize cohérent avec les colonnes CSS. */
function useBreakpointPageSize(steps: BreakpointStep[]): number {
  const pick = () => {
    const ordered = [...steps].sort((a, b) => b.minWidth - a.minWidth);
    if (typeof window === "undefined") return ordered[ordered.length - 1]!.value;
    const w = window.innerWidth;
    return ordered.find((s) => w >= s.minWidth)?.value ?? ordered[ordered.length - 1]!.value;
  };

  const [value, setValue] = useState(pick);
  const key = steps.map((s) => `${s.minWidth}:${s.value}`).join("|");

  useEffect(() => {
    const apply = () => setValue(pick());
    apply();
    const mqls = steps
      .filter((s) => s.minWidth > 0)
      .map((s) => window.matchMedia(`(min-width: ${s.minWidth}px)`));
    mqls.forEach((mql) => mql.addEventListener("change", apply));
    return () => mqls.forEach((mql) => mql.removeEventListener("change", apply));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key encode les steps
  }, [key]);

  return value;
}

/**
 * Page size alignée sur `cardsGrid` :
 * 1 / sm:2 / lg:3 / 2xl:4 colonnes → rangées complètes (×3).
 */
export function useCardsGridPageSize(rows = 3) {
  return useBreakpointPageSize([
    { minWidth: 1536, value: 4 * rows },
    { minWidth: 1024, value: 3 * rows },
    { minWidth: 640, value: 2 * rows },
    { minWidth: 0, value: Math.max(rows, 6) },
  ]);
}

/** Grilles type SCI / Compta : 1 → lg:2 colonnes */
export function useDuoGridPageSize(rows = 3) {
  return useBreakpointPageSize([
    { minWidth: 1024, value: 2 * rows },
    { minWidth: 0, value: Math.max(rows, 6) },
  ]);
}

export function usePagination<T>(items: T[], resetKey?: string | number, pageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const prevSizeRef = useRef(pageSize);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  // Agrandir / réduire l’écran : garder le premier élément visible
  useEffect(() => {
    if (prevSizeRef.current === pageSize) return;
    const firstIndex = (page - 1) * prevSizeRef.current;
    prevSizeRef.current = pageSize;
    const nextTotalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
    const next = Math.floor(firstIndex / pageSize) + 1;
    setPage(Math.min(Math.max(1, next), nextTotalPages));
  }, [pageSize, page, total]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize],
  );

  return {
    page,
    setPage,
    pageItems,
    totalPages,
    total,
    pageSize,
    from: total === 0 ? 0 : (page - 1) * pageSize + 1,
    to: Math.min(page * pageSize, total),
  };
}

export function PaginationBar({
  page,
  totalPages,
  total,
  from,
  to,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  from: number;
  to: number;
  onChange: (page: number) => void;
}) {
  if (total <= 0 || totalPages <= 1) return null;

  const pages = pageWindow(page, totalPages);

  return (
    <div className={`${G} flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-3 py-2.5 sm:px-4`}>
      <p className="text-xs vision-text-muted text-center sm:text-left">
        {from}–{to} sur {total}
      </p>
      <div className="flex items-center justify-center gap-1.5">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="inline-flex items-center justify-center min-h-[40px] min-w-[40px] rounded-xl vision-glass vision-text-muted disabled:opacity-35 hover:vision-text transition-all"
          aria-label="Page précédente"
        >
          <ChevronLeft size={16} />
        </button>
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`e-${i}`} className="px-1 text-xs vision-text-faint">…</span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              className={`inline-flex items-center justify-center min-h-[40px] min-w-[40px] rounded-xl text-xs font-semibold transition-all ${
                p === page ? "vision-chip-active" : "vision-glass vision-text-muted hover:vision-text"
              }`}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          className="inline-flex items-center justify-center min-h-[40px] min-w-[40px] rounded-xl vision-glass vision-text-muted disabled:opacity-35 hover:vision-text transition-all"
          aria-label="Page suivante"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

function pageWindow(page: number, totalPages: number): Array<number | "…"> {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const set = new Set<number>([1, totalPages, page, page - 1, page + 1].filter((p) => p >= 1 && p <= totalPages));
  const sorted = [...set].sort((a, b) => a - b);
  const out: Array<number | "…"> = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i]! - sorted[i - 1]! > 1) out.push("…");
    out.push(sorted[i]!);
  }
  return out;
}
