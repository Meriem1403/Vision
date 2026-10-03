import type { AuthUser, UserRole } from "./auth";
import { syncTenantBailTs } from "./bailDates";
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

function mapProfileRow(data: Record<string, unknown>): AuthUser {
  return {
    id: String(data.id),
    email: String(data.email),
    name: String(data.name),
    firstName: String(data.first_name),
    initials: String(data.initials),
    role: data.role as UserRole,
    bankName: (data.bank_name as string | null) ?? null,
    shareholderName: (data.shareholder_name as string | null) ?? null,
    allowedViews: (data.allowed_views as string[] | null) ?? null,
    allowedEntitySlugs: (data.allowed_entity_slugs as string[] | null) ?? null,
  };
}

async function fetchProfile(userId: string): Promise<AuthUser> {
  const client = requireClient();
  const { data, error } = await client.from("profiles").select("*").eq("id", userId).single();
  if (error || !data) throw new Error(error?.message ?? "Profil introuvable");
  return mapProfileRow(data as Record<string, unknown>);
}

export async function fetchAllProfiles(): Promise<AuthUser[]> {
  const client = requireClient();
  const { data, error } = await client
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapProfileRow(row as Record<string, unknown>));
}

export type ManageUserPayload = {
  action: "create" | "update" | "delete";
  userId?: string;
  email?: string;
  password?: string;
  name?: string;
  firstName?: string;
  role?: "ASSOCIE" | "BANQUE";
  bankName?: string | null;
  shareholderName?: string | null;
  allowedViews?: string[] | null;
  allowedEntitySlugs?: string[] | null;
};

export async function manageUser(payload: ManageUserPayload): Promise<{ ok: boolean; userId?: string; email?: string }> {
  const client = requireClient();
  const { data, error } = await client.functions.invoke("manage-user", { body: payload });

  const readErr = async (): Promise<string | null> => {
    const ctx = (error as { context?: Response; message?: string } | null)?.context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const body = (await ctx.clone().json()) as { error?: string };
        if (body?.error) return body.error;
      } catch {
        /* ignore */
      }
    }
    if (data && typeof data === "object" && "error" in data) {
      return String((data as { error: string }).error);
    }
    return error?.message ?? null;
  };

  if (error) {
    throw new Error((await readErr()) || "Action compte impossible. Vérifiez que la fonction manage-user est déployée.");
  }
  if (data && typeof data === "object" && "error" in data && (data as { error?: string }).error) {
    throw new Error(String((data as { error: string }).error));
  }
  return data as { ok: boolean; userId?: string; email?: string };
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
    finCredit?: string | null;
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
            finCredit: loan.fin_credit ?? null,
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

function slugify(value: string) {
  const s = value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || crypto.randomUUID();
}

async function entityIdBySlug(slug: string): Promise<string> {
  const client = requireClient();
  const { data, error } = await client.from("legal_entities").select("id").eq("slug", slug).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.id) throw new Error(`Entité introuvable (${slug})`);
  return data.id as string;
}

