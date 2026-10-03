import type { ReactNode } from "react";
import { ChevronDown, RotateCcw, Search, X } from "lucide-react";
import { G, btnG, inp, selectCls } from "./layout";

export function normalizeSearch(q: string): string {
  return q
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function matchesSearch(query: string, ...parts: Array<string | number | null | undefined>): boolean {
  const q = normalizeSearch(query);
  if (!q) return true;
  const hay = normalizeSearch(parts.filter((p) => p != null && p !== "").join(" "));
  return hay.includes(q);
}

export function SearchBar({
  value,
  onChange,
  placeholder = "Rechercher…",
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`relative w-full min-w-0 ${className}`}>
      <Search
        size={16}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 vision-text-muted"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${inp} pl-10 ${value ? "pr-10" : ""}`}
        aria-label={placeholder}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg inline-flex items-center justify-center vision-text-muted hover:vision-text transition-colors"
          aria-label="Effacer la recherche"
        >
          <X size={14} />
        </button>
      ) : null}
    </div>
  );
}

export type FilterOption = { value: string; label: string };

export function FilterSelect({
  label,
  value,
  onChange,
  options,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  className?: string;
}) {
  const id = `filter-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className={`min-w-0 w-full ${className}`}>
      <label htmlFor={id} className="block text-xs font-semibold vision-text-muted mb-1.5">
        {label}
      </label>
      <div className="relative w-full">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${selectCls} text-sm`}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value} className="vision-input vision-text">
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4"
          style={{ color: "var(--v-accent-text)" }}
          aria-hidden
        />
      </div>
    </div>
  );
}

/** Conteneur glass pour les filtres (hors barre de recherche). */
export function FiltersPanel({
  children,
  onReset,
  resetVisible,
}: {
  children: ReactNode;
  onReset: () => void;
  resetVisible: boolean;
}) {
  return (
    <div className={`${G} p-4 sm:p-5 w-full min-w-0`}>
      <div className="flex items-center justify-between gap-3 mb-3 sm:mb-4">
        <p className="text-xs font-semibold vision-text-muted uppercase tracking-wide">Filtres</p>
        {resetVisible ? (
          <button
            type="button"
            onClick={onReset}
            className={`${btnG} whitespace-nowrap shrink-0 py-2 px-3 text-xs`}
            aria-label="Réinitialiser les filtres"
          >
            <RotateCcw size={13} className="shrink-0" />
            <span>Réinitialiser</span>
          </button>
        ) : null}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full min-w-0">
        {children}
      </div>
    </div>
  );
}

export function FilterEmpty({ label = "Aucun résultat pour ces filtres" }: { label?: string }) {
  return (
    <div className="vision-glass rounded-2xl px-4 py-10 text-center">
      <p className="text-sm vision-text-muted">{label}</p>
    </div>
  );
}
