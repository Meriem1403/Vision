import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { G } from "./layout";

export const DEFAULT_PAGE_SIZE = 6;

export function usePagination<T>(items: T[], resetKey?: string | number, pageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize],
  );

  return { page, setPage, pageItems, totalPages, total, pageSize, from: total === 0 ? 0 : (page - 1) * pageSize + 1, to: Math.min(page * pageSize, total) };
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