function isUuid(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

/** Persiste une SCI (+ associés). `sci.id` = slug côté app. */
export async function upsertSci(sci: SciRow): Promise<SciRow> {
  const client = requireClient();
  const slug = sci.id?.startsWith("id_") || !sci.id ? slugify(sci.shortName || sci.name) : sci.id;

  const { data: existing, error: findErr } = await client
    .from("legal_entities")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (findErr) throw new Error(findErr.message);

  const row = {
    slug,
    name: sci.name,
    short_name: sci.shortName,
    type: sci.type,
    creation: sci.creation || null,
    valeur_estimee: sci.valeurEstimee,
    color: sci.color,
    gradient: sci.gradient || null,
    updated_at: new Date().toISOString(),
  };

  let entityId = existing?.id as string | undefined;
  if (entityId) {
    const { error } = await client.from("legal_entities").update(row).eq("id", entityId);
    if (error) throw new Error(error.message);
    const { error: delSh } = await client.from("shareholders").delete().eq("entity_id", entityId);
    if (delSh) throw new Error(delSh.message);
  } else {
    const { data, error } = await client.from("legal_entities").insert(row).select("id").single();
    if (error || !data) throw new Error(error?.message ?? "Création SCI impossible");
    entityId = data.id as string;
  }

  if (sci.associes.length) {
    const { error } = await client.from("shareholders").insert(
      sci.associes.map((a) => ({
        entity_id: entityId,
        name: a.name,
        parts: a.parts,
      })),
    );
    if (error) throw new Error(error.message);
  }

  return { ...sci, id: slug };
}

export async function deleteSci(slug: string) {
  const client = requireClient();
  const entityId = await entityIdBySlug(slug);
  const { error } = await client.from("legal_entities").delete().eq("id", entityId);
  if (error) throw new Error(error.message);
}

/** Persiste un bien + crédit éventuel. Retourne l’id UUID Postgres. */
export async function upsertProperty(property: PropertyRow): Promise<PropertyRow> {
  const client = requireClient();
  const entityId = await entityIdBySlug(property.sciId);

  const row = {
    entity_id: entityId,
    address: property.address,
    ville: property.ville,
    cp: property.cp,
    type: property.type,
    surface: property.surface,
    lots: property.lots,
    prix_achat: property.prixAchat,
    travaux: property.travaux,
    frais_notaire: property.fraisNotaire,
    valeur_actuelle: property.valeurActuelle,
    loyer: property.loyer,
    taxe_fonciere: property.taxeFonciere,
    assurance: property.assurance,
    updated_at: new Date().toISOString(),
  };

  let propertyId = property.id;
  const canReuseId = isUuid(property.id);

  if (canReuseId) {
    const { data: existing } = await client.from("properties").select("id").eq("id", property.id).maybeSingle();
    if (existing) {
      const { error } = await client.from("properties").update(row).eq("id", property.id);
      if (error) throw new Error(error.message);
    } else {
      const { data, error } = await client.from("properties").insert({ id: property.id, ...row }).select("id").single();
      if (error || !data) throw new Error(error?.message ?? "Création bien impossible");
      propertyId = data.id as string;
    }
  } else {
    const { data, error } = await client.from("properties").insert(row).select("id").single();
    if (error || !data) throw new Error(error?.message ?? "Création bien impossible");
    propertyId = data.id as string;
  }

  if (property.credit) {
    const loanRow = {
      property_id: propertyId,
      banque: property.credit.banque || "À préciser",
      montant_initial: property.credit.montantInitial,
      taux_annuel: property.credit.taux,
      duree_mois: property.credit.duree,
      date_debut: property.credit.debut || null,
      assurance_mensuelle: property.credit.assuranceMensuelle ?? 0,
      mensualite: property.credit.mensualite,
      capital_restant: property.credit.capitalRestant,
      fin_credit: property.credit.finCredit || null,
      amortization_model: property.credit.taux > 0 ? "RATE_BASED" : "EXCEL_FLAT",
      updated_at: new Date().toISOString(),
    };
    const { data: existingLoan } = await client
      .from("loans")
      .select("id")
      .eq("property_id", propertyId)
      .maybeSingle();
    if (existingLoan) {
      const { error } = await client.from("loans").update(loanRow).eq("property_id", propertyId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await client.from("loans").insert(loanRow);
      if (error) throw new Error(error.message);
    }
  } else {
    const { error } = await client.from("loans").delete().eq("property_id", propertyId);
    if (error) throw new Error(error.message);
  }

  return { ...property, id: propertyId };
}

export async function deleteProperty(id: string) {
  const client = requireClient();
  const { error } = await client.from("properties").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function upsertTenant(tenant: TenantRow): Promise<TenantRow> {
  const client = requireClient();
  const synced = syncTenantBailTs(tenant);
  const row = {
    property_id: synced.propertyId,
    nom: synced.nom,
    initiales: synced.initiales,
    tel: synced.tel || null,
    email: synced.email || null,
    debut_bail: synced.debutBail,
    fin_bail: synced.finBail,
    debut_ts: synced.debutTs,
    fin_ts: synced.finTs,
    loyer: synced.loyer,
    charges: synced.charges,
    statut: synced.statut,
  };

  if (isUuid(tenant.id)) {
    const { data: existing } = await client.from("tenants").select("id").eq("id", tenant.id).maybeSingle();
    if (existing) {
      const { error } = await client.from("tenants").update(row).eq("id", tenant.id);
      if (error) throw new Error(error.message);
      return synced;
    }
    const { data, error } = await client.from("tenants").insert({ id: tenant.id, ...row }).select("id").single();
    if (error || !data) throw new Error(error?.message ?? "Création locataire impossible");
    return { ...synced, id: data.id as string };
  }

  const { data, error } = await client.from("tenants").insert(row).select("id").single();
  if (error || !data) throw new Error(error?.message ?? "Création locataire impossible");
  return { ...synced, id: data.id as string };
}

export async function deleteTenant(id: string) {
  const client = requireClient();
  const { error } = await client.from("tenants").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteAlert(id: string) {
  const client = requireClient();
  const { error } = await client.from("alerts").delete().eq("id", id);
  if (error) throw new Error(error.message);
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

  const title = input.title.trim();
  const targetBank = input.targetBank.trim();
  if (!title) throw new Error("Indiquez un titre de dossier.");
  if (!targetBank) throw new Error("Choisissez une banque destinataire.");

  const { data, error } = await client
    .from("bank_dossiers")
    .insert({
      reference: ref,
      title,
      target_bank: targetBank,
      message: input.message?.trim() || null,
      montant_demande: input.montantDemande != null && input.montantDemande > 0 ? input.montantDemande : null,
      objet: input.objet?.trim() || null,
      entity_slugs: input.entitySlugs ?? [],
      include_patrimoine: input.includePatrimoine ?? true,
      include_endettement: input.includeEndettement ?? true,
      include_cash_flow: input.includeCashFlow ?? true,
      anonymize_tenants: input.anonymizeTenants ?? true,
      payload: input.payload,
      // Évite l’échec FK si l’id local n’est pas un UUID profil
      created_by: isUuid(input.createdBy) ? input.createdBy : null,
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
