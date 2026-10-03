import { useEffect, useMemo, useRef, type ReactNode } from "react";
import {
  buildAmortizationSchedule,
  computeLoanSummary,
  isInterestOnlyModel,
  type LoanInput,
} from "@/lib/loanCalculator";
import { cashFlowMensuel, honorairesGestionMensuel } from "@/lib/propertyFinance";
import { computePropertyYield, formatYieldPct } from "@/lib/propertyYield";
import { MetricCard } from "./MetricWithFormula";
import { lbl } from "./layout";

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
  amortizationModel?: string | null;
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
  gestionDeleguee?: boolean;
  honorairesGestionPct?: number;
  credit?: CreditShape;
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
  const cf = cashFlowMensuel(property, false);
  const honoraires = honorairesGestionMensuel(property);
  const yieldPct = computePropertyYield(property);
  const loanInput: LoanInput | null = property.credit ? {
    montantInitial: property.credit.montantInitial,
    tauxAnnuel: property.credit.taux,
    dureeMois: property.credit.duree,
    dateDebut: property.credit.debut,
    assuranceMensuelle: property.credit.assuranceMensuelle,
    amortizationModel: property.credit.amortizationModel,
  } : null;
  const summary = loanInput ? computeLoanSummary(loanInput) : null;

  return (
    <div className="space-y-4 w-full min-w-0">
      {variant === "drawer" && (
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-lg text-xs font-bold border" style={{ color: sciColor, borderColor: `${sciColor}38`, backgroundColor: `${sciColor}14` }}>{sciName}</span>
          <span className="text-xs vision-text-muted">{property.cp} {property.ville}</span>
        </div>
      )}

      <div className={`grid grid-cols-2 sm:grid-cols-3 ${variant === "page" ? "xl:grid-cols-4" : "lg:grid-cols-4"} gap-2 sm:gap-3 w-full min-w-0`}>
        <MetricCard label="Type" value={`${property.type} · ${property.surface} m²`} />
        <MetricCard label="Lots" value={String(property.lots)} />
        <MetricCard label="Valeur actuelle" value={fmt(property.valeurActuelle)} color="#60a5fa" />
        <MetricCard label="Plus-value" value={`${pv >= 0 ? "+" : ""}${fmt(pv)}`} color={pv >= 0 ? "#34d399" : "#f87171"} />
        <MetricCard label="Loyer mensuel" value={property.loyer > 0 ? fmt(property.loyer) : "—"} />
        <MetricCard label="Cash-flow mensuel" value={`${cf >= 0 ? "+" : ""}${fmt(cf)}`} color={cf >= 0 ? "#34d399" : "#f87171"} />
        <MetricCard label="Rendement brut" value={formatYieldPct(yieldPct.brut)} color="#fbbf24" />
        <MetricCard label="Rendement net" value={formatYieldPct(yieldPct.net)} color="#34d399" />
        <MetricCard label="Taxe foncière / an" value={fmt(property.taxeFonciere)} />
        <MetricCard label="Assurance / an" value={fmt(property.assurance)} />
        <MetricCard
          label="Gestion locative"
          value={property.gestionDeleguee ? `Déléguée · ${property.honorairesGestionPct ?? 0} %` : "Directe"}
        />
        {property.gestionDeleguee && (
          <MetricCard label="Honoraires / mois" value={fmtD(honoraires)} color="#fbbf24" />
        )}
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
            <MetricCard label="Prêteur" value={property.credit.banque} />
            <MetricCard
              label="Type"
              value={isInterestOnlyModel(property.credit.amortizationModel) ? "Intérêts seuls (in fine)" : "Amortissement"}
            />
            <MetricCard label="Taux" value={`${property.credit.taux} %`} />
            <MetricCard label="Montant emprunté" value={fmt(property.credit.montantInitial)} />
            <MetricCard label="Capital restant" value={fmt(summary.capitalRestant)} color="#f87171" />
            <MetricCard
              label={isInterestOnlyModel(property.credit.amortizationModel) ? "Intérêts / mois" : "Mensualité crédit"}
              value={fmtD(summary.mensualite)}
              color="#a78bfa"
            />
            <MetricCard label="Mensualité totale" value={fmtD(summary.mensualiteTotale)} />
            <MetricCard label="Remboursé" value={`${summary.pctRembourse} %`} color="#34d399" />
            <MetricCard label="Fin de prêt" value={summary.finCredit.toLocaleDateString("fr-FR", { month: "short", year: "numeric" })} />
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
    amortizationModel: credit.amortizationModel,
  };
  const summary = computeLoanSummary(loanInput);
  const schedule = buildAmortizationSchedule(loanInput);
  const cf = cashFlowMensuel({ ...property, credit: { mensualite: summary.mensualite } }, false);

  const today = useMemo(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  }, []);

  const currentIndex = useMemo(() => {
    if (!schedule.length) return 0;
    let idx = schedule.findIndex((row) => {
      const d = new Date(row.periode.getFullYear(), row.periode.getMonth(), 1);
      return d.getTime() >= today.getTime();
    });
    if (idx < 0) idx = schedule.length - 1;
    return idx;
  }, [schedule, today]);

  const scheduleRows = useMemo(() => {
    if (fullSchedule) return schedule;
    if (previewSchedule) return schedule.slice(currentIndex, currentIndex + 6);
    // Vue intermédiaire : autour d’aujourd’hui (passé proche + futur)
    const from = Math.max(0, currentIndex - 2);
    return schedule.slice(from, from + 24);
  }, [fullSchedule, previewSchedule, schedule, currentIndex]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const currentRowRef = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    if (!fullSchedule) return;
    currentRowRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [fullSchedule, currentIndex, credit.debut, credit.duree]);

  const debutLabel = credit.debut
    ? new Date(credit.debut + (credit.debut.length === 10 ? "T12:00:00" : "")).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
    : "—";

  return (
    <div className="space-y-4 w-full min-w-0">
      {!previewSchedule && (
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="px-2 py-0.5 rounded-lg text-xs font-bold border flex-shrink-0" style={{ color: sciColor, borderColor: `${sciColor}38`, backgroundColor: `${sciColor}14` }}>{sciName}</span>
          <span className="text-xs vision-text-muted break-words min-w-0">{property.address}, {property.ville}</span>
        </div>
      )}

      {!previewSchedule && (
      <div className={`grid grid-cols-2 sm:grid-cols-3 ${fullSchedule ? "xl:grid-cols-4" : "lg:grid-cols-4"} gap-2 sm:gap-3 w-full min-w-0`}>
        <MetricCard label="Prêteur" value={credit.banque} />
        <MetricCard
          label="Type"
          value={isInterestOnlyModel(credit.amortizationModel) ? "Intérêts seuls (in fine)" : "Amortissement"}
        />
        <MetricCard label="Taux annuel" value={`${credit.taux} %`} />
        <MetricCard label="Montant emprunté" value={fmt(credit.montantInitial)} />
        <MetricCard label="Date de début" value={debutLabel} />
        <MetricCard label="Capital restant" value={fmt(summary.capitalRestant)} color="#f87171" />
        <MetricCard label="Mensualité crédit" value={fmtD(summary.mensualite)} color="#a78bfa" />
        <MetricCard label="Assurance / mois" value={fmtD(credit.assuranceMensuelle ?? 0)} />
        <MetricCard label="Mensualité totale" value={fmtD(summary.mensualiteTotale)} />
        <MetricCard label="Intérêts totaux" value={fmt(summary.totalInterets)} color="#fbbf24" />
        <MetricCard label="Cash-flow bien" value={`${cf >= 0 ? "+" : ""}${fmt(cf)}`} color={cf >= 0 ? "#34d399" : "#f87171"} />
        <MetricCard label="Fin de prêt" value={summary.finCredit.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })} />
      </div>
      )}

      <Section title={previewSchedule ? "Prochaines échéances (depuis aujourd’hui)" : "Tableau d'amortissement"}>
        {!previewSchedule && (
          <p className="text-xs vision-text-muted mb-2">
            Mois en cours mis en évidence · mensualité = crédit + assurance (comme le TAM banque)
          </p>
        )}
        <p className="text-xs vision-text-muted mb-2 sm:hidden">Glissez horizontalement pour les colonnes · faites défiler pour voir les lignes</p>
        <div
          ref={scrollRef}
          className={`w-full min-w-0 overflow-x-auto overscroll-x-contain touch-pan-x -mx-1 px-1 ${
            fullSchedule ? "sm:max-h-[min(70vh,640px)] sm:overflow-y-auto sm:overscroll-y-contain" : ""
          }`}
        >
          <table className={`w-full text-xs sm:text-sm ${fullSchedule ? "min-w-[480px] sm:min-w-[560px]" : "min-w-[400px]"}`}>
            <thead className={fullSchedule ? "sm:sticky sm:top-0 z-10 shadow-sm [&_tr]:bg-[var(--v-input-bg)]" : ""}>
              <tr className="border-b border-[var(--v-border-subtle)] vision-text-muted uppercase tracking-wider">
                {[
                  { h: "Mois", hide: false },
                  { h: "Date", hide: false },
                  { h: "CRD", hide: false },
                  { h: "Capital", hide: "sm" },
                  { h: "Intérêts", hide: "sm" },
                  { h: "Échéance", hide: false },
                ].map(({ h, hide }) => (
                  <th key={h} className={`text-left py-2 px-1.5 sm:px-2 font-bold whitespace-nowrap ${hide === "sm" ? "hidden sm:table-cell" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scheduleRows.map((row) => {
                const rowMonth = new Date(row.periode.getFullYear(), row.periode.getMonth(), 1);
                const isCurrent = rowMonth.getTime() === today.getTime();
                const echeance = row.mensualite + (row.assurance || 0);
                return (
                  <tr
                    key={row.moisIndex}
                    ref={isCurrent ? currentRowRef : undefined}
                    className={`border-b border-[var(--v-border-subtle)] ${isCurrent ? "bg-blue-500/15" : "hover:vision-surface"}`}
                  >
                    <td className="py-1.5 px-1.5 sm:px-2 font-mono vision-text-muted">
                      {row.moisIndex}
                      {isCurrent ? <span className="ml-1 text-[10px] font-bold vision-info-text">auj.</span> : null}
                    </td>
                    <td className="py-1.5 px-1.5 sm:px-2 vision-text-muted whitespace-nowrap">{row.periode.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" })}</td>
                    <td className="py-1.5 px-1.5 sm:px-2 font-mono vision-text whitespace-nowrap">{fmtD(row.crd)}</td>
                    <td className="py-1.5 px-1.5 sm:px-2 font-mono vision-positive-text/80 whitespace-nowrap hidden sm:table-cell">{fmtD(row.capitalAmorti)}</td>
                    <td className="py-1.5 px-1.5 sm:px-2 font-mono text-amber-300/80 whitespace-nowrap hidden sm:table-cell">{fmtD(row.interets)}</td>
                    <td className="py-1.5 px-1.5 sm:px-2 font-mono vision-text whitespace-nowrap">{fmtD(echeance)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!fullSchedule && schedule.length > scheduleRows.length && (
          <p className="text-xs vision-text-muted mt-2 text-center">
            + {schedule.length - scheduleRows.length} échéances · durée totale {credit.duree} mois
          </p>
        )}
        {fullSchedule && (
          <p className="text-xs vision-text-muted mt-2 text-center">{schedule.length} échéances · début {debutLabel} · durée {credit.duree} mois</p>
        )}
      </Section>
    </div>
  );
}
