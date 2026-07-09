import { useState } from "react";
import { motion } from "motion/react";
import { getCrdAtDate } from "@/lib/loanCalculator";
import { pageWrap, pageEndSpacer, G, lbl } from "./layout";
import { GSelect, monthOptions, yearOptions } from "./GSelect";

const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
const fmtD = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(n);

const DEFAULT_PROJECTION: Record<string, { month: number; year: number }> = {
  beneduc: { month: 3, year: 2026 },
  troika: { month: 10, year: 2025 },
  lavista: { month: 10, year: 2025 },
  rp: { month: 10, year: 2025 },
};

function shareRatio(sciId: string): number {
  if (sciId === "beneduc") return 0.5;
  if (sciId === "rp") return 0.66;
  return 0.33;
}

interface Credit { montantInitial: number; taux: number; duree: number; debut: string; assuranceMensuelle?: number; mensualite: number; capitalRestant: number; banque?: string }
interface Property { id: string; sciId: string; address: string; type: string; lots: number; loyer: number; taxeFonciere: number; valeurActuelle: number; credit?: Credit }
interface SCI { id: string; name: string; shortName: string; type: string; color: string; valeurEstimee: number }

function excelCash(p: Property) {
  return Math.round(p.loyer - (p.credit?.mensualite ?? 0) - p.taxeFonciere / 12);
}

function finCreditLabel(c: Credit) {
  const d = new Date(c.debut);
  d.setMonth(d.getMonth() + c.duree);
  return d.toLocaleDateString("fr-FR", { month: "short", year: "numeric" });
}

function PropertyMobileCard({ line, onSelect }: { line: { p: Property; crdRef: number; crdProj: number; mensualite: number; cash: number }; onSelect: () => void }) {
  const { p, crdRef, crdProj, mensualite, cash } = line;
  return (
    <button type="button" onClick={onSelect} className="w-full text-left p-4 rounded-xl vision-surface border border-[var(--v-border-subtle)] hover:vision-surface transition-colors active:scale-[0.99]">
      <p className="text-sm font-semibold vision-text break-words">{p.address}</p>
      <p className="text-[10px] vision-text-muted mt-0.5">{p.type} · {p.lots} lot{p.lots > 1 ? "s" : ""}</p>
      <div className="grid grid-cols-2 gap-2 mt-3 text-[10px] sm:text-xs">
        <div><span className="vision-text-muted">CRD projeté</span><p className="font-mono font-semibold vision-negative-text mt-0.5">{crdProj > 0 ? fmt(crdProj) : "—"}</p></div>
        <div><span className="vision-text-muted">Cash/mois</span><p className="font-mono font-semibold mt-0.5" style={{ color: cash >= 0 ? "#34d399" : "#f87171" }}>{cash >= 0 ? "+" : ""}{fmt(cash)}</p></div>
        <div><span className="vision-text-muted">Loyer</span><p className="font-mono vision-text mt-0.5">{p.loyer > 0 ? fmt(p.loyer) : "—"}</p></div>
        <div><span className="vision-text-muted">Mensualité</span><p className="font-mono vision-violet-text mt-0.5">{mensualite > 0 ? fmtD(mensualite) : "—"}</p></div>
        <div><span className="vision-text-muted">CRD réf.</span><p className="font-mono vision-text-muted mt-0.5">{crdRef > 0 ? fmt(crdRef) : "—"}</p></div>
        <div><span className="vision-text-muted">Valeur</span><p className="font-mono vision-info-text mt-0.5">{fmt(p.valeurActuelle)}</p></div>
      </div>
    </button>
  );
}

