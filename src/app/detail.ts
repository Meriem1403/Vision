export type View = "dashboard" | "sci" | "biens" | "credits" | "location" | "comptabilite" | "patrimoine" | "alertes";

export type DetailTarget =
  | { kind: "property"; id: string; section?: "property" | "credit" }
  | { kind: "sci"; id: string }
  | { kind: "tenant"; id: string }
  | { kind: "alert"; id: string }
  | { kind: "compta"; sciId: string };

export const FULL_PAGE_BACK: Record<View, string> = {
  dashboard: "Retour au dashboard",
  sci: "Retour aux SCI",
  biens: "Retour aux biens",
  credits: "Retour aux crédits",
  location: "Retour aux locataires",
  comptabilite: "Retour à la comptabilité",
  patrimoine: "Retour au patrimoine",
  alertes: "Retour aux alertes",
};
