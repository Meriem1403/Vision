/** Honoraires / cash-flow liés à la gestion locative. */

export type PropertyFinanceInput = {
  loyer: number;
  taxeFonciere: number;
  assurance?: number;
  gestionDeleguee?: boolean;
  honorairesGestionPct?: number;
  credit?: { mensualite?: number } | null;
};

/** Honoraires mensuels du cabinet si gestion déléguée, sinon 0. */
export function honorairesGestionMensuel(p: PropertyFinanceInput): number {
  if (!p.gestionDeleguee) return 0;
  const pct = Number(p.honorairesGestionPct) || 0;
  if (pct <= 0 || !p.loyer) return 0;
  return (p.loyer * pct) / 100;
}

/**
 * Cash-flow mensuel.
 * @param includeAssurance si true, déduit assurance annuelle / 12 (défaut false pour rester aligné Excel).
 */
export function cashFlowMensuel(p: PropertyFinanceInput, includeAssurance = false): number {
  const mensCredit = p.credit?.mensualite ?? 0;
  const taxeMois = (p.taxeFonciere || 0) / 12;
  const assMois = includeAssurance ? (p.assurance || 0) / 12 : 0;
  return Math.round(p.loyer - mensCredit - taxeMois - assMois - honorairesGestionMensuel(p));
}
