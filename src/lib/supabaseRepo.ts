import type { AuthUser, UserRole } from "./auth";
import { isSupabaseConfigured, supabase } from "./supabase";

function requireClient() {
  if (!supabase) throw new Error("Supabase non configuré");
  return supabase;
}

export async function supabaseLogin(email: string, password: string): Promise<AuthUser> {
  const client = requireClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw mapAuthError(error.message);
  const profile = await fetchProfile(data.user!.id);
  return profile;
}

export async function supabaseLogout() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function supabaseRequestPasswordReset(email: string) {
  const client = requireClient();
  const redirectTo = `${window.location.origin}/`;
  const { error } = await client.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo });
  if (error) throw mapAuthError(error.message);
}

export async function supabaseUpdatePassword(password: string) {
  const client = requireClient();
  const { error } = await client.auth.updateUser({ password });
  if (error) throw mapAuthError(error.message);
}

export async function supabaseGetSessionUser(): Promise<AuthUser | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) return null;
  try {
    return await fetchProfile(data.session.user.id);
  } catch {
    return null;
  }
}

function mapAuthError(message: string): Error {
  const msg = message.toLowerCase();
  if (msg.includes("invalid login credentials") || msg.includes("invalid_credentials")) {
    return new Error("Email ou mot de passe incorrect.");
  }
  if (msg.includes("email not confirmed")) {
    return new Error("Confirmez votre email via le lien reçu avant de vous connecter.");
  }
  if (msg.includes("user not found")) {
    return new Error("Aucun compte associé à cet email.");
  }
  if (msg.includes("rate limit") || msg.includes("too many")) {
    return new Error("Trop de tentatives. Réessayez dans quelques minutes.");
  }
  return new Error(message || "Connexion impossible.");
}

async function fetchProfile(userId: string): Promise<AuthUser> {
  const client = requireClient();
  const { data, error } = await client.from("profiles").select("*").eq("id", userId).single();
  if (error || !data) throw new Error(error?.message ?? "Profil introuvable");
  return {
    id: data.id,
    email: data.email,
    name: data.name,
    firstName: data.first_name,
    initials: data.initials,
    role: data.role as UserRole,
    bankName: data.bank_name,
    shareholderName: data.shareholder_name,
  };
}

export interface SciRow {
  id: string;
  name: string;
  shortName: string;
  type: "IR" | "IS" | "RP";
  creation: string;
  valeurEstimee: number;
  color: string;
  gradient: string;
  associes: { name: string; parts: number }[];
}

export interface PropertyRow {
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
  credit?: {
    banque: string;
    montantInitial: number;
    taux: number;
    duree: number;
    debut: string;
    assuranceMensuelle?: number;
    mensualite: number;
    capitalRestant: number;
  };
}