function EntityBlock({ sci, properties, onSelectProperty }: { sci: SCI; properties: Property[]; onSelectProperty: (id: string) => void }) {
  const defaults = DEFAULT_PROJECTION[sci.id] ?? { month: new Date().getMonth() + 1, year: new Date().getFullYear() };
  const [month, setMonth] = useState(defaults.month);
  const [year, setYear] = useState(defaults.year);
  const projection = new Date(year, month - 1, 1);

  const lines = properties.map((p) => {
    const crdRef = p.credit?.montantInitial ?? 0;
    const crdProj = p.credit
      ? getCrdAtDate({ montantInitial: p.credit.montantInitial, tauxAnnuel: p.credit.taux, dureeMois: p.credit.duree, dateDebut: p.credit.debut, assuranceMensuelle: p.credit.assuranceMensuelle }, projection)
      : 0;
    return { p, crdRef, crdProj, mensualite: p.credit?.mensualite ?? 0, cash: excelCash(p) };
  });

  const totals = {
    crdRef: lines.reduce((s, l) => s + l.crdRef, 0),
    crdProj: lines.reduce((s, l) => s + l.crdProj, 0),
    loyers: lines.reduce((s, l) => s + l.p.loyer, 0),
    mensualites: lines.reduce((s, l) => s + l.mensualite, 0),
    cash: lines.reduce((s, l) => s + l.cash, 0),
    loyersAn: lines.reduce((s, l) => s + l.p.loyer * 12, 0),
    taxes: lines.reduce((s, l) => s + l.p.taxeFonciere, 0),
    valeur: sci.valeurEstimee,
  };

  const ratio = shareRatio(sci.id);
  const partCredit = totals.crdProj * ratio;
  const partMensualites = totals.mensualites * ratio;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={`${G} overflow-hidden`} style={{ borderColor: `${sci.color}22` }}>
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-[var(--v-border-subtle)]" style={{ background: `linear-gradient(135deg, ${sci.color}12, transparent)` }}>
        <div className="flex flex-col lg:flex-row lg:flex-wrap lg:items-end lg:justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm sm:text-base font-bold vision-text break-words">{sci.name}</p>
            <p className="text-[10px] sm:text-xs vision-text-muted mt-0.5">{sci.type} · {properties.length} bien{properties.length > 1 ? "s" : ""}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 w-full lg:w-auto lg:min-w-[320px] xl:min-w-[380px]">
            <GSelect
              label="Mois"
              aria-label="Mois de projection"
              value={month}
              onChange={(e) => setMonth(+e.target.value)}
              options={monthOptions}
              wrapperClassName="w-full"
            />
            <GSelect
              label="Année"
              aria-label="Année de projection"
              value={year}
              onChange={(e) => setYear(+e.target.value)}
              options={yearOptions}
              wrapperClassName="w-full"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mt-4">
          <div className="bg-black/20 rounded-xl p-2.5 sm:p-3"><p className="text-[9px] sm:text-[10px] vision-text-muted">Part crédit ({Math.round(ratio * 100)}%)</p><p className="text-xs sm:text-sm font-bold font-mono mt-0.5 break-all" style={{ color: sci.color }}>{fmt(partCredit)}</p></div>
          <div className="bg-black/20 rounded-xl p-2.5 sm:p-3"><p className="text-[9px] sm:text-[10px] vision-text-muted">Mensualités part</p><p className="text-xs sm:text-sm font-bold font-mono mt-0.5 break-all" style={{ color: sci.color }}>{fmtD(partMensualites)}</p></div>
          <div className="bg-black/20 rounded-xl p-2.5 sm:p-3"><p className="text-[9px] sm:text-[10px] vision-text-muted">Cash mensuel total</p><p className="text-xs sm:text-sm font-bold font-mono mt-0.5" style={{ color: totals.cash >= 0 ? "#34d399" : "#f87171" }}>{totals.cash >= 0 ? "+" : ""}{fmt(totals.cash)}</p></div>
          <div className="bg-black/20 rounded-xl p-2.5 sm:p-3"><p className="text-[9px] sm:text-[10px] vision-text-muted">CRD projeté</p><p className="text-xs sm:text-sm font-bold font-mono mt-0.5 vision-negative-text break-all">{fmt(totals.crdProj)}</p></div>
        </div>
      </div>

      <div className="md:hidden p-4 space-y-3">
        {lines.map((line) => (
          <PropertyMobileCard key={line.p.id} line={line} onSelect={() => onSelectProperty(line.p.id)} />
        ))}
        <div className="p-4 rounded-xl vision-surface border border-[var(--v-glass-border)]">
          <p className="text-xs font-bold vision-text mb-2">TOTAL {sci.shortName}</p>
          <div className="grid grid-cols-2 gap-2 text-[10px] sm:text-xs">
            <div><span className="vision-text-muted">CRD projeté</span><p className="font-mono vision-negative-text font-bold">{fmt(totals.crdProj)}</p></div>
            <div><span className="vision-text-muted">Cash/mois</span><p className="font-mono font-bold" style={{ color: totals.cash >= 0 ? "#34d399" : "#f87171" }}>{fmt(totals.cash)}</p></div>
          </div>
        </div>
      </div>

      <div className="hidden md:block w-full overflow-x-auto">
        <table className="w-full min-w-[800px] lg:min-w-0 text-xs lg:text-sm">
          <thead>
            <tr className="border-b border-[var(--v-border-subtle)] vision-surface">
              {["Adresse", "Type", "Lots", "CRD réf.", "CRD projeté", "Loyer/mois", "Mensualité", "Cash/mois", "Loyer/an", "Taxe fonc.", "Fin crédit", "Valeur"].map((h) => (
                <th key={h} className="text-left px-3 lg:px-4 py-3 font-bold vision-text-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map(({ p, crdRef, crdProj, mensualite, cash }) => (
              <tr
                key={p.id}
                onClick={() => onSelectProperty(p.id)}
                className="border-b border-[var(--v-border-subtle)] hover:vision-surface cursor-pointer transition-colors group"
              >
                <td className="px-3 lg:px-4 py-3 max-w-[200px] xl:max-w-none"><p className="font-medium vision-text group-hover:vision-text break-words">{p.address}</p></td>
                <td className="px-3 lg:px-4 py-3 vision-text-muted whitespace-nowrap">{p.type}</td>
                <td className="px-3 lg:px-4 py-3 font-mono vision-text-muted text-center">{p.lots}</td>
                <td className="px-3 lg:px-4 py-3 font-mono vision-text whitespace-nowrap">{crdRef > 0 ? fmt(crdRef) : "—"}</td>
                <td className="px-3 lg:px-4 py-3 font-mono vision-negative-text whitespace-nowrap">{crdProj > 0 ? fmt(crdProj) : "—"}</td>
                <td className="px-3 lg:px-4 py-3 font-mono vision-text whitespace-nowrap">{p.loyer > 0 ? fmt(p.loyer) : "—"}</td>
                <td className="px-3 lg:px-4 py-3 font-mono vision-violet-text whitespace-nowrap">{mensualite > 0 ? fmtD(mensualite) : "—"}</td>
                <td className="px-3 lg:px-4 py-3 font-mono font-semibold whitespace-nowrap" style={{ color: cash >= 0 ? "#34d399" : "#f87171" }}>{p.loyer > 0 || mensualite > 0 ? `${cash >= 0 ? "+" : ""}${fmt(cash)}` : "—"}</td>
                <td className="px-3 lg:px-4 py-3 font-mono vision-text whitespace-nowrap">{p.loyer > 0 ? fmt(p.loyer * 12) : "—"}</td>
                <td className="px-3 lg:px-4 py-3 font-mono vision-text-muted whitespace-nowrap">{fmt(p.taxeFonciere)}</td>
                <td className="px-3 lg:px-4 py-3 vision-text-muted whitespace-nowrap">{p.credit ? finCreditLabel(p.credit) : "—"}</td>
                <td className="px-3 lg:px-4 py-3 font-mono vision-info-text whitespace-nowrap">{fmt(p.valeurActuelle)}</td>
              </tr>
            ))}
            <tr className="vision-surface font-bold">
              <td className="px-3 lg:px-4 py-3 vision-text" colSpan={3}>TOTAL</td>
              <td className="px-3 lg:px-4 py-3 font-mono vision-text">{fmt(totals.crdRef)}</td>
              <td className="px-3 lg:px-4 py-3 font-mono vision-negative-text">{fmt(totals.crdProj)}</td>
              <td className="px-3 lg:px-4 py-3 font-mono vision-text">{fmt(totals.loyers)}</td>
              <td className="px-3 lg:px-4 py-3 font-mono vision-violet-text">{fmtD(totals.mensualites)}</td>
              <td className="px-3 lg:px-4 py-3 font-mono" style={{ color: totals.cash >= 0 ? "#34d399" : "#f87171" }}>{totals.cash >= 0 ? "+" : ""}{fmt(totals.cash)}</td>
              <td className="px-3 lg:px-4 py-3 font-mono vision-text">{fmt(totals.loyersAn)}</td>
              <td className="px-3 lg:px-4 py-3 font-mono vision-text-muted">{fmt(totals.taxes)}</td>
              <td className="px-3 lg:px-4 py-3" />
              <td className="px-3 lg:px-4 py-3 font-mono vision-info-text">{fmt(totals.valeur)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

export function VisionPatrimoinePanel({ scis, properties, onSelectProperty }: {
  scis: SCI[];
  properties: Property[];
  onSelectProperty: (id: string) => void;
}) {
  return (
    <div className={`${pageWrap} space-y-4 md:space-y-5`}>
      <div className={`${G} px-4 sm:px-6 py-4`}>
        <p className={lbl}>Vision patrimoine</p>
        <p className="text-xs sm:text-sm vision-text-muted">Projection par SCI — sélecteurs accessibles, tableau sur grand écran, cartes sur mobile.</p>
      </div>
      {scis.map((sci) => {
        const props = properties.filter((p) => p.sciId === sci.id);
        if (props.length === 0) return null;
        return <EntityBlock key={sci.id} sci={sci} properties={props} onSelectProperty={onSelectProperty} />;
      })}
      <div className={pageEndSpacer} aria-hidden />
    </div>
  );
}
