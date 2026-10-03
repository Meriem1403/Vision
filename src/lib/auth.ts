export type UserRole = "GERANT" | "ASSOCIE" | "BANQUE";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  firstName: string;
  initials: string;
  role: UserRole;
  bankName?: string | null;
  shareholderName?: string | null;
  /** null/undefined = toutes les vues du rôle */
  allowedViews?: string[] | null;
  /** ASSOCIE : null = toutes les SCI où il est actionnaire */
  allowedEntitySlugs?: string[] | null;
}

const USER_KEY = "vision_auth_user";

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function storeUser(user: AuthUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem("vision_auth_token");
}

/** @deprecated prefer storeUser — kept for API token path */
export function storeSession(token: string, user: AuthUser) {
  localStorage.setItem("vision_auth_token", token);
  storeUser(user);
}

export function getStoredToken(): string | null {
  return localStorage.getItem("vision_auth_token");
}

export function roleLabel(role: UserRole): string {
  return { GERANT: "Gérant", ASSOCIE: "Associé", BANQUE: "Banque" }[role];
}

export function greetingLabel(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}
