/**
 * Edge Function — création / mise à jour / suppression de comptes (GERANT only).
 *
 * Secrets requis : SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 * Déploiement : supabase functions deploy manage-user --no-verify-jwt
 * (le JWT est vérifié dans la fonction pour contrôler le rôle GERANT)
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Role = "ASSOCIE" | "BANQUE";

interface Body {
  action: "create" | "update" | "delete";
  userId?: string;
  email?: string;
  password?: string;
  name?: string;
  firstName?: string;
  role?: Role;
  bankName?: string | null;
  shareholderName?: string | null;
  allowedViews?: string[] | null;
  allowedEntitySlugs?: string[] | null;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function initialsOf(name: string, firstName: string) {
  const a = (firstName || name).trim().split(/\s+/)[0] ?? "U";
  const b = name.trim().split(/\s+/).slice(-1)[0] ?? a;
  return (a[0] + (b[0] ?? "")).toUpperCase().slice(0, 2);
}

function emptyToNull(arr?: string[] | null) {
  if (arr == null) return null;
  const clean = arr.map((s) => s.trim()).filter(Boolean);
  return clean.length ? clean : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!url || !anon || !service) return json({ error: "Config serveur incomplète" }, 500);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Authentification requise" }, 401);

    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: authData, error: authErr } = await userClient.auth.getUser();
    if (authErr || !authData.user) return json({ error: "Session invalide" }, 401);

    const { data: caller, error: profileErr } = await userClient
      .from("profiles")
      .select("role")
      .eq("id", authData.user.id)
      .single();
    if (profileErr || caller?.role !== "GERANT") {
      return json({ error: "Réservé au gérant" }, 403);
    }

    const admin = createClient(url, service);
    const body = (await req.json()) as Body;

    if (body.action === "create") {
      const email = body.email?.trim().toLowerCase();
      const password = body.password ?? "";
      const name = body.name?.trim() || "";
      const firstName = body.firstName?.trim() || name.split(/\s+/)[0] || "User";
      const role = body.role;
      if (!email || !password || password.length < 8 || !name || !role) {
        return json({ error: "Email, mot de passe (≥8), nom et rôle requis" }, 400);
      }
      if (role === "BANQUE" && !body.bankName?.trim()) {
        return json({ error: "Indiquez la banque du compte" }, 400);
      }
      if (role === "ASSOCIE" && !body.shareholderName?.trim()) {
        return json({ error: "Indiquez l’associé (quote-part) lié au compte" }, 400);
      }

      const allowedViews = emptyToNull(body.allowedViews);
      const allowedEntitySlugs = role === "ASSOCIE" ? emptyToNull(body.allowedEntitySlugs) : null;

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name,
          first_name: firstName,
          initials: initialsOf(name, firstName),
          role,
          bank_name: role === "BANQUE" ? body.bankName!.trim() : "",
          shareholder_name: role === "ASSOCIE" ? body.shareholderName!.trim() : "",
          allowed_views: allowedViews ?? [],
          allowed_entity_slugs: allowedEntitySlugs ?? [],
        },
      });
      if (createErr || !created.user) {
        return json({ error: createErr?.message ?? "Création impossible" }, 400);
      }

      // Sécurise les colonnes ACL (au cas où le trigger n’a pas tout pris)
      const { error: updErr } = await admin
        .from("profiles")
        .update({
          name,
          first_name: firstName,
          initials: initialsOf(name, firstName),
          role,
          bank_name: role === "BANQUE" ? body.bankName!.trim() : null,
          shareholder_name: role === "ASSOCIE" ? body.shareholderName!.trim() : null,
          allowed_views: allowedViews,
          allowed_entity_slugs: allowedEntitySlugs,
        })
        .eq("id", created.user.id);
      if (updErr) return json({ error: updErr.message }, 400);

      return json({ ok: true, userId: created.user.id, email });
    }

    if (body.action === "update") {
      if (!body.userId) return json({ error: "userId requis" }, 400);
      if (body.userId === authData.user.id) {
        return json({ error: "Modifiez votre propre compte via le profil Auth" }, 400);
      }

      const patch: Record<string, unknown> = {};
      if (body.name?.trim()) patch.name = body.name.trim();
      if (body.firstName?.trim()) patch.first_name = body.firstName.trim();
      if (body.role === "ASSOCIE" || body.role === "BANQUE") patch.role = body.role;
      if (body.bankName !== undefined) patch.bank_name = body.bankName?.trim() || null;
      if (body.shareholderName !== undefined) {
        patch.shareholder_name = body.shareholderName?.trim() || null;
      }
      if (body.allowedViews !== undefined) patch.allowed_views = emptyToNull(body.allowedViews);
      if (body.allowedEntitySlugs !== undefined) {
        patch.allowed_entity_slugs = emptyToNull(body.allowedEntitySlugs);
      }
      if (patch.name || patch.first_name) {
        patch.initials = initialsOf(
          String(patch.name ?? body.name ?? "U"),
          String(patch.first_name ?? body.firstName ?? "U"),
        );
      }

      const { error: updErr } = await admin.from("profiles").update(patch).eq("id", body.userId);
      if (updErr) return json({ error: updErr.message }, 400);

      if (body.password && body.password.length >= 8) {
        const { error: pwErr } = await admin.auth.admin.updateUserById(body.userId, {
          password: body.password,
        });
        if (pwErr) return json({ error: pwErr.message }, 400);
      }

      return json({ ok: true, userId: body.userId });
    }

    if (body.action === "delete") {
      if (!body.userId) return json({ error: "userId requis" }, 400);
      if (body.userId === authData.user.id) {
        return json({ error: "Impossible de supprimer votre propre compte" }, 400);
      }
      const { error: delErr } = await admin.auth.admin.deleteUser(body.userId);
      if (delErr) return json({ error: delErr.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "Action inconnue" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Erreur serveur" }, 500);
  }
});
