import type { ReactNode } from "react";
import { buildAmortizationSchedule, computeLoanSummary, type LoanInput } from "@/lib/loanCalculator";
import { G, lbl } from "./layout";

const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
const fmtD = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(n);

export interface CreditShape {
  banque: string;
  montantInitial: number;
  taux: number;
  duree: number;
  debut: string;
  assuranceMensuelle?: number;
  mensualite: number;
  capitalRestant: number;
}

export interface PropertyShape {
  id: string;
  sciId: string;
  address: string;
  ville: string;
  cp: string;
  type: string;
  surface: number;
  lots: number;
  prixAchat: number;
  travaux: number;
  fraisNotaire: number;
  valeurActuelle: number;
  loyer: number;
  taxeFonciere: number;
  assurance: number;
  credit?: CreditShape;
}

function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="vision-surface backdrop-blur-xl border border-[var(--v-glass-border)] rounded-2xl p-3 sm:p-4 min-w-0">
      <p className={lbl}>{label}</p>
      <p className="text-sm sm:text-base font-bold font-mono break-words" style={{ color: color ?? "rgba(255,255,255,0.9)" }}>{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <div className="vision-surface backdrop-blur-xl border border-[var(--v-glass-border)] rounded-2xl p-4 sm:p-5 w-full min-w-0"><p className={`${lbl} mb-3`}>{title}</p>{children}</div>;
}

export function PropertyDetailContent({ property, sciName, sciColor, onViewCredit, variant = "drawer" }: {
  property: PropertyShape;
  sciName: string;
  sciColor: string;
  onViewCredit?: () => void;
  variant?: "drawer" | "page";
}) {
  const cr = property.prixAchat + property.travaux + property.fraisNotaire;
  const pv = property.valeurActuelle - cr;
  const cf = Math.round(property.loyer - (property.credit?.mensualite ?? 0) - property.taxeFonciere / 12);
  const loanInput: LoanInput | null = property.credit ? {
    montantInitial: property.credit.montantInitial,
    tauxAnnuel: property.credit.taux,
    dureeMois: property.credit.duree,
    dateDebut: property.credit.debut,
    assuranceMensuelle: property.credit.assuranceMensuelle,
  } : null;
  const summary = loanInput ? computeLoanSummary(loanInput) : null;

  return (
    <div className="space-y-4 w-full min-w-0">
      {variant === "drawer" && (
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold border" style={{ color: sciColor, borderColor: `${sciColor}38`, backgroundColor: `${sciColor}14` }}>{sciName}</span>
          <span className="text-[10px] vision-text-muted">{property.cp} {property.ville}</span>
        </div>
      )}

      <div className={`grid grid-cols-2 sm:grid-cols-3 ${variant === "page" ? "xl:grid-cols-4" : "lg:grid-cols-4"} gap-2 sm:gap-3 w-full min-w-0`}>
        <Metric label="Type" value={`${property.type} · ${property.surface} m²`} />
        <Metric label="Lots" value={String(property.lots)} />
        <Metric label="Valeur actuelle" value={fmt(property.valeurActuelle)} color="#60a5fa" />
        <Metric label="Plus-value" value={`${pv >= 0 ? "+" : ""}${fmt(pv)}`} color={pv >= 0 ? "#34d399" : "#f87171"} />
        <Metric label="Loyer mensuel" value={property.loyer > 0 ? fmt(property.loyer) : "—"} />
        <Metric label="Cash-flow mensuel" value={`${cf >= 0 ? "+" : ""}${fmt(cf)}`} color={cf >= 0 ? "#34d399" : "#f87171"} />
        <Metric label="Taxe foncière / an" value={fmt(property.taxeFonciere)} />
        <Metric label="Assurance / an" value={fmt(property.assurance)} />
      </div>

      <Section title="Acquisition">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 text-xs sm:text-sm">
          <div><span className="vision-text-muted">Prix d'achat</span><p className="font-mono font-semibold vision-text mt-0.5">{fmt(property.prixAchat)}</p></div>
          <div><span className="vision-text-muted">Travaux</span><p className="font-mono font-semibold vision-text mt-0.5">{fmt(property.travaux)}</p></div>
          <div><span className="vision-text-muted">Frais de notaire</span><p className="font-mono font-semibold vision-text mt-0.5">{fmt(property.fraisNotaire)}</p></div>
          <div><span className="vision-text-muted">Coût total</span><p className="font-mono font-semibold vision-text mt-0.5">{fmt(cr)}</p></div>
        </div>
      </Section>

      {property.credit && summary && loanInput && variant !== "page" && (
        <Section title="Crédit immobilier">
          <div className="grid grid-cols-2 gap-2 mb-3">
            <Metric label="Banque" value={property.credit.banque} />
            <Metric label="Taux" value={`${property.credit.taux} %`} />
            <Metric label="Montant emprunté" value={fmt(property.credit.montantInitial)} />
            <Metric label="Capital restant" value={fmt(summary.capitalRestant)} color="#f87171" />
            <Metric label="Mensualité crédit" value={fmtD(summary.mensualite)} color="#a78bfa" />
            <Metric label="Mensualité totale" value={fmtD(summary.mensualiteTotale)} />
            <Metric label="Remboursé" value={`${summary.pctRembourse} %`} color="#34d399" />
            <Metric label="Fin de prêt" value={summary.finCredit.toLocaleDateString("fr-FR", { month: "short", year: "numeric" })} />
          </div>
          {onViewCredit && (
            <button onClick={onViewCredit} className="w-full min-h-[44px] py-2.5 rounded-xl text-xs sm:text-sm font-semibold border border-blue-400/25 bg-blue-500/15 vision-info-text hover:bg-blue-500/25 transition-colors">
              {variant === "page" ? "Voir le crédit et l'amortissement" : "Voir le tableau d'amortissement"}
            </button>
          )}
        </Section>
      )}
    </div>
  );
}

