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
}

const TOKEN_KEY = "vision_auth_token";
const USER_KEY = "vision_auth_user";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function storeSession(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
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
