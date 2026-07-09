import type { ReactNode } from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Info } from "lucide-react";
import { metricFormula } from "@/lib/metricFormulas";
import { kpiLabel } from "./layout";

const tooltipClass =
  "z-[200] max-w-[min(92vw,280px)] rounded-xl px-3 py-2.5 text-xs leading-relaxed shadow-lg border border-[var(--v-glass-border)] bg-[var(--v-tooltip-bg)] text-[var(--v-text)]";

export function MetricLabel({ label, className = "" }: { label: string; className?: string }) {
  const formula = metricFormula(label);
  if (!formula) {
    return <p className={`${kpiLabel} ${className}`}>{label}</p>;
  }

  return (
    <TooltipPrimitive.Root delayDuration={200}>
      <TooltipPrimitive.Trigger asChild>
        <button
          type="button"
          className={`${kpiLabel} ${className} group inline-flex items-center gap-1.5 max-w-full text-left cursor-help rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--v-accent)]`}
          aria-label={`${label} — voir la formule de calcul`}
        >
          <span className="truncate underline decoration-dotted decoration-[var(--v-text-faint)] underline-offset-2 group-hover:decoration-[var(--v-accent)]">
            {label}
          </span>
          <Info size={13} className="flex-shrink-0 vision-text-faint group-hover:vision-accent-text" aria-hidden />
        </button>
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content side="top" sideOffset={6} className={tooltipClass}>
          <p className="font-semibold vision-text mb-1">{label}</p>
          <p className="vision-text-muted">{formula}</p>
          <TooltipPrimitive.Arrow className="fill-[var(--v-tooltip-bg)]" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

export function MetricCard({
  label,
  value,
  color,
  children,
  className = "",
}: {
  label: string;
  value: ReactNode;
  color?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`vision-surface backdrop-blur-xl border border-[var(--v-glass-border)] rounded-2xl p-3 sm:p-4 min-w-0 ${className}`}>
      <MetricLabel label={label} />
      <p className="text-sm sm:text-base font-bold font-mono break-words" style={{ color: color ?? "var(--v-text)" }}>
        {value}
      </p>
      {children}
    </div>
  );
}
