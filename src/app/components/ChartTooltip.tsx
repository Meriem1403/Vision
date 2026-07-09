import type { TooltipProps } from "recharts";

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

function formatValue(value: unknown, name?: string, unit?: "k" | "currency") {
  const n = Number(value);
  if (Number.isNaN(n)) return String(value ?? "");
  if (unit === "k") return `${n} k€`;
  if (unit === "currency" || name?.toLowerCase().includes("€") || name === "Revenus" || name === "Charges") return fmt(n);
  return fmt(n);
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  unit = "currency",
}: TooltipProps<number, string> & { unit?: "k" | "currency" }) {
  if (!active || !payload?.length) return null;

  return (
    <div
      role="tooltip"
      className="rounded-xl border px-3.5 py-3 shadow-2xl shadow-black/50 min-w-[140px] max-w-[280px] z-50"
      style={{ pointerEvents: "none", background: "var(--v-tooltip-bg)", borderColor: "var(--v-glass-border)", color: "var(--v-text)" }}
    >
      {label != null && label !== "" && (
        <p className="text-xs font-bold mb-2 pb-2 border-b" style={{ color: "var(--v-text)", borderColor: "var(--v-glass-border)" }}>{String(label)}</p>
      )}
      <ul className="space-y-1.5">
        {payload.map((entry, i) => {
          const name = entry.name ?? entry.dataKey ?? "Valeur";
          const color = entry.color ?? entry.payload?.color ?? "#60a5fa";
          const display = formatValue(entry.value, String(name), unit);
          return (
            <li key={`${name}-${i}`} className="flex items-center justify-between gap-4 text-sm">
              <span className="flex items-center gap-2 min-w-0" style={{ color: "var(--v-text)" }}>
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-1 ring-[var(--v-glass-border)]" style={{ backgroundColor: color }} aria-hidden />
                <span className="truncate font-medium">{String(name)}</span>
              </span>
              <span className="font-mono font-bold flex-shrink-0" style={{ color: "var(--v-text)" }}>{display}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export const chartAxisTick = { fontSize: 11, fill: "var(--v-chart-axis)" };
export const chartGridStroke = "var(--v-chart-grid)";
