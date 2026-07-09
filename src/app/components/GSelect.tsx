import type { SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

import { lbl } from "@/app/components/layout";

const selectBase =
  `appearance-none w-full min-w-0 min-h-[44px] sm:min-h-[42px] vision-select border rounded-xl pl-3 sm:pl-4 pr-10 sm:pr-11 py-2.5 sm:py-3 text-sm sm:text-base font-medium cursor-pointer transition-all focus:outline-none focus:border-[var(--v-accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--v-accent)_40%,transparent)] hover:opacity-90`;

export function GSelect({
  label,
  options,
  className = "",
  wrapperClassName = "",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  options: { value: string | number; label: string }[];
  className?: string;
  wrapperClassName?: string;
}) {
  const id = props.id ?? (label ? `select-${label.replace(/\s+/g, "-").toLowerCase()}` : undefined);
  return (
    <div className={`min-w-0 ${wrapperClassName}`}>
      {label && (
        <label htmlFor={id} className={lbl}>
          {label}
        </label>
      )}
      <div className="relative w-full">
        <select id={id} className={`${selectBase} ${className}`} {...props}>
          {options.map((o) => (
            <option key={o.value} value={o.value} className="py-2">
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 sm:right-3.5 top-1/2 -translate-y-1/2 vision-text-muted w-4 h-4 sm:w-5 sm:h-5"
          aria-hidden
        />
      </div>
    </div>
  );
}

export const monthOptions = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
].map((m, i) => ({ value: i + 1, label: m }));

export const yearOptions = [2024, 2025, 2026, 2027, 2028, 2030, 2035].map((y) => ({
  value: y,
  label: String(y),
}));
