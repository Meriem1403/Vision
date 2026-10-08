/** Honoraires / cash-flow liés à la gestion locative. */

export type PropertyFinanceInput = {
  loyer: number;
  taxeFonciere: number;
  /** Assurance PNO / habitation annuelle du bien */
  assurance?: number;
  gestionDeleguee?: boolean;
  honorairesGestionPct?: number;
  credit?: { mensualite?: number; assuranceMensuelle?: number } | null;
};

/** Honoraires mensuels du cabinet si gestion déléguée, sinon 0. */
export function honorairesGestionMensuel(p: PropertyFinanceInput): number {
  if (!p.gestionDeleguee) return 0;
  const pct = Number(p.honorairesGestionPct) || 0;
  if (pct <= 0 || !p.loyer) return 0;
  return (p.loyer * pct) / 100;
}

/**
 * Cash-flow mensuel (formule métier) :
 * Loyer − échéance crédit (mensualité + ass. emprunteur)
 *      − taxe foncière÷12 − assurance PNO÷12 − honoraires gestion.
 * Le 2ᵉ argument est ignoré (conservé pour les anciens appels).
 */
export function cashFlowMensuel(p: PropertyFinanceInput, _includeAssurance = true): number {
  const mensCredit = p.credit?.mensualite ?? 0;
  const assEmprunteur = p.credit?.assuranceMensuelle ?? 0;
  const taxeMois = (p.taxeFonciere || 0) / 12;
  const pnoMois = (p.assurance || 0) / 12;
  const honoraires = honorairesGestionMensuel(p);
  return Math.round((p.loyer || 0) - mensCredit - assEmprunteur - taxeMois - pnoMois - honoraires);
}

/**
 * Détail mensuel pour l’onglet Comptabilité — même formule que cashFlowMensuel.
 */
export function comptaMensuel(p: PropertyFinanceInput) {
  const loyers = p.loyer || 0;
  const mensCredit = p.credit?.mensualite ?? 0;
  const assEmprunteur = p.credit?.assuranceMensuelle ?? 0;
  const credits = mensCredit + assEmprunteur;
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

/** Plus-value latente patrimoniale (hors fiscalité, hors dette). */
export function plusValueLatente(p: {
  prixAchat?: number;
  travaux?: number;
  fraisNotaire?: number;
  valeurActuelle?: number;
}) {
  const coutRevient = (p.prixAchat || 0) + (p.travaux || 0) + (p.fraisNotaire || 0);
  const valeur = p.valeurActuelle || 0;
  const plusValue = valeur - coutRevient;
  return {
    coutRevient,
    valeur,
    plusValue,
    /** null si pas de coût de revient saisi (évite un faux 0 %). */
    gainPct: coutRevient > 0 ? (plusValue / coutRevient) * 100 : null,
  };
}
