/**
 * Série annuelle « Évolution du patrimoine » à partir des biens / crédits réels.
 * Remplace l’ancien jeu de données figé 2017–2024.
 */
import { creationToInputValue } from "@/lib/creationDate";
import {
  getCrdAtDate,
  hasInterestOnlyAmortization,
  hasRateBasedAmortization,
  parseLocalDate,
  projectFlatCrd,
} from "@/lib/loanCalculator";

export type PatrimoinePoint = {
  an: string;
  /** Valeur brute en k€ */
  valeur: number;
  /** Dette (CRD) en k€ */
  dette: number;
  /** Net en k€ */
  net: number;
};

type CreditLike = {
  montantInitial: number;
  taux: number;
  duree: number;
  debut: string;
  assuranceMensuelle?: number;
  mensualite: number;
  capitalRestant: number;
  amortizationModel?: string | null;
};

type PropertyLike = {
  sciId: string;
  prixAchat: number;
  travaux: number;
  fraisNotaire: number;
  valeurActuelle: number;
  credit?: CreditLike;
};

type SciLike = {
  id: string;
  creation: string;
  valeurEstimee: number;
};

function yearFromIsoOrCreation(value: string | null | undefined): number | null {
  if (!value?.trim()) return null;
  const iso = creationToInputValue(value) || value;
  const d = parseLocalDate(iso.slice(0, 10));
  if (Number.isNaN(d.getTime())) return null;
  return d.getFullYear();
}

function acquisitionYear(p: PropertyLike, sciById: Map<string, SciLike>): number | null {
  if (p.credit?.debut) {
    const y = yearFromIsoOrCreation(p.credit.debut);
    if (y != null) return y;
  }
  const sci = sciById.get(p.sciId);
  return sci ? yearFromIsoOrCreation(sci.creation) : null;
}

function costBasis(p: PropertyLike): number {
  const cost = (p.prixAchat || 0) + (p.travaux || 0) + (p.fraisNotaire || 0);
  return cost > 0 ? cost : p.valeurActuelle || 0;
}

/** Valeur du bien au 31/12 de `year` (interpolation coût → valeur actuelle). */
function propertyValueAtYear(p: PropertyLike, year: number, nowYear: number, startYear: number | null): number {
  if (startYear != null && year < startYear) return 0;
  const current = p.valeurActuelle || 0;
  if (year >= nowYear) return current;
  const start = startYear ?? nowYear;
  const cost = costBasis(p);
  if (nowYear <= start) return current;
  const t = (year - start) / (nowYear - start);
  return Math.max(0, cost + (current - cost) * Math.min(1, Math.max(0, t)));
}

function crdAtYearEnd(credit: CreditLike, year: number): number {
  const projection = new Date(year, 11, 1); // 1er décembre = fin d’année fiscale approx.
  if (hasInterestOnlyAmortization(credit) || hasRateBasedAmortization(credit)) {
    if (!credit.debut || !credit.duree || !credit.montantInitial) {
      return year >= new Date().getFullYear() ? credit.capitalRestant || 0 : 0;
    }
    return getCrdAtDate(
      {
        montantInitial: credit.montantInitial,
        tauxAnnuel: credit.taux,
        dureeMois: credit.duree,
        dateDebut: credit.debut,
        assuranceMensuelle: credit.assuranceMensuelle,
        amortizationModel: credit.amortizationModel,
      },
      projection,
    );
  }

  // Excel / flat : CRD_réf − mensualité × mois depuis début
  const refDate = credit.debut ? parseLocalDate(credit.debut) : new Date(year, 0, 1);
  if (Number.isNaN(refDate.getTime())) return credit.capitalRestant || 0;
  if (projection < refDate) return 0;
  return projectFlatCrd({
    capitalAtRef: credit.montantInitial || credit.capitalRestant,
    refDate,
    projectionDate: projection,
    mensualite: credit.mensualite,
  });
}

function toK(n: number): number {
  return Math.round(n / 1000);
}

/**
 * Construit la série annuelle valeur / dette / net (en k€).
 * @param shareRatioFn optionnel — ratio 0–1 par sciId (quote-part associée)
 */
export function buildPatrimoineEvolution(
  properties: PropertyLike[],
  scis: SciLike[],
  opts?: {
    asOf?: Date;
    shareRatioFn?: (sciId: string) => number;
  },
): { data: PatrimoinePoint[]; fromYear: number; toYear: number } {
  const asOf = opts?.asOf ?? new Date();
  const nowYear = asOf.getFullYear();
  const sciById = new Map(scis.map((s) => [s.id, s]));
  const ratioOf = opts?.shareRatioFn ?? (() => 1);

  const startCandidates: number[] = [];
  for (const sci of scis) {
    const y = yearFromIsoOrCreation(sci.creation);
    if (y != null) startCandidates.push(y);
  }
  for (const p of properties) {
    const y = acquisitionYear(p, sciById);
    if (y != null) startCandidates.push(y);
  }

  const fromYear = startCandidates.length ? Math.min(...startCandidates) : Math.max(2015, nowYear - 8);
  const toYear = nowYear;

  const data: PatrimoinePoint[] = [];
  for (let year = fromYear; year <= toYear; year++) {
    let valeur = 0;
    let dette = 0;
    for (const p of properties) {
      const r = ratioOf(p.sciId);
      if (r <= 0) continue;
      const start = acquisitionYear(p, sciById);
      valeur += propertyValueAtYear(p, year, nowYear, start) * r;
      if (p.credit) dette += crdAtYearEnd(p.credit, year) * r;
    }

    // Dernier point : coller aux totaux « vivants » (valeur SCI + CRD actuel)
    if (year === toYear) {
      const liveValeur = scis.reduce((s, sci) => s + (sci.valeurEstimee || 0) * ratioOf(sci.id), 0);
      const liveDette = properties.reduce(
        (s, p) => s + (p.credit?.capitalRestant ?? 0) * ratioOf(p.sciId),
        0,
      );
      if (liveValeur > 0) valeur = liveValeur;
      dette = liveDette;
    }

    data.push({
      an: String(year),
      valeur: toK(valeur),
      dette: toK(dette),
      net: toK(Math.max(0, valeur - dette)),
    });
  }

  return { data, fromYear, toYear };
}

export function patrimoineRangeLabel(fromYear: number, toYear: number): string {
  if (fromYear === toYear) return `${fromYear} · milliers d'euros`;
  return `${fromYear}–${toYear} · milliers d'euros`;
}