export function CreditDetailContent({ credit, property, sciName, sciColor, fullSchedule = false, previewSchedule = false }: {
  credit: CreditShape;
  property: PropertyShape;
  sciName: string;
  sciColor: string;
  fullSchedule?: boolean;
  previewSchedule?: boolean;
}) {
  const loanInput: LoanInput = {
    montantInitial: credit.montantInitial,
    tauxAnnuel: credit.taux,
    dureeMois: credit.duree,
    dateDebut: credit.debut,
    assuranceMensuelle: credit.assuranceMensuelle,
  };
  const summary = computeLoanSummary(loanInput);
  const schedule = buildAmortizationSchedule(loanInput);
  const cf = Math.round(property.loyer - summary.mensualite - property.taxeFonciere / 12);

  const scheduleRows = fullSchedule ? schedule : previewSchedule ? schedule.slice(0, 6) : schedule.slice(0, 24);

  return (
    <div className="space-y-4 w-full min-w-0">
      {!previewSchedule && (
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold border flex-shrink-0" style={{ color: sciColor, borderColor: `${sciColor}38`, backgroundColor: `${sciColor}14` }}>{sciName}</span>
          <span className="text-xs vision-text-muted break-words min-w-0">{property.address}, {property.ville}</span>
        </div>
      )}

      {!previewSchedule && (
      <div className={`grid grid-cols-2 sm:grid-cols-3 ${fullSchedule ? "xl:grid-cols-4" : "lg:grid-cols-4"} gap-2 sm:gap-3 w-full min-w-0`}>
        <Metric label="Banque" value={credit.banque} />
        <Metric label="Taux annuel" value={`${credit.taux} %`} />
        <Metric label="Montant emprunté" value={fmt(credit.montantInitial)} />
        <Metric label="Capital restant" value={fmt(summary.capitalRestant)} color="#f87171" />
        <Metric label="Mensualité crédit" value={fmtD(summary.mensualite)} color="#a78bfa" />
        <Metric label="Assurance / mois" value={fmtD(credit.assuranceMensuelle ?? 0)} />
        <Metric label="Mensualité totale" value={fmtD(summary.mensualiteTotale)} />
        <Metric label="Intérêts totaux" value={fmt(summary.totalInterets)} color="#fbbf24" />
        <Metric label="Cash-flow bien" value={`${cf >= 0 ? "+" : ""}${fmt(cf)}`} color={cf >= 0 ? "#34d399" : "#f87171"} />
        <Metric label="Fin de prêt" value={summary.finCredit.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })} />
      </div>
      )}

      <Section title={previewSchedule ? "Prochaines échéances" : "Tableau d'amortissement"}>
        <p className="text-[10px] vision-text-muted mb-2 sm:hidden">Glissez horizontalement pour voir toutes les colonnes</p>
        <div className={`full-page-table-scroll ${fullSchedule ? "max-h-[min(60vh,560px)] sm:max-h-[min(70vh,640px)] overflow-y-auto" : ""} w-full min-w-0 overflow-x-auto overscroll-x-contain touch-pan-x -mx-1 px-1`}>
          <table className={`w-full text-[10px] sm:text-xs ${fullSchedule ? "min-w-[480px] sm:min-w-[560px]" : "min-w-[400px]"}`}>
            <thead className={fullSchedule ? "sticky top-0 bg-[#0d1630] z-10 shadow-sm" : ""}>
              <tr className="border-b border-[var(--v-border-subtle)] vision-text-muted uppercase tracking-wider">
                {[
                  { h: "Mois", hide: false },
                  { h: "Date", hide: false },
                  { h: "CRD", hide: false },
                  { h: "Capital", hide: "sm" },
                  { h: "Intérêts", hide: "sm" },
                  { h: "Mensualité", hide: false },
                ].map(({ h, hide }) => (
                  <th key={h} className={`text-left py-2 px-1.5 sm:px-2 font-bold whitespace-nowrap ${hide === "sm" ? "hidden sm:table-cell" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scheduleRows.map((row) => (
                <tr key={row.moisIndex} className="border-b border-[var(--v-border-subtle)] hover:vision-surface">
                  <td className="py-1.5 px-1.5 sm:px-2 font-mono vision-text-muted">{row.moisIndex}</td>
                  <td className="py-1.5 px-1.5 sm:px-2 vision-text-muted whitespace-nowrap">{row.periode.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" })}</td>
                  <td className="py-1.5 px-1.5 sm:px-2 font-mono vision-text whitespace-nowrap">{fmtD(row.crd)}</td>
                  <td className="py-1.5 px-1.5 sm:px-2 font-mono vision-positive-text/80 whitespace-nowrap hidden sm:table-cell">{fmtD(row.capitalAmorti)}</td>
                  <td className="py-1.5 px-1.5 sm:px-2 font-mono text-amber-300/80 whitespace-nowrap hidden sm:table-cell">{fmtD(row.interets)}</td>
                  <td className="py-1.5 px-1.5 sm:px-2 font-mono vision-text whitespace-nowrap">{fmtD(row.mensualite)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!fullSchedule && schedule.length > scheduleRows.length && (
          <p className="text-[10px] vision-text-muted mt-2 text-center">
            + {schedule.length - scheduleRows.length} échéances · durée totale {credit.duree} mois
          </p>
        )}
        {fullSchedule && (
          <p className="text-[10px] vision-text-muted mt-2 text-center">{schedule.length} échéances · durée totale {credit.duree} mois</p>
        )}
      </Section>
    </div>
  );
}
