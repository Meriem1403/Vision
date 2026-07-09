import type { ReactNode } from "react";
import { motion } from "motion/react";
import { ArrowLeft, ArrowDownRight, ArrowUpRight, Calendar, CreditCard, Key, Mail, MapPin, Phone, Shield, AlertTriangle } from "lucide-react";
import { pageWrap, fullPageToolbar, fullPageBtn, fullPageCard, metricsGridPage, tableScroll, mobileDetailCard, G, lbl } from "./layout";
import type { AlertItem, Property, SCI, Tenant } from "./entityTypes";

const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

export function cashFlow(p: Property) {
  return Math.round(p.loyer - (p.credit?.mensualite ?? 0) - p.taxeFonciere / 12 - p.assurance / 12);
}

function leasePct(t: Tenant) {
  const now = Date.now();
  if (now >= t.finTs) return 100;
  if (now <= t.debutTs) return 0;
  return Math.round(((now - t.debutTs) / (t.finTs - t.debutTs)) * 100);
}

function CashChip({ value }: { value: number }) {
  const pos = value >= 0;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${pos ? "bg-emerald-400/14 vision-positive-text border border-emerald-400/20" : "bg-red-400/14 vision-negative-text border border-red-400/20"}`}>
      {pos ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
      {pos ? "+" : ""}{fmt(value)}
    </span>
  );
}

function GBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="w-full h-1.5 vision-surface rounded-full overflow-hidden">
      <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${Math.min(pct, 100)}%` }} transition={{ duration: 0.7 }} style={{ backgroundColor: color }} />
    </div>
  );
}

function Ava({ initiales, color, size = 36 }: { initiales: string; color: string; size?: number }) {
  return (
    <div className="rounded-xl flex items-center justify-center font-bold flex-shrink-0" style={{ width: size, height: size, backgroundColor: `${color}28`, border: `1px solid ${color}38`, color, fontSize: size * 0.33 }}>
      {initiales}
    </div>
  );
}

function FullPageShell({ backLabel, onBack, title, subtitle, color, children, headerExtra }: {
  backLabel: string;
  onBack: () => void;
  title: string;
  subtitle?: string;
  color?: string;
  children: ReactNode;
  headerExtra?: ReactNode;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`${pageWrap} space-y-3 sm:space-y-4 md:space-y-5`}>
      <div className={fullPageToolbar}>
        <button type="button" onClick={onBack} className={fullPageBtn} title={backLabel}>
          <ArrowLeft size={16} className="flex-shrink-0" />
          <span className="truncate">{backLabel}</span>
        </button>
        {headerExtra}
      </div>
      <div className={`${fullPageCard}`} style={color ? { borderColor: `${color}22` } : undefined}>
        {color && <div className="h-1 w-full rounded-full mb-4 sm:mb-5" style={{ backgroundColor: color, opacity: 0.5 }} />}
        <div className="mb-5 sm:mb-6 min-w-0">
          <p className="text-lg sm:text-xl md:text-2xl font-bold vision-text break-words leading-tight">{title}</p>
          {subtitle && <p className="text-xs sm:text-sm vision-text-muted mt-1 break-words">{subtitle}</p>}
        </div>
        <div className="w-full min-w-0">{children}</div>
      </div>
    </motion.div>
  );
}

// ─── SCI ─────────────────────────────────────────────────────────────────────

export function SciDetailContent({ sci, properties, variant = "drawer" }: { sci: SCI; properties: Property[]; variant?: "drawer" | "page" }) {
  const props = properties.filter((p) => p.sciId === sci.id);
  const cf = props.reduce((s, p) => s + cashFlow(p), 0);
  const loyers = props.reduce((s, p) => s + p.loyer, 0);
  const crd = props.reduce((s, p) => s + (p.credit?.capitalRestant ?? 0), 0);

  return (
    <>
      <div className={metricsGridPage}>
        {[
          { l: "Valeur estimée", v: fmt(sci.valeurEstimee), c: sci.color },
          { l: "Loyers / mois", v: fmt(loyers), c: "#34d399" },
          { l: "Cash-flow", v: `${cf >= 0 ? "+" : ""}${fmt(cf)}`, c: cf >= 0 ? "#34d399" : "#f87171" },
          { l: "Crédit restant", v: fmt(crd), c: "#f87171" },
          { l: "Biens", v: String(props.length), c: "#60a5fa" },
          { l: "Régime", v: sci.type, c: sci.color },
        ].map((m) => (
          <div key={m.l} className="vision-surface rounded-xl p-3 min-w-0">
            <p className="text-[9px] sm:vision-table-head mb-1">{m.l}</p>
            <p className="text-xs sm:text-sm font-bold font-mono break-words" style={{ color: m.c }}>{m.v}</p>
          </div>
        ))}
      </div>
      <div className={`${G} p-4 mt-4`}>
        <p className={lbl}>Associés</p>
        <div className="space-y-2">
          {sci.associes.map((a) => (
            <div key={a.name} className="flex items-center justify-between gap-3">
              <span className="text-sm vision-text">{a.name}</span>
              <span className="font-mono font-bold text-sm" style={{ color: sci.color }}>{a.parts}%</span>
            </div>
          ))}
        </div>
      </div>
      {variant === "drawer" && props.length > 0 && (
        <div className={`${G} p-4`}>
          <p className={lbl}>{props.length} bien{props.length > 1 ? "s" : ""}</p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {props.slice(0, 5).map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 py-2 border-b border-[var(--v-border-subtle)] last:border-0">
                <p className="text-xs vision-text truncate">{p.address}</p>
                <CashChip value={cashFlow(p)} />
              </div>
            ))}
            {props.length > 5 && <p className="text-[10px] vision-text-muted text-center pt-1">+ {props.length - 5} autres biens</p>}
          </div>
        </div>
      )}
    </>
  );
}

