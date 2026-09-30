export interface LoanInput {
  montantInitial: number;
  tauxAnnuel: number;
  dureeMois: number;
  dateDebut: string;
  assuranceMensuelle?: number;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Ajoute des mois en évitant les dérives JS (ex. 31 jan + 1 mois). */
export function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return d;
}

/**
 * Mensualité hors assurance — précision complète (comme Excel / moteurs bancaires).
 * Formule standard crédit immobilier FR : amortissement constant, taux mensuel = taux annuel / 12.
 */
export function computeMonthlyPaymentExact(capital: number, tauxAnnuel: number, dureeMois: number): number {
  if (capital <= 0 || dureeMois <= 0) return 0;
  if (tauxAnnuel <= 0) return capital / dureeMois;
  const r = tauxAnnuel / 100 / 12;
  return (capital * r) / (1 - Math.pow(1 + r, -dureeMois));
}

/** Mensualité affichée (arrondie au centime, comme sur un échéancier bancaire). */
export function computeMonthlyPayment(capital: number, tauxAnnuel: number, dureeMois: number): number {
  return round2(computeMonthlyPaymentExact(capital, tauxAnnuel, dureeMois));
}

function buildScheduleCore(input: LoanInput) {
  const assurance = input.assuranceMensuelle ?? 0;
  const mensualiteExact = computeMonthlyPaymentExact(input.montantInitial, input.tauxAnnuel, input.dureeMois);
  const mensualiteAffichee = round2(mensualiteExact);
  const tauxMensuel = input.tauxAnnuel / 100 / 12;
  const debut = new Date(input.dateDebut);
  let crd = input.montantInitial;

  const rows: Array<{
    moisIndex: number;
    periode: Date;
    crd: number;
    capitalAmorti: number;
    interets: number;
    assurance: number;
    mensualite: number;
  }> = [];

  for (let i = 0; i < input.dureeMois; i++) {
    const periode = addMonths(debut, i);
    const interets = round2(crd * tauxMensuel);
    let capitalAmorti = round2(mensualiteExact - interets);
    if (i === input.dureeMois - 1) {
      capitalAmorti = round2(crd);
      crd = 0;
    } else {
      crd = round2(Math.max(0, crd - capitalAmorti));
    }
    rows.push({
      moisIndex: i + 1,
      periode,
      crd,
      capitalAmorti,
      interets,
      assurance,
      mensualite: mensualiteAffichee,
    });
  }

  return { rows, mensualiteAffichee, assurance, totalInterets: round2(rows.reduce((s, r) => s + r.interets, 0)) };
}

export function computeLoanSummary(input: LoanInput, projectionDate = new Date()) {
  const { rows, mensualiteAffichee, assurance, totalInterets } = buildScheduleCore(input);
  const target = new Date(projectionDate.getFullYear(), projectionDate.getMonth(), 1);
  const capitalRestant = getCrdAtDateFromRows(rows, input.montantInitial, target);
  const finCredit = rows[rows.length - 1]?.periode ?? new Date(input.dateDebut);
  const pctRembourse = input.montantInitial > 0
    ? round2(((input.montantInitial - capitalRestant) / input.montantInitial) * 100)
    : 0;

  return {
    mensualite: mensualiteAffichee,
    mensualiteTotale: round2(mensualiteAffichee + assurance),
    capitalRestant,
    totalInterets,
    finCredit,
    pctRembourse,
  };
}

export interface AmortizationRow {
  moisIndex: number;
  periode: Date;
  crd: number;
  capitalAmorti: number;
  interets: number;
  assurance: number;
  mensualite: number;
}

export function buildAmortizationSchedule(input: LoanInput): AmortizationRow[] {
  return buildScheduleCore(input).rows;
}

function getCrdAtDateFromRows(
  rows: AmortizationRow[],
  montantInitial: number,
  target: Date,
): number {
  let prev = montantInitial;
  for (const row of rows) {
    const rowDate = new Date(row.periode.getFullYear(), row.periode.getMonth(), 1);
    if (rowDate > target) return prev;
    prev = row.crd;
  }
  return prev;
}

export function getCrdAtDate(input: LoanInput, date: Date): number {
  const target = new Date(date.getFullYear(), date.getMonth(), 1);
  const schedule = buildAmortizationSchedule(input);
  return getCrdAtDateFromRows(schedule, input.montantInitial, target);
}

/** Nombre de mois calendaires entre deux 1ers du mois (peut être négatif). */
export function monthsBetween(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), 1);
  const b = new Date(to.getFullYear(), to.getMonth(), 1);
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

/**
 * Modèle Excel Beneduc / Troika :
 * CRD(mois) = max(0, CRD_réf − mensualité × nombre de mois depuis la date de réf).
 * Vérifié à l’euro près sur « Amort Beneduc » / « Amort Troika ».
 */
