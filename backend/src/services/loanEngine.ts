export interface LoanInput {
  montantInitial: number;
  tauxAnnuel: number;
  dureeMois: number;
  dateDebut: Date;
  assuranceMensuelle?: number;
}

export interface AmortizationRow {
  moisIndex: number;
  periode: Date;
  crd: number;
  capitalAmorti: number;
  interets: number;
  assurance: number;
  mensualite: number;
  mensualiteTotale: number;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return d;
}

export function computeMonthlyPaymentExact(capital: number, tauxAnnuel: number, dureeMois: number): number {
  if (capital <= 0 || dureeMois <= 0) return 0;
  if (tauxAnnuel <= 0) return capital / dureeMois;
  const r = tauxAnnuel / 100 / 12;
  return (capital * r) / (1 - Math.pow(1 + r, -dureeMois));
}

/** Mensualité hors assurance (formule amortissement constant — standard banques FR) */
export function computeMonthlyPayment(capital: number, tauxAnnuel: number, dureeMois: number): number {
  return round2(computeMonthlyPaymentExact(capital, tauxAnnuel, dureeMois));
}

export function buildAmortizationSchedule(input: LoanInput): AmortizationRow[] {
  const assurance = input.assuranceMensuelle ?? 0;
  const mensualiteExact = computeMonthlyPaymentExact(input.montantInitial, input.tauxAnnuel, input.dureeMois);
  const mensualiteAffichee = round2(mensualiteExact);
  const tauxMensuel = input.tauxAnnuel / 100 / 12;
  const rows: AmortizationRow[] = [];
  let crd = input.montantInitial;

  for (let i = 0; i < input.dureeMois; i++) {
    const periode = addMonths(input.dateDebut, i);
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
      mensualiteTotale: round2(mensualiteAffichee + assurance),
    });
  }

  return rows;
}

export function getRemainingCapitalFromInput(input: LoanInput, date: Date = new Date()): number {
  const schedule = buildAmortizationSchedule(input);
  const target = new Date(date.getFullYear(), date.getMonth(), 1);

  let prev = input.montantInitial;
  for (const row of schedule) {
    const rowDate = new Date(row.periode.getFullYear(), row.periode.getMonth(), 1);
    if (rowDate > target) return round2(prev);
    prev = row.crd;
  }
  return round2(prev);
}

export function computeLoanSummary(input: LoanInput, projectionDate: Date = new Date()) {
  const schedule = buildAmortizationSchedule(input);
  const mensualite = schedule[0]?.mensualite ?? 0;
  const assurance = input.assuranceMensuelle ?? 0;
  const capitalRestant = getRemainingCapitalFromInput(input, projectionDate);
  const totalInterets = round2(schedule.reduce((s, r) => s + r.interets, 0));
  const finCredit = schedule[schedule.length - 1]?.periode ?? input.dateDebut;
  const pctRembourse = input.montantInitial > 0
    ? round2(((input.montantInitial - capitalRestant) / input.montantInitial) * 100)
    : 0;

  return {
    mensualite,
    mensualiteTotale: round2(mensualite + assurance),
    capitalRestant,
    totalInterets,
    finCredit,
    pctRembourse,
    schedule,
  };
}
