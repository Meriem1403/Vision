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

/**
 * Détail mensuel pour l’onglet Comptabilité :
 * loyers − crédits − taxe/12 − assurance/12 − honoraires gestion.
 */
export function comptaMensuel(p: PropertyFinanceInput) {
  const loyers = p.loyer || 0;
  const credits = p.credit?.mensualite ?? 0;
  const taxes = (p.taxeFonciere || 0) / 12;
  const assurances = (p.assurance || 0) / 12;
  const honoraires = honorairesGestionMensuel(p);
  const charges = credits + taxes + assurances + honoraires;
  return {
    loyers,
    credits,
    taxes,
    assurances,
    honoraires,
    charges,
    result: Math.round(loyers - charges),
  };
}
