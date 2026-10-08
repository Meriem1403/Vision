/** Indicateurs de rendement locatif (base coût de revient). */

import { honorairesGestionMensuel } from "@/lib/propertyFinance";

export interface YieldInput {
  loyer: number;
  prixAchat?: number;
  travaux?: number;
  fraisNotaire?: number;
  taxeFonciere?: number;
  assurance?: number;
  gestionDeleguee?: boolean;
  honorairesGestionPct?: number;
}

export interface PropertyYield {
  /** (Loyers annuels ÷ coût de revient) × 100 */
  brut: number | null;
  /** ((Loyers annuels − taxe annuelle − PNO annuelle − honoraires annuels) ÷ coût) × 100 — pas de ÷12 */
  net: number | null;
  coutRevient: number;
  loyersAnnuels: number;
  chargesAnnuelles: number;
  revenusNetsAnnuels: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function coutRevientOf(p: {
  prixAchat?: number;
  travaux?: number;
  fraisNotaire?: number;
}): number {
  return (p.prixAchat || 0) + (p.travaux || 0) + (p.fraisNotaire || 0);
}

export function computePropertyYield(input: YieldInput): PropertyYield {
  const loyersAnnuels = (input.loyer || 0) * 12;
  const honorairesAnnuels = honorairesGestionMensuel(input) * 12;
  const chargesAnnuelles = (input.taxeFonciere || 0) + (input.assurance || 0) + honorairesAnnuels;
  const revenusNetsAnnuels = loyersAnnuels - chargesAnnuelles;
  const coutRevient = coutRevientOf(input);

  if (coutRevient <= 0) {
    return { brut: null, net: null, coutRevient, loyersAnnuels, chargesAnnuelles, revenusNetsAnnuels };
  }

  return {
    brut: round2((loyersAnnuels / coutRevient) * 100),
    net: round2((revenusNetsAnnuels / coutRevient) * 100),
    coutRevient,
    loyersAnnuels,
    chargesAnnuelles,
    revenusNetsAnnuels,
  };
}

/** Agrégat portefeuille / entité : mêmes formules sur sommes. */
export function computePortfolioYield(opts: {
  loyersAnnuels: number;
  chargesAnnuelles: number;
  /** Σ (prix d’achat + travaux + frais de notaire) */
  coutRevient: number;
}): { brut: number | null; net: number | null } {
  const { loyersAnnuels, chargesAnnuelles, coutRevient } = opts;
  if (coutRevient <= 0) return { brut: null, net: null };
  return {
    brut: round2((loyersAnnuels / coutRevient) * 100),
    net: round2(((loyersAnnuels - chargesAnnuelles) / coutRevient) * 100),
  };
}

export function formatYieldPct(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toFixed(2)} %`;
}
