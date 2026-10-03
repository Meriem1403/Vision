/** Indicateurs de rendement locatif (base valeur de marché). */

export interface YieldInput {
  loyer: number;
  valeurActuelle: number;
  taxeFonciere?: number;
  assurance?: number;
}

export interface PropertyYield {
  /** (Loyer × 12 ÷ valeur) × 100 */
  brut: number | null;
  /** ((Loyer × 12 − taxe − assurance) ÷ valeur) × 100 */
  net: number | null;
  loyersAnnuels: number;
  chargesAnnuelles: number;
  revenusNetsAnnuels: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function computePropertyYield(input: YieldInput): PropertyYield {
  const loyersAnnuels = (input.loyer || 0) * 12;
  const chargesAnnuelles = (input.taxeFonciere || 0) + (input.assurance || 0);
  const revenusNetsAnnuels = loyersAnnuels - chargesAnnuelles;
  const valeur = input.valeurActuelle || 0;

  if (valeur <= 0) {
    return { brut: null, net: null, loyersAnnuels, chargesAnnuelles, revenusNetsAnnuels };
  }

  return {
    brut: round2((loyersAnnuels / valeur) * 100),
    net: round2((revenusNetsAnnuels / valeur) * 100),
    loyersAnnuels,
    chargesAnnuelles,
    revenusNetsAnnuels,
  };
}

/** Agrégat portefeuille / entité : même formules sur sommes. */
export function computePortfolioYield(opts: {
  loyersAnnuels: number;
  chargesAnnuelles: number;
  patrimoineBrut: number;
}): { brut: number | null; net: number | null } {
  const { loyersAnnuels, chargesAnnuelles, patrimoineBrut } = opts;
  if (patrimoineBrut <= 0) return { brut: null, net: null };
  return {
    brut: round2((loyersAnnuels / patrimoineBrut) * 100),
    net: round2(((loyersAnnuels - chargesAnnuelles) / patrimoineBrut) * 100),
  };
}

export function formatYieldPct(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toFixed(2)} %`;
}
