import { useEffect, useMemo, useState } from "react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  PATRIMOINE_WINDOW_YEARS,
  defaultPatrimoineWindowStart,
  patrimoineRangeLabel,
  type PatrimoinePoint,
} from "@/lib/patrimoineEvolution";
import { ChartTooltipContent, chartAxisTick, chartGridStroke } from "./ChartTooltip";

type Series = {
  data: PatrimoinePoint[];
  fromYear: number;
  toYear: number;
  nowYear: number;
};

export function PatrimoineEvolutionChart({
  series,
  height = 188,
  gradientPrefix = "pe",
  title,
}: {
  series: Series;
  height?: number;
  /** Préfixe unique pour les gradients SVG (plusieurs charts sur la page) */
  gradientPrefix?: string;
  /** Titre optionnel (sinon seul le sous-titre + nav) */
  title?: string;
}) {
  const { data, nowYear } = series;
  const windowSize = Math.min(PATRIMOINE_WINDOW_YEARS, Math.max(1, data.length));
  const maxStart = Math.max(0, data.length - windowSize);

  const homeStart = useMemo(
    () => defaultPatrimoineWindowStart(data, nowYear, windowSize),
    [data, nowYear, windowSize],
  );

  const [start, setStart] = useState(homeStart);

  useEffect(() => {
    setStart(homeStart);
  }, [homeStart, series.fromYear, series.toYear]);

  const visible = data.slice(start, start + windowSize);
  const viewFrom = visible.length ? Number(visible[0].an) : series.fromYear;
  const viewTo = visible.length ? Number(visible[visible.length - 1].an) : series.toYear;
  const hasFuture = visible.some((d) => d.futur);
  const canLeft = start > 0;
  const canRight = start < maxStart;
  const atHome = start === homeStart;

  const g1 = `${gradientPrefix}-v`;
  const g2 = `${gradientPrefix}-n`;

  const shift = (delta: number) => {
    setStart((s) => Math.max(0, Math.min(maxStart, s + delta)));
  };

  return (
    <div
      className="w-full min-w-0"
      onWheel={(e) => {
        if (data.length <= windowSize) return;
        // Molette / trackpad horizontal → naviguer dans le temps
        const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0;
        if (delta === 0) return;
        e.preventDefault();
        shift(delta > 0 ? 1 : -1);
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          {title ? <p className="text-xs font-bold uppercase tracking-wider vision-text-muted mb-0.5">{title}</p> : null}
          <p className="text-xs vision-text-muted">
            {patrimoineRangeLabel(viewFrom, viewTo)}
            {hasFuture ? " · projection" : ""}
            {data.length > windowSize ? (
              <span className="vision-text-faint"> · {series.fromYear}–{series.toYear} au total</span>
            ) : null}
          </p>
        </div>
        {data.length > windowSize && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              aria-label="Années précédentes"
              title="Années précédentes"
              disabled={!canLeft}
              onClick={() => shift(-1)}
              className="w-8 h-8 rounded-lg vision-surface border border-[var(--v-border-subtle)] flex items-center justify-center vision-text-muted hover:vision-info-text disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              aria-label="Revenir à aujourd’hui"
              title="Revenir à aujourd’hui"
              disabled={atHome}
              onClick={() => setStart(homeStart)}
              className="h-8 px-2.5 rounded-lg vision-surface border border-[var(--v-border-subtle)] text-xs font-semibold vision-text-muted hover:vision-info-text disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              {nowYear}
            </button>
            <button
              type="button"
              aria-label="Années suivantes"
              title="Années suivantes"
              disabled={!canRight}
              onClick={() => shift(1)}
              className="w-8 h-8 rounded-lg vision-surface border border-[var(--v-border-subtle)] flex items-center justify-center vision-text-muted hover:vision-info-text disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={visible} margin={{ top: 5, right: 5, left: -22, bottom: 0 }}>
          <defs>
            <linearGradient id={g1} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity={0} />
            </linearGradient>
            <linearGradient id={g2} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
          <XAxis
            dataKey="an"
            tick={chartAxisTick}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => {
              const y = Number(v);
              return y > nowYear ? `${v}*` : String(v);
            }}
          />
          <YAxis tick={chartAxisTick} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}k`} />
          <Tooltip content={<ChartTooltipContent unit="k" />} />
          <Area type="monotone" dataKey="valeur" stroke="#60a5fa" strokeWidth={2} fill={`url(#${g1})`} name="Valeur brute" />
          <Area type="monotone" dataKey="dette" stroke="#f87171" strokeWidth={1.5} fill="none" strokeDasharray="5 3" name="Dette" />
          <Area type="monotone" dataKey="net" stroke="#34d399" strokeWidth={2} fill={`url(#${g2})`} name="Net" />
        </AreaChart>
      </ResponsiveContainer>

      {hasFuture && (
        <p className="text-xs vision-text-faint mt-2">
          * Projection : valeur de marché inchangée, dette selon les tableaux d’amortissement.
        </p>
      )}
    </div>
  );
}
