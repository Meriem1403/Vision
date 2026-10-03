import type { AuthUser } from "./auth";
import type { View } from "@/app/detail";

export type { View };

export interface Associe {
  name: string;
  parts: number;
}

export interface SCI {
  id: string;
  associes: Associe[];
}

export interface Property {
  id: string;
  sciId: string;
  credit?: { banque: string };
}

export function isGerant(user: AuthUser) {
  return user.role === "GERANT";
}

export function isAssocie(user: AuthUser) {
  return user.role === "ASSOCIE";
}

export function isBanque(user: AuthUser) {
  return user.role === "BANQUE";
}

export function canManageData(user: AuthUser) {
  return user.role === "GERANT";
}

export function canManageUsers(user: AuthUser) {
  return user.role === "GERANT";
}

export function normalizePerson(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function entityAccessible(user: AuthUser, sci: SCI) {
  if (isGerant(user)) return true;
  if (isAssocie(user)) {
    const candidates = [user.shareholderName, user.name].filter(Boolean) as string[];
    if (!candidates.length) return false;
    const inShareholders = sci.associes.some((a) =>
      candidates.some((c) => normalizePerson(a.name) === normalizePerson(c)),
    );
    if (!inShareholders) return false;
    const slugs = user.allowedEntitySlugs?.filter(Boolean) ?? [];
    if (slugs.length === 0) return true;
    return slugs.includes(sci.id);
  }
  return false;
}

export function filterScis(user: AuthUser, scis: SCI[]) {
  return scis.filter((s) => entityAccessible(user, s));
}

/** SCI liées aux biens visibles (indispensable pour le rôle banque). */
export function filterScisWithProperties(user: AuthUser, scis: SCI[], properties: Property[]) {
  if (isBanque(user)) {
    const ids = new Set(properties.map((p) => p.sciId));
    return scis.filter((s) => ids.has(s.id));
  }
  return filterScis(user, scis);
}

export function defaultViewForRole(role: AuthUser["role"]): View {
  return role === "BANQUE" ? "portail-banque" : "dashboard";
}

export function filterProperties(user: AuthUser, properties: Property[], scis: SCI[]) {
  if (isGerant(user)) return properties;
  if (isAssocie(user)) {
    const allowed = new Set(filterScis(user, scis).map((s) => s.id));
    return properties.filter((p) => allowed.has(p.sciId));
  }
  if (isBanque(user) && user.bankName) {
    const bank = normalizeBank(user.bankName);
    return properties.filter((p) => p.credit && normalizeBank(p.credit.banque) === bank);
  }
  return [];
}

export function filterPropertiesWithCredit(user: AuthUser, properties: Property[], scis: SCI[]) {
  if (isBanque(user)) {
    const bank = user.bankName ? normalizeBank(user.bankName) : "";
    return properties.filter((p) => p.credit && normalizeBank(p.credit.banque) === bank);
  }
  return filterProperties(user, properties, scis);
}

export function associeShareRatio(sci: SCI, shareholderName: string) {
  const total = sci.associes.reduce((s, a) => s + a.parts, 0);
  const key = normalizePerson(shareholderName);
  const mine = sci.associes.find((a) => normalizePerson(a.name) === key)?.parts ?? 0;
  return total > 0 ? mine / total : 0;
}

export function normalizeBank(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export const NAV_BY_ROLE: Record<AuthUser["role"], View[]> = {
  GERANT: ["dashboard", "sci", "biens", "credits", "location", "comptabilite", "patrimoine", "dossiers", "comptes", "alertes"],
  ASSOCIE: ["dashboard", "sci", "biens", "credits", "patrimoine", "alertes"],
  BANQUE: ["portail-banque", "credits", "alertes"],
};

/** Vues configurables par le gérant pour un rôle donné (hors « comptes »). */
export function configurableViewsForRole(role: AuthUser["role"]): View[] {
  return NAV_BY_ROLE[role].filter((v) => v !== "comptes");
}

export function allowedViews(user: AuthUser): View[] {
  const base = NAV_BY_ROLE[user.role];
  const custom = (user.allowedViews ?? []).filter((v): v is View =>
    base.includes(v as View),
  );
  if (custom.length === 0) return base;
  // Le gérant garde toujours l’accès comptes
  if (user.role === "GERANT" && !custom.includes("comptes")) {
    return [...custom, "comptes"];
  }
  return custom;
}

export function canAccessView(user: AuthUser, view: View) {
  return allowedViews(user).includes(view);
}

export const PAGE_TITLES: Record<View, string> = {
  dashboard: "Tableau de bord",
  sci: "SCI & Entités",
  biens: "Biens immobiliers",
  credits: "Crédits & Emprunts",
  location: "Gestion locative",
  comptabilite: "Comptabilité",
  patrimoine: "Évolution patrimoniale",
  alertes: "Alertes",
  dossiers: "Dossiers bancaires",
  "portail-banque": "Portail banque",
  comptes: "Comptes & accès",
};