export interface TenantRow {
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

export interface AlertRow {
  id: string;
  type: "bail" | "credit" | "taxe" | "assurance" | "info";
  title: string;
  detail: string;
  severity: "high" | "medium" | "low";
}

export async function fetchPortfolio(): Promise<{
  scis: SciRow[];
  properties: PropertyRow[];
  tenants: TenantRow[];
  alerts: AlertRow[];
}> {
  const client = requireClient();

  const [entitiesRes, propsRes, tenantsRes, alertsRes] = await Promise.all([
    client.from("legal_entities").select("*, shareholders(*)").order("name"),
    client.from("properties").select("*, legal_entities(slug), loans(*)").order("address"),
    client.from("tenants").select("*"),
    client.from("alerts").select("*").order("created_at", { ascending: false }),
  ]);

  if (entitiesRes.error) throw new Error(entitiesRes.error.message);
  if (propsRes.error) throw new Error(propsRes.error.message);

  const scis: SciRow[] = (entitiesRes.data ?? []).map((e) => ({
    id: e.slug,
    name: e.name,
    shortName: e.short_name,
    type: e.type,
    creation: e.creation ?? "",
    valeurEstimee: Number(e.valeur_estimee),
    color: e.color,
    gradient: e.gradient ?? "",
    associes: (e.shareholders ?? []).map((s: { name: string; parts: number }) => ({
      name: s.name,
      parts: Number(s.parts),
    })),
  }));

  const properties: PropertyRow[] = (propsRes.data ?? []).map((p) => {
    const loan = Array.isArray(p.loans) ? p.loans[0] : p.loans;
    return {
      id: p.id,
      sciId: p.legal_entities?.slug ?? "",
      address: p.address,
      ville: p.ville,
      cp: p.cp,
      type: p.type,
      surface: Number(p.surface),
      lots: Number(p.lots),
      prixAchat: Number(p.prix_achat),
      travaux: Number(p.travaux),
      fraisNotaire: Number(p.frais_notaire),
      valeurActuelle: Number(p.valeur_actuelle),
      loyer: Number(p.loyer),
      taxeFonciere: Number(p.taxe_fonciere),
      assurance: Number(p.assurance),
      credit: loan
        ? {
            banque: loan.banque,
            montantInitial: Number(loan.montant_initial),
            taux: Number(loan.taux_annuel),
            duree: Number(loan.duree_mois),
            debut: loan.date_debut ?? "",
            assuranceMensuelle: Number(loan.assurance_mensuelle),
            mensualite: Number(loan.mensualite),
            capitalRestant: Number(loan.capital_restant),
          }
        : undefined,
    };
  });

  const tenants: TenantRow[] = (tenantsRes.data ?? []).map((t) => ({
    id: t.id,
    propertyId: t.property_id,
    nom: t.nom,
    initiales: t.initiales,
    tel: t.tel ?? "",
    email: t.email ?? "",
    debutBail: t.debut_bail,
    finBail: t.fin_bail,
    debutTs: Number(t.debut_ts),
    finTs: Number(t.fin_ts),
    loyer: Number(t.loyer),
    charges: Number(t.charges),
    statut: t.statut,
  }));

  const alerts: AlertRow[] = (alertsRes.data ?? []).map((a) => ({
    id: a.id,
    type: a.type,
    title: a.title,
    detail: a.detail,
    severity: a.severity,
  }));

  return { scis, properties, tenants, alerts };
}

export async function fetchDossiers() {
  const client = requireClient();
  const { data, error } = await client
    .from("bank_dossiers")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchDossier(id: string) {
  const client = requireClient();
  const { data, error } = await client.from("bank_dossiers").select("*").eq("id", id).single();
  if (error) throw new Error(error.message);

  if (data.status === "SENT") {
    await client
      .from("bank_dossiers")
      .update({ status: "VIEWED", viewed_at: new Date().toISOString() })
      .eq("id", id);
  }
  return data;
}

export async function createDossier(input: {
  title: string;
  targetBank: string;
  message?: string;
  montantDemande?: number;
  objet?: string;
  entitySlugs?: string[];
  includePatrimoine?: boolean;
  includeEndettement?: boolean;
  includeCashFlow?: boolean;
  anonymizeTenants?: boolean;
  payload: Record<string, unknown>;
  sendNow?: boolean;
  createdBy: string;
}) {
  const client = requireClient();
  const ref = `VIS-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const expires = new Date();
  expires.setDate(expires.getDate() + 30);

  const { data, error } = await client
    .from("bank_dossiers")
    .insert({
      reference: ref,
      title: input.title,
      target_bank: input.targetBank,
      message: input.message ?? null,
      montant_demande: input.montantDemande ?? null,
      objet: input.objet ?? null,
      entity_slugs: input.entitySlugs ?? [],
      include_patrimoine: input.includePatrimoine ?? true,
      include_endettement: input.includeEndettement ?? true,
      include_cash_flow: input.includeCashFlow ?? true,
      anonymize_tenants: input.anonymizeTenants ?? true,
      payload: input.payload,
      created_by: input.createdBy,
      expires_at: expires.toISOString(),
      status: input.sendNow ? "SENT" : "DRAFT",
      sent_at: input.sendNow ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function sendDossier(id: string) {
  const client = requireClient();
  const { data, error } = await client
    .from("bank_dossiers")
    .update({ status: "SENT", sent_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteDossier(id: string) {
  const client = requireClient();
  const { error } = await client.from("bank_dossiers").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export { isSupabaseConfigured };
