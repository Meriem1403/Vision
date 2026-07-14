import { AuthUser } from "./auth.js";

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

export function canCreateDossier(user: AuthUser) {
  return user.role === "GERANT";
}

export function entityAccessible(user: AuthUser, shareholders: { name: string }[]) {
  if (isGerant(user)) return true;
  if (isAssocie(user) && user.shareholderName) {
    return shareholders.some((s) => s.name === user.shareholderName);
  }
  return false;
}

export function loanAccessible(user: AuthUser, banque: string) {
  if (isGerant(user)) return true;
  if (isBanque(user) && user.bankName) {
    return normalizeBank(banque) === normalizeBank(user.bankName);
  }
  return false;
}

export function normalizeBank(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function associeShareRatio(shareholders: { name: string; parts: number }[], shareholderName: string) {
  const total = shareholders.reduce((s, sh) => s + sh.parts, 0);
  const mine = shareholders.find((s) => s.name === shareholderName)?.parts ?? 0;
  return total > 0 ? mine / total : 0;
}

export const ROLE_LABELS: Record<string, string> = {
  GERANT: "Gérant",
  ASSOCIE: "Associé",
  BANQUE: "Banque",
};
