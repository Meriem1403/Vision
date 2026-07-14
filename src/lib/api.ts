import { getStoredToken } from "./auth";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getStoredToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Erreur API ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => request<{ status: string; services: { database: boolean; mail: boolean } }>("/api/health"),

  login: (email: string, password: string) =>
    request<{ token: string; user: import("./auth").AuthUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<{ user: import("./auth").AuthUser }>("/api/auth/me"),

  logout: () => request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),

  demoUsers: () =>
    request<Array<{ email: string; name: string; role: string; bankName?: string; shareholderName?: string }>>(
      "/api/auth/demo-users",
    ),

  getEntities: () =>
    request<
      Array<{
        id: string;
        name: string;
        shortName: string;
        type: "IR" | "IS" | "RP";
        creation: string;
        valeurEstimee: number;
        color: string;
        gradient: string;
        associes: { name: string; parts: number }[];
      }>
    >("/api/entities"),

  getEntitySnapshot: (slug: string, month: number, year: number) =>
    request(`/api/entities/${slug}/snapshot?month=${month}&year=${year}`),

  getProperties: () => request<Array<Record<string, unknown>>>("/api/properties"),

  createProperty: (data: Record<string, unknown>) =>
    request("/api/properties", { method: "POST", body: JSON.stringify(data) }),

  updateProperty: (id: string, data: Record<string, unknown>) =>
    request(`/api/properties/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  deleteProperty: (id: string) => request(`/api/properties/${id}`, { method: "DELETE" }),

  previewLoan: (data: Record<string, unknown>) =>
    request("/api/loans/preview", { method: "POST", body: JSON.stringify(data) }),

  getLoans: () => request<Array<Record<string, unknown>>>("/api/loans"),

  previewDossier: (data: Record<string, unknown>) =>
    request("/api/dossiers/preview", { method: "POST", body: JSON.stringify(data) }),

  getDossiers: () => request<Array<Record<string, unknown>>>("/api/dossiers"),

  getDossier: (id: string) => request<Record<string, unknown>>(`/api/dossiers/${id}`),

  createDossier: (data: Record<string, unknown>) =>
    request("/api/dossiers", { method: "POST", body: JSON.stringify(data) }),

  sendDossier: (id: string) => request(`/api/dossiers/${id}/send`, { method: "POST" }),

  deleteDossier: (id: string) => request(`/api/dossiers/${id}`, { method: "DELETE" }),
};

export async function isApiAvailable(): Promise<boolean> {
  try {
    const health = await api.health();
    return health.services.database;
  } catch {
    return false;
  }
}