export function SciDetailPage({ sci, properties, backLabel, onBack, onSelectProperty }: {
  sci: SCI;
  properties: Property[];
  backLabel: string;
  onBack: () => void;
  onSelectProperty?: (id: string) => void;
}) {
  const props = properties.filter((p) => p.sciId === sci.id);
  return (
    <FullPageShell backLabel={backLabel} onBack={onBack} title={sci.name} subtitle={`${sci.creation} · ${sci.type} · ${props.length} bien${props.length > 1 ? "s" : ""}`} color={sci.color}>
      <SciDetailContent sci={sci} properties={properties} variant="page" />
      {props.length > 0 && (
        <div className="mt-6 min-w-0">
          <p className={lbl}>Portefeuille immobilier</p>
          <div className={`hidden lg:block ${tableScroll} full-page-table-scroll`}>
            <table className="w-full min-w-[640px] text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-[var(--v-border-subtle)]">
                  {["Adresse", "Type", "Valeur", "Loyer", "Cash-flow", "CRD"].map((h) => (
                    <th key={h} className="text-left py-2 px-3 vision-text-muted uppercase tracking-wider text-[10px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {props.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => onSelectProperty?.(p.id)}
                    className={`border-b border-[var(--v-border-subtle)] ${onSelectProperty ? "cursor-pointer hover:vision-surface" : ""}`}
                  >
                    <td className="py-3 px-3"><p className="font-medium vision-text">{p.address}</p><p className="text-[10px] vision-text-muted">{p.ville}</p></td>
                    <td className="py-3 px-3 vision-text-muted">{p.type} · {p.surface}m²</td>
                    <td className="py-3 px-3 font-mono vision-info-text">{fmt(p.valeurActuelle)}</td>
                    <td className="py-3 px-3 font-mono">{p.loyer > 0 ? fmt(p.loyer) : "—"}</td>
                    <td className="py-3 px-3"><CashChip value={cashFlow(p)} /></td>
                    <td className="py-3 px-3 font-mono vision-negative-text">{p.credit ? fmt(p.credit.capitalRestant) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="lg:hidden space-y-2">
            {props.map((p) => (
              <button key={p.id} type="button" onClick={() => onSelectProperty?.(p.id)} className={mobileDetailCard}>
                <p className="text-sm font-semibold vision-text break-words">{p.address}</p>
                <p className="text-[10px] vision-text-muted mt-0.5">{p.type} · {p.surface}m² · {p.ville}</p>
                <div className="grid grid-cols-2 gap-2 mt-3 text-[10px] sm:text-xs">
                  <div><span className="vision-text-muted">Valeur</span><p className="font-mono font-semibold vision-info-text mt-0.5">{fmt(p.valeurActuelle)}</p></div>
                  <div><span className="vision-text-muted">Loyer</span><p className="font-mono vision-text mt-0.5">{p.loyer > 0 ? fmt(p.loyer) : "—"}</p></div>
                  <div><span className="vision-text-muted">Cash-flow</span><div className="mt-0.5"><CashChip value={cashFlow(p)} /></div></div>
                  <div><span className="vision-text-muted">CRD</span><p className="font-mono vision-negative-text mt-0.5">{p.credit ? fmt(p.credit.capitalRestant) : "—"}</p></div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </FullPageShell>
  );
}

// ─── TENANT ──────────────────────────────────────────────────────────────────

const statStyle: Record<Tenant["statut"], { bg: string; color: string }> = {
  "En cours": { bg: "rgba(52,211,153,0.13)", color: "#34d399" },
  "Impayé": { bg: "rgba(248,113,113,0.13)", color: "#f87171" },
  "Terminé": { bg: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" },
};

export function TenantDetailContent({ tenant, property, sci, variant = "drawer" }: { tenant: Tenant; property?: Property; sci: SCI; variant?: "drawer" | "page" }) {
  const pct = leasePct(tenant);
  const ss = statStyle[tenant.statut];
  return (
    <>
      <div className="flex flex-col sm:flex-row items-start gap-3 mb-4 min-w-0">
        <Ava initiales={tenant.initiales} color={sci.color} size={variant === "page" ? 48 : 40} />
        <div className="flex-1 min-w-0 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-wrap">
            <p className="text-base sm:text-lg font-bold vision-text break-words">{tenant.nom}</p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full self-start" style={{ backgroundColor: ss.bg, color: ss.color }}>{tenant.statut}</span>
          </div>
          <div className="flex items-center gap-1 mt-2 min-w-0"><Phone size={11} className="vision-text-muted flex-shrink-0" /><p className="text-xs sm:text-sm vision-text-muted break-all">{tenant.tel}</p></div>
          <div className="flex items-center gap-1 min-w-0"><Mail size={11} className="vision-text-muted flex-shrink-0" /><p className="text-xs sm:text-sm vision-text-muted break-all">{tenant.email}</p></div>
        </div>
      </div>
      {property && (
        <div className="vision-surface rounded-xl p-3 mb-4 flex items-start gap-2 min-w-0">
          <MapPin size={12} style={{ color: sci.color }} className="flex-shrink-0 mt-0.5" />
          <div className="min-w-0"><p className="text-sm font-semibold vision-text break-words">{property.address}</p><p className="text-[10px] vision-text-muted">{property.ville} · {property.type}</p></div>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mb-4">
        <div className="vision-surface rounded-xl p-3 min-w-0"><p className="text-[9px] vision-text-muted mb-1">Loyer</p><p className="font-mono font-bold vision-text break-words">{fmt(tenant.loyer)}</p></div>
        <div className="vision-surface rounded-xl p-3 min-w-0"><p className="text-[9px] vision-text-muted mb-1">Charges</p><p className="font-mono font-bold vision-text break-words">{fmt(tenant.charges)}</p></div>
        <div className="vision-surface rounded-xl p-3 min-w-0 sm:col-span-1 col-span-1"><p className="text-[9px] vision-text-muted mb-1">Total mensuel</p><p className="font-mono font-bold vision-positive-text break-words">{fmt(tenant.loyer + tenant.charges)}</p></div>
      </div>
      <div>
        <div className="flex justify-between mb-1.5 text-[10px] vision-text-muted"><span>{tenant.debutBail}</span><span>{tenant.finBail}</span></div>
        <GBar pct={pct} color={sci.color} />
        <p className="text-[10px] vision-text-muted mt-1">{pct < 100 ? `${100 - pct}% de bail restant` : "Bail terminé"}</p>
      </div>
    </>
  );
}

export function TenantDetailPage({ tenant, property, sci, backLabel, onBack }: {
  tenant: Tenant;
  property?: Property;
  sci: SCI;
  backLabel: string;
  onBack: () => void;
}) {
  return (
    <FullPageShell backLabel={backLabel} onBack={onBack} title={tenant.nom} subtitle={`Locataire · ${sci.shortName}`} color={sci.color}>
      <TenantDetailContent tenant={tenant} property={property} sci={sci} variant="page" />
    </FullPageShell>
  );
}

// ─── ALERT ───────────────────────────────────────────────────────────────────

const alertIcon = { bail: Key, credit: CreditCard, taxe: Calendar, assurance: Shield, info: AlertTriangle };
const sevCfg = {
  high: { color: "#f87171", label: "Urgent" },
  medium: { color: "#fbbf24", label: "Important" },
  low: { color: "rgba(255,255,255,0.55)", label: "Info" },
};

export function AlertDetailContent({ alert }: { alert: AlertItem }) {
  const cfg = sevCfg[alert.severity];
  const Icon = alertIcon[alert.type];
  return (
    <div className="space-y-4 w-full min-w-0">
      <div className="flex flex-col sm:flex-row items-start gap-3 min-w-0">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${cfg.color}18` }}>
          <Icon size={18} style={{ color: cfg.color }} />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${cfg.color}18`, color: cfg.color }}>{cfg.label}</span>
          <p className="text-sm sm:text-base vision-text-muted mt-2 leading-relaxed break-words">{alert.detail}</p>
        </div>
      </div>
      <div className={`${G} p-4`}>
        <p className={lbl}>Type d&apos;alerte</p>
        <p className="text-sm vision-text capitalize">{alert.type}</p>
      </div>
    </div>
  );
}

export function AlertDetailPage({ alert, backLabel, onBack }: { alert: AlertItem; backLabel: string; onBack: () => void }) {
  const cfg = sevCfg[alert.severity];
  return (
    <FullPageShell backLabel={backLabel} onBack={onBack} title={alert.title} subtitle={cfg.label} color={cfg.color}>
      <AlertDetailContent alert={alert} />
    </FullPageShell>
  );
}

// ─── COMPTABILITÉ SCI ────────────────────────────────────────────────────────

export function ComptaDetailContent({ sci, properties, variant = "drawer" }: { sci: SCI; properties: Property[]; variant?: "drawer" | "page" }) {
  const props = properties.filter((p) => p.sciId === sci.id);
  const loyers = props.reduce((s, p) => s + p.loyer, 0);
  const credits = props.reduce((s, p) => s + (p.credit?.mensualite ?? 0), 0);
  const taxes = props.reduce((s, p) => s + p.taxeFonciere / 12, 0);
  const assurances = props.reduce((s, p) => s + p.assurance / 12, 0);
  const res = loyers - credits - taxes - assurances;
  const maxV = Math.max(loyers, credits + taxes + assurances, 1);

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-4 min-w-0">
        <p className="text-sm vision-text-muted break-words">{sci.name}</p>
        <p className="text-lg sm:text-xl font-bold font-mono flex-shrink-0" style={{ color: res >= 0 ? "#34d399" : "#f87171" }}>{res >= 0 ? "+" : ""}{fmt(res)}<span className="text-sm font-normal vision-text-muted">/mois</span></p>
      </div>
      {[
        { label: "Loyers", value: loyers, color: "#34d399" },
        { label: "Crédits", value: credits, color: "#f87171" },
        { label: "Taxe foncière", value: taxes, color: "#fbbf24" },
        { label: "Assurances", value: assurances, color: "#94a3b8" },
      ].map((row) => (
        <div key={row.label} className="mb-3">
          <div className="flex justify-between mb-1"><p className="text-xs vision-text-muted">{row.label}</p><p className="text-xs font-mono font-bold" style={{ color: row.color }}>{fmt(row.value)}</p></div>
          <GBar pct={(row.value / maxV) * 100} color={row.color} />
        </div>
      ))}
      {variant === "page" && props.length > 0 && (
        <div className="mt-6 pt-4 border-t border-[var(--v-border-subtle)] min-w-0">
          <p className={lbl}>Détail par bien</p>
          <div className="hidden md:block">
            <div className={`${tableScroll} full-page-table-scroll`}>
              <table className="w-full min-w-[520px] text-xs">
                <thead>
                  <tr className="border-b border-[var(--v-border-subtle)] vision-text-muted uppercase text-[10px]">
                    {["Bien", "Loyer", "Crédit", "Taxe/mois", "Cash-flow"].map((h) => (
                      <th key={h} className="text-left py-2 px-2 font-bold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {props.map((p) => {
                    const cf = cashFlow(p);
                    return (
                      <tr key={p.id} className="border-b border-[var(--v-border-subtle)]">
                        <td className="py-2 px-2"><p className="vision-text">{p.address}</p><p className="text-[10px] vision-text-muted">{p.ville}</p></td>
                        <td className="py-2 px-2 font-mono">{fmt(p.loyer)}</td>
                        <td className="py-2 px-2 font-mono vision-negative-text">{fmt(p.credit?.mensualite ?? 0)}</td>
                        <td className="py-2 px-2 font-mono">{fmt(p.taxeFonciere / 12)}</td>
                        <td className="py-2 px-2"><CashChip value={cf} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div className="md:hidden space-y-2">
            {props.map((p) => {
              const cf = cashFlow(p);
              return (
                <div key={p.id} className={`${mobileDetailCard} cursor-default active:scale-100`}>
                  <p className="text-sm font-semibold vision-text break-words">{p.address}</p>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-[10px]">
                    <div><span className="vision-text-muted">Loyer</span><p className="font-mono vision-text mt-0.5">{fmt(p.loyer)}</p></div>
                    <div><span className="vision-text-muted">Crédit</span><p className="font-mono vision-negative-text mt-0.5">{fmt(p.credit?.mensualite ?? 0)}</p></div>
                    <div><span className="vision-text-muted">Taxe/mois</span><p className="font-mono mt-0.5">{fmt(p.taxeFonciere / 12)}</p></div>
                    <div><span className="vision-text-muted">Cash-flow</span><div className="mt-0.5"><CashChip value={cf} /></div></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

export function ComptaDetailPage({ sci, properties, backLabel, onBack }: { sci: SCI; properties: Property[]; backLabel: string; onBack: () => void }) {
  return (
    <FullPageShell backLabel={backLabel} onBack={onBack} title={`Comptabilité · ${sci.shortName}`} subtitle={sci.name} color={sci.color}>
      <ComptaDetailContent sci={sci} properties={properties} variant="page" />
    </FullPageShell>
  );
}
