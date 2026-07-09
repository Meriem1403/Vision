export interface Associe { name: string; parts: number }

export interface Credit {
  banque: string;
  montantInitial: number;
  taux: number;
  duree: number;
  debut: string;
  assuranceMensuelle?: number;
  mensualite: number;
  capitalRestant: number;
}

export interface Property {
  id: string;
  sciId: string;
  address: string;
  ville: string;
  cp: string;
  type: string;
  surface: number;
  lots: number;
  prixAchat: number;
  travaux: number;
  fraisNotaire: number;
  valeurActuelle: number;
  loyer: number;
  taxeFonciere: number;
  assurance: number;
  credit?: Credit;
}

export interface SCI {
  id: string;
  name: string;
  shortName: string;
  type: "IR" | "IS" | "RP";
  creation: string;
  valeurEstimee: number;
  associes: Associe[];
  color: string;
  gradient: string;
}

export interface Tenant {
  id: string;
  propertyId: string;
  nom: string;
  initiales: string;
  tel: string;
  email: string;
  debutBail: string;
  finBail: string;
  debutTs: number;
  finTs: number;
  loyer: number;
  charges: number;
  statut: "En cours" | "Impayé" | "Terminé";
}

export interface AlertItem {
  id: string;
  type: "bail" | "credit" | "taxe" | "assurance" | "info";
  title: string;
  detail: string;
  severity: "high" | "medium" | "low";
}
