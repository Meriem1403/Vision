/** Formules affichées au survol des indicateurs (KPI). */
export const METRIC_FORMULAS: Record<string, string> = {
  "Patrimoine brut": "Somme des valeurs estimées des SCI d’investissement (hors résidence principale).",
  "Dette restante": "Somme des CRD des crédits d’investissement (hors résidence principale).",
  "Patrimoine net": "Patrimoine brut − Dette restante (investissement uniquement).",
  "Loyers annuels": "Σ (loyer mensuel × 12) des biens d’investissement (hors RP).",

  "Cash-flow / mois":
    "Σ [Loyer − Mensualité crédit − Taxe foncière÷12 − Honoraires gestion] (hors RP). La taxe est annuelle en base, d’où ÷12 pour un flux mensuel.",
  "Cash-flow mensuel":
    "Loyer − Mensualité crédit − Taxe foncière÷12 − Honoraires gestion (si déléguée). Taxe annuelle ÷ 12.",
  "Cash-flow bien":
    "Loyer − Mensualité crédit (hors ass. emprunteur) − Taxe foncière÷12 − Honoraires gestion.",
  "Cash-flow":
    "Σ cash-flow mensuel des biens : Loyer − Crédit − Taxe÷12 − Honoraires.",
  "Cash mensuel total":
    "Cash-flow mensuel agrégé (loyers − crédits − taxe÷12 − honoraires).",
  "Ma part — cash/mois":
    "Σ (cash-flow mensuel SCI × % de parts) — hors RP. Cash-flow = loyer − crédit − taxe÷12 − honoraires.",

  "Rendement brut":
    "(Loyers annuels ÷ Coût de revient) × 100. Coût = prix d’achat + travaux + frais de notaire. Indisponible si coût non saisi. Base annuelle : pas de ÷12.",
  "Rendement net":
    "((Loyers annuels − Taxe foncière annuelle − Assurance PNO annuelle − Honoraires gestion annuels) ÷ Coût de revient) × 100. La taxe foncière n’est PAS divisée par 12 ici (tout est annuel). Hors crédit et impôts.",
  "Ma part — rdt brut":
    "(Ma part loyers/an ÷ Ma part coût de revient) × 100. Coût = achat + travaux + notaire.",
  "Ma part — rdt net":
    "((Ma part loyers/an − taxe − PNO − honoraires, au prorata des parts) ÷ Ma part coût de revient) × 100. Charges en annuel (pas ÷12).",

  "Valeur actuelle": "Estimation de marché saisie pour le bien.",
  "Plus-value": "Valeur actuelle − (Prix d’achat + Travaux + Frais de notaire).",
  "Loyer mensuel": "Loyer hors charges, tel que saisi dans la fiche bien.",
  "Taxe foncière / an": "Montant annuel de taxe foncière saisi pour le bien (utilisé tel quel en rendement ; ÷12 en cash-flow mensuel).",
  "Assurance / an": "Prime annuelle d’assurance du bien (PNO, etc.).",
  "Coût total": "Prix d’achat + Travaux + Frais de notaire (= coût de revient).",
  "Prix d'achat": "Prix d’acquisition hors frais.",
  "Montant emprunté": "Capital initial emprunté à la banque.",
  "Capital restant": "CRD à la date du jour, calculé via le tableau d’amortissement.",
  "Crédit restant": "Somme des CRD de tous les biens de l’entité.",
  "Mensualité crédit": "C × r / (1 − (1+r)^−n) avec r = taux annuel / 12 et n = durée en mois.",
  "Mensualité totale": "Mensualité crédit + Assurance emprunteur mensuelle.",
  "Assurance / mois": "Montant fixe mensuel d’assurance emprunteur (si renseigné).",
  "Intérêts totaux": "Somme des intérêts sur toute la durée du prêt (tableau d’amortissement).",
  Remboursé: "((Montant emprunté − CRD actuel) ÷ Montant emprunté) × 100.",
  "Fin de prêt": "Date de la dernière échéance du tableau d’amortissement.",
  "Taux annuel": "Taux nominal annuel du crédit (hors assurance).",
  "Taux": "Taux nominal annuel du crédit.",
  "Valeur estimée": "Estimation patrimoniale de l’entité (SCI ou RP).",
  "Loyers / mois": "Somme des loyers mensuels des biens rattachés à l’entité.",
  Biens: "Nombre de biens immobiliers rattachés à l’entité.",
  Régime: "Régime fiscal de la structure (IR, IS ou RP).",
  "Plus-value latente":
    "Valeur actuelle − Coût de revient (achat + travaux + notaire). Hors fiscalité et hors dette. Indisponible si le coût n’est pas saisi.",
  "Coût de revient": "Prix d’achat + Travaux + Frais de notaire.",
  "Gain %": "(Plus-value ÷ Coût de revient) × 100. Affiché seulement si le coût de revient est renseigné.",
  "Résultat net consolidé mensuel":
    "Σ (Loyers − Mensualité crédit − Ass. emprunteur − Taxe÷12 − PNO÷12 − Honoraires gestion).",
  "Loyers/mois": "Somme des loyers mensuels des locataires actifs.",
  Actifs: "Nombre de baux en cours ou à renouveler (hors terminés).",
  Impayés: "Nombre de locataires au statut « Impayé ».",
  "Part crédit": "CRD de la SCI × parts de l’associé connecté (ex. 50 % BENEDUC).",
  "Mensualités part": "Mensualités de la SCI × parts de l’associé.",
  "Part valeur": "Valeur estimée de la SCI × parts de l’associé.",
  "Ma part — brut": "Σ (valeur estimée SCI × % de parts) — SCI d’investissement uniquement, hors RP.",
  "Ma part — dette": "Σ (CRD SCI × % de parts) — hors résidence principale.",
  "Ma part — net": "Ma part brut − Ma part dette.",
  "Ma part — loyers/an": "Σ (loyers annuels SCI × % de parts) — hors RP.",
  "Ma part — mensualités": "Σ (mensualités crédit SCI × % de parts) — hors RP.",
  "Valeur": "Estimation de marché actuelle du bien.",
  "Loyer/mois": "Loyer mensuel hors charges.",
  Type: "Typologie et surface du bien (données saisies).",
  Mensualité: "Mensualité crédit calculée (hors assurance emprunteur).",
  "CRD projeté": "Capital restant dû total projeté à la date sélectionnée.",
  "Honoraires / mois": "Loyer × % honoraires, si gestion locative déléguée.",
  "Gestion locative": "Directe, ou déléguée avec un % d’honoraires sur le loyer.",
  Lots: "Nombre de lots du bien.",
  "Capital total": "Somme des CRD des crédits filtrés.",
  "Mensualités/mois": "Somme des mensualités crédit des crédits filtrés.",
};

export function metricFormula(label: string): string | undefined {
  return METRIC_FORMULAS[label];
}
