/**
 * Série annuelle « Évolution du patrimoine » à partir des biens / crédits réels.
 * Passé interpolé + futur projeté (valeur constante, dette amortie jusqu’à fin des prêts).
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
  /** Net en k€ (peut être négatif) */
  net: number;
  /** Année > année courante (projection) */
  futur?: boolean;
};

type CreditLike = {
  montantInitial: number;
  taux: number;
  duree: number;
  debut: string;
  finCredit?: string | null;
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

/** Nombre d’années visibles dans la fenêtre du graphique. */
export const PATRIMOINE_WINDOW_YEARS = 8;

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

function creditEndYear(credit: CreditLike): number | null {
  if (credit.finCredit) {
    const y = yearFromIsoOrCreation(credit.finCredit);
    if (y != null) return y;
  }
  if (credit.debut && credit.duree > 0) {
    const d = parseLocalDate(credit.debut);
    if (!Number.isNaN(d.getTime())) {
      d.setMonth(d.getMonth() + credit.duree);
      return d.getFullYear();
    }
  }
  return null;
}

function costBasis(p: PropertyLike): number {
  return (p.prixAchat || 0) + (p.travaux || 0) + (p.fraisNotaire || 0);
}

/**
 * Valeur du bien au 31/12 de `year`.
 * - avant acquisition : 0
 * - passé : interpolation coût → valeur actuelle (si coût connu), sinon valeur actuelle constante
 * - présent / futur : valeur actuelle
 */
function propertyValueAtYear(p: PropertyLike, year: number, nowYear: number, startYear: number | null): number {
  if (startYear != null && year < startYear) return 0;
  const current = p.valeurActuelle || 0;
  if (year >= nowYear) return current;

  const start = startYear ?? nowYear;
  const cost = costBasis(p);
  // Pas de coût saisi : on ne invente pas d’historique — plat à la valeur actuelle
  if (cost <= 0) return current;
  if (nowYear <= start) return current;
  const t = (year - start) / (nowYear - start);
  return Math.max(0, cost + (current - cost) * Math.min(1, Math.max(0, t)));
}

/** CRD au 1er décembre de l’année — 0 si le prêt n’a pas encore commencé. */
export function crdAtYearEnd(credit: CreditLike, year: number): number {
  if (!credit) return 0;
  const projection = new Date(year, 11, 1);

  if (credit.debut?.trim()) {
    const debut = parseLocalDate(credit.debut);
    if (!Number.isNaN(debut.getTime()) && projection < debut) return 0;
  }

  if (hasInterestOnlyAmortization(credit) || hasRateBasedAmortization(credit)) {
    if (!credit.debut || !credit.duree || !credit.montantInitial) {
      return credit.capitalRestant || 0;
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
 * Valeur alignée sur la somme des biens (comme le KPI « Valeur de marché »).
 */
export function buildPatrimoineEvolution(
  properties: PropertyLike[],
  scis: SciLike[],
  opts?: {
    asOf?: Date;
    shareRatioFn?: (sciId: string) => number;
  },
): { data: PatrimoinePoint[]; fromYear: number; toYear: number; nowYear: number } {
  const asOf = opts?.asOf ?? new Date();
  const nowYear = asOf.getFullYear();
  const sciById = new Map(scis.map((s) => [s.id, s]));
  const ratioOf = opts?.shareRatioFn ?? (() => 1);

  const startCandidates: number[] = [];
  const endCandidates: number[] = [nowYear];
  for (const sci of scis) {
    const y = yearFromIsoOrCreation(sci.creation);
    if (y != null) startCandidates.push(y);
  }
  for (const p of properties) {
    const y = acquisitionYear(p, sciById);
    if (y != null) startCandidates.push(y);
    if (p.credit) {
      const end = creditEndYear(p.credit);
      if (end != null) endCandidates.push(end);
    }
  }

  const fromYear = startCandidates.length ? Math.min(...startCandidates) : Math.max(2015, nowYear - 8);
  const toYear = Math.max(...endCandidates);

  // Aligné KPI Patrimoine : somme des valeurs de biens (pas valeurEstimee SCI qui peut diverger)
  const liveValeurFromProps = properties.reduce(
    (s, p) => s + (p.valeurActuelle || 0) * ratioOf(p.sciId),
    0,
  );
  const liveValeurFromScis = scis.reduce((s, sci) => s + (sci.valeurEstimee || 0) * ratioOf(sci.id), 0);
  const liveValeur = liveValeurFromProps > 0 ? liveValeurFromProps : liveValeurFromScis;

  const liveDette = properties.reduce(
    (s, p) => s + (p.credit?.capitalRestant ?? 0) * ratioOf(p.sciId),
    0,
  );

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

    if (year === nowYear) {
      // Point courant : mêmes totaux que les KPI
      valeur = liveValeur;
      dette = liveDette;
    } else if (year > nowYear) {
      valeur = liveValeur;
      // dette : projection amortissement (déjà calculée ci-dessus)
    }

    data.push({
      an: String(year),
      valeur: toK(valeur),
      dette: toK(dette),
      net: toK(valeur - dette),
      futur: year > nowYear,
    });
  }

  return { data, fromYear, toYear, nowYear };
}

export function patrimoineRangeLabel(fromYear: number, toYear: number): string {
  if (fromYear === toYear) return `${fromYear} · milliers d'euros`;
  return `${fromYear}–${toYear} · milliers d'euros`;
}

/** Index de départ pour afficher une fenêtre se terminant sur l’année courante. */
export function defaultPatrimoineWindowStart(
  data: PatrimoinePoint[],
  nowYear: number,
  windowSize = PATRIMOINE_WINDOW_YEARS,
): number {
  if (data.length <= windowSize) return 0;
  const nowIdx = data.findIndex((d) => d.an === String(nowYear));
  const maxStart = data.length - windowSize;
  if (nowIdx < 0) return maxStart;
  return Math.max(0, Math.min(maxStart, nowIdx - windowSize + 1));
}