export function projectFlatCrd(opts: {
  capitalAtRef: number;
  refDate: Date;
  projectionDate: Date;
  mensualite: number;
}): number {
  const capitalAtRef = Math.max(0, opts.capitalAtRef || 0);
  const mens = Math.max(0, opts.mensualite || 0);
  if (capitalAtRef <= 0) return 0;
  const months = monthsBetween(opts.refDate, opts.projectionDate);
  if (months <= 0) return round2(capitalAtRef);
  return round2(Math.max(0, capitalAtRef - mens * months));
}

/**
 * @deprecated préférer projectFlatCrd (modèle Excel réel).
 * Ancienne extrapolation linéaire jusqu’à la fin de prêt.
 */
export function projectImportedCrd(opts: {
  capitalAtRef: number;
  refDate: Date;
  projectionDate: Date;
  finCredit?: string | Date | null;
  mensualite?: number;
}): number {
  if (opts.mensualite && opts.mensualite > 0) {
    return projectFlatCrd({
      capitalAtRef: opts.capitalAtRef,
      refDate: opts.refDate,
      projectionDate: opts.projectionDate,
      mensualite: opts.mensualite,
    });
  }
  const capitalAtRef = Math.max(0, opts.capitalAtRef || 0);
  if (capitalAtRef <= 0) return 0;

  const proj = new Date(opts.projectionDate.getFullYear(), opts.projectionDate.getMonth(), 1);
  const ref = new Date(opts.refDate.getFullYear(), opts.refDate.getMonth(), 1);

  if (!opts.finCredit) return round2(capitalAtRef);

  const fin = opts.finCredit instanceof Date ? opts.finCredit : new Date(opts.finCredit);
  if (Number.isNaN(fin.getTime())) return round2(capitalAtRef);
  const finMonth = new Date(fin.getFullYear(), fin.getMonth(), 1);

  const leftAtProj = monthsBetween(proj, finMonth);
  if (leftAtProj <= 0) return 0;

  const leftAtRef = monthsBetween(ref, finMonth);
  if (leftAtRef <= 0) return 0;

  return round2(Math.max(0, capitalAtRef * (leftAtProj / leftAtRef)));
}

/** Tableau d’amortissement bancaire classique (intérêts) si taux + durée + début. */
export function hasRateBasedAmortization(credit: {
  montantInitial?: number;
  taux?: number;
  duree?: number;
  debut?: string | null;
}): boolean {
  return Boolean(
    credit.montantInitial &&
      (credit.taux ?? 0) > 0 &&
      credit.duree &&
      credit.debut &&
      String(credit.debut).trim() !== "",
  );
}

/** @deprecated utiliser hasRateBasedAmortization */
export function hasAmortizationInputs(credit: {
  montantInitial?: number;
  taux?: number;
  duree?: number;
  debut?: string | null;
}): boolean {
  return hasRateBasedAmortization(credit) || Boolean(
    credit.montantInitial && credit.duree && credit.debut && String(credit.debut).trim() !== "" && (credit.taux ?? 0) === 0,
  );
}

export function enrichCredit(credit: {
  banque: string;
  montantInitial: number;
  taux: number;
  duree: number;
  debut: string;
  assuranceMensuelle?: number;
  mensualite?: number;
  capitalRestant?: number;
  finCredit?: string | null;
}) {
  // Nouveau prêt / prêt à taux : générer mensualité + CRD depuis les paramètres
  if (hasRateBasedAmortization(credit)) {
    const summary = computeLoanSummary({
      montantInitial: credit.montantInitial,
      tauxAnnuel: credit.taux,
      dureeMois: credit.duree,
      dateDebut: credit.debut,
      assuranceMensuelle: credit.assuranceMensuelle,
    });
    return {
      ...credit,
      mensualite: summary.mensualite,
      capitalRestant: summary.capitalRestant,
      finCredit: credit.finCredit ?? summary.finCredit.toISOString().slice(0, 10),
    };
  }

  // Import Excel (taux 0) : CRD projeté = flat depuis date de début / réf
  if (credit.debut && credit.mensualite && credit.montantInitial) {
    const capitalRestant = projectFlatCrd({
      capitalAtRef: credit.montantInitial,
      refDate: new Date(credit.debut),
      projectionDate: new Date(),
      mensualite: credit.mensualite,
    });
    return {
      ...credit,
      mensualite: credit.mensualite,
      capitalRestant,
      finCredit: credit.finCredit ?? null,
    };
  }

  return {
    ...credit,
    mensualite: credit.mensualite ?? 0,
    capitalRestant: credit.capitalRestant ?? 0,
    finCredit: credit.finCredit ?? null,
  };
}
