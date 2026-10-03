import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  UserPlus, Users, Trash2, Pencil, KeyRound, Building2, Landmark, Check, X, ChevronDown,
} from "lucide-react";
import type { AuthUser } from "@/lib/auth";
import { roleLabel } from "@/lib/auth";
import { resolveBankName } from "@/lib/banks";
import {
  PAGE_TITLES,
  configurableViewsForRole,
  type View,
} from "@/lib/permissions";
import { fetchAllProfiles, manageUser } from "@/lib/supabaseRepo";
import { IconTextField } from "./IconField";
import { pageWrap, G, lbl, btnP, btnG, btnD, inp, selectCls } from "./layout";

type DraftRole = "ASSOCIE" | "BANQUE";

interface SciOpt {
  id: string;
  shortName: string;
  associes: { name: string; parts: number }[];
}

interface PropertyOpt {
  credit?: { banque: string };
}

function genPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
  let s = "";
  for (let i = 0; i < 12; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export function UsersAdminView({
  currentUser,
  scis,
  properties,
}: {
  currentUser: AuthUser;
  scis: SciOpt[];
  properties: PropertyOpt[];
}) {
  const [profiles, setProfiles] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const [role, setRole] = useState<DraftRole>("ASSOCIE");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [password, setPassword] = useState(() => genPassword());
  const [shareholderName, setShareholderName] = useState("");
  const [bankName, setBankName] = useState("");
  const [views, setViews] = useState<View[]>(() => configurableViewsForRole("ASSOCIE"));
  const [entitySlugs, setEntitySlugs] = useState<string[]>([]);

  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

  /** Noms exclus : gérant connecté + tout profil GERANT (il crée les accès, ce n’est pas un associé). */
  const excludedAssocieNames = useMemo(() => {
    const set = new Set<string>();
    const add = (v?: string | null) => {
      const t = v?.trim();
      if (t) set.add(norm(t));
    };
    add(currentUser.name);
    add(currentUser.firstName);
    add(currentUser.shareholderName);
    add(`${currentUser.firstName} ${currentUser.name}`);
    for (const p of profiles) {
      if (p.role !== "GERANT") continue;
      add(p.name);
      add(p.firstName);
      add(p.shareholderName);
      add(`${p.firstName} ${p.name}`);
    }
    return set;
  }, [currentUser, profiles]);

  /** Associés déjà saisis dans les SCI — hors gérant. */
  const associesEnBase = useMemo(() => {
    const map = new Map<string, { name: string; scis: string[] }>();
    for (const s of scis) {
      for (const a of s.associes ?? []) {
        const n = a.name?.trim();
        if (!n) continue;
        if (excludedAssocieNames.has(norm(n))) continue;
        const cur = map.get(n) ?? { name: n, scis: [] };
        if (!cur.scis.includes(s.shortName)) cur.scis.push(s.shortName);
        map.set(n, cur);
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "fr"));
  }, [scis, excludedAssocieNames]);

  /** Banques déjà présentes sur les crédits (pas la liste générique). */
  const banquesEnBase = useMemo(() => {
    const byKey = new Map<string, string>();
    for (const p of properties) {
      const b = p.credit?.banque?.trim();
      if (!b) continue;
      const key = b.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (!byKey.has(key)) byKey.set(key, b);
    }
    return [...byKey.values()].sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));
  }, [properties]);

  const roleViews = configurableViewsForRole(role);

  const load = async () => {
    setLoading(true);
    try {
      setProfiles(await fetchAllProfiles());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Chargement des comptes impossible");
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!formOpen) return;
    const el = formRef.current;
    if (!el) return;
    const t = window.setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      if (!editingId) {
        document.getElementById("compte-email")?.focus({ preventScroll: true });
      }
    }, 80);
    return () => window.clearTimeout(t);
  }, [formOpen, editingId, role, shareholderName, bankName]);

  const resetForm = () => {
    setEditingId(null);
    setFormOpen(false);
    setRole("ASSOCIE");
    setEmail("");
    setName("");
    setFirstName("");
    setPassword(genPassword());
    setShareholderName("");
    setBankName("");
    setViews(configurableViewsForRole("ASSOCIE"));
    setEntitySlugs([]);
  };

  const openCreateAssocie = (assocName: string) => {
    const parts = assocName.trim().split(/\s+/);
    setEditingId(null);
    setFormOpen(true);
    setRole("ASSOCIE");
    setShareholderName(assocName);
    setBankName("");
    setFirstName(parts[0] ?? "");
    setName(parts.slice(1).join(" ") || parts[0] || "");
    setEmail("");
    setPassword(genPassword());
    setViews(configurableViewsForRole("ASSOCIE"));
    // Pré-coche les SCI où cet associé a déjà des parts
    const linked = scis
      .filter((s) => (s.associes ?? []).some((a) => a.name.trim() === assocName))
      .map((s) => s.id);
    setEntitySlugs(linked);
  };

  const openCreateBanque = (banque: string) => {
    setEditingId(null);
    setFormOpen(true);
    setRole("BANQUE");
    setBankName(banque);
    setShareholderName("");
    setFirstName("Banque");
    setName(banque);
    setEmail("");
    setPassword(genPassword());
    setViews(configurableViewsForRole("BANQUE"));
    setEntitySlugs([]);
  };

  const startEdit = (p: AuthUser) => {
    if (p.role === "GERANT") {
      toast.error("Le compte gérant se gère dans Supabase Auth.");
      return;
    }
    setFormOpen(true);
    setEditingId(p.id);
    setRole(p.role as DraftRole);
    setEmail(p.email);
    setName(p.name);
    setFirstName(p.firstName);
    setPassword("");
    setShareholderName(p.shareholderName ?? "");
    setBankName(p.bankName ?? "");
    const base = configurableViewsForRole(p.role as DraftRole);
    setViews(
      p.allowedViews?.length
        ? base.filter((v) => p.allowedViews!.includes(v))
        : base,
    );
    setEntitySlugs(p.allowedEntitySlugs ?? []);
  };

  const toggleView = (v: View) => {
    setViews((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  };

  const toggleEntity = (slug: string) => {
    setEntitySlugs((prev) =>
      prev.includes(slug) ? prev.filter((x) => x !== slug) : [...prev, slug],
    );
  };

  const handleSave = async () => {
    if (!name.trim() || !firstName.trim()) {
      toast.error("Nom et prénom requis.");
      return;
    }
    if (role === "ASSOCIE" && !shareholderName.trim()) {
      toast.error("Choisissez un associé déjà présent dans vos SCI.");
      return;
    }
    if (role === "BANQUE" && !bankName.trim()) {
      toast.error("Choisissez une banque déjà présente sur vos crédits.");
      return;
    }
    if (views.length === 0) {
      toast.error("Sélectionnez au moins une page visible.");
      return;
    }

    setSaving(true);
    try {
      const bank = role === "BANQUE" ? resolveBankName(bankName, banquesEnBase) : null;
      if (editingId) {
        await manageUser({
          action: "update",
          userId: editingId,
          name: name.trim(),
          firstName: firstName.trim(),
          role,
          bankName: bank,
          shareholderName: role === "ASSOCIE" ? shareholderName.trim() : null,
          allowedViews: views,
          allowedEntitySlugs: role === "ASSOCIE" ? entitySlugs : null,
          password: password.trim().length >= 8 ? password.trim() : undefined,
        });
        toast.success("Compte mis à jour.");
      } else {
        if (!email.trim()) {
          toast.error("Email requis.");
          return;
        }
        if (password.trim().length < 8) {
          toast.error("Mot de passe d’au moins 8 caractères.");
          return;
        }
        const res = await manageUser({
          action: "create",
          email: email.trim(),
          password: password.trim(),
          name: name.trim(),
          firstName: firstName.trim(),
          role,
          bankName: bank,
          shareholderName: role === "ASSOCIE" ? shareholderName.trim() : null,
          allowedViews: views,
          allowedEntitySlugs: role === "ASSOCIE" ? entitySlugs : null,
        });
        toast.success(`Compte créé : ${res.email ?? email}. Transmettez le mot de passe une seule fois.`);
      }
      resetForm();
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: AuthUser) => {
    if (p.id === currentUser.id) return;
    if (p.role === "GERANT") {
      toast.error("Impossible de supprimer un gérant depuis l’app.");
      return;
    }
    if (!confirm(`Supprimer le compte ${p.email} ?`)) return;
    try {
      await manageUser({ action: "delete", userId: p.id });
      toast.success("Compte supprimé.");
      if (editingId === p.id) resetForm();
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Suppression impossible");
    }
  };

  const accountForShareholder = (assocName: string) =>
    profiles.find((p) => p.role === "ASSOCIE" && p.shareholderName === assocName);

  const accountForBank = (banque: string) =>
    profiles.find(
      (p) =>
        p.role === "BANQUE" &&
        resolveBankName(p.bankName ?? "", banquesEnBase) === resolveBankName(banque, banquesEnBase),
    );

  return (
    <div className={`${pageWrap} space-y-5`}>
      <div className={`${G} p-5`}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center vision-accent-bg">
            <Users size={20} className="vision-accent-text" />
          </div>
          <div>
            <h2 className="text-base font-bold vision-text">Comptes & accès</h2>
            <p className="text-sm vision-text-muted mt-0.5">
              Choisissez un associé ou une banque <strong className="vision-text">déjà présents dans Vision</strong>, puis créez son accès de connexion.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-5">
        {/* Associés déjà en base */}
        <div className={`${G} p-5`}>
          <p className={`${lbl} mb-1`}>Associés déjà renseignés</p>
          <p className="text-xs vision-text-muted mb-4">
            Autres associés présents dans vos SCI (le gérant n’apparaît pas ici). Cliquez pour leur créer un accès.
          </p>
          {associesEnBase.length === 0 ? (
            <p className="text-sm vision-text-muted">
              Aucun associé trouvé. Ajoutez des associés dans l’onglet SCI d’abord.
            </p>
          ) : (
            <div className="space-y-2">
              {associesEnBase.map((a) => {
                const acc = accountForShareholder(a.name);
                return (
                  <div
                    key={a.name}
                    className="flex flex-wrap items-center gap-3 p-3 rounded-xl vision-surface border border-[var(--v-border-subtle)]"
                  >
                    <Building2 size={16} className="vision-accent-text shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold vision-text">{a.name}</p>
                      <p className="text-xs vision-text-muted">{a.scis.join(" · ")}</p>
                      {acc && (
                        <p className="text-xs vision-positive-text mt-0.5">Compte : {acc.email}</p>
                      )}
                    </div>
                    {acc ? (
                      <button type="button" className={btnG} onClick={() => startEdit(acc)}>
                        <Pencil size={12} /> Accès
                      </button>
                    ) : (
                      <button type="button" className={btnP} onClick={() => openCreateAssocie(a.name)}>
                        <UserPlus size={12} /> Créer l’accès
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Banques déjà en base */}
        <div className={`${G} p-5`}>
          <p className={`${lbl} mb-1`}>Banques déjà renseignées</p>
          <p className="text-xs vision-text-muted mb-4">
            Issus de vos crédits. Cliquez pour créer / gérer leur compte portail.
          </p>
          {banquesEnBase.length === 0 ? (
            <p className="text-sm vision-text-muted">
              Aucune banque trouvée. Ajoutez un crédit avec une banque d’abord.
            </p>
          ) : (
            <div className="space-y-2">
              {banquesEnBase.map((b) => {
                const acc = accountForBank(b);
                return (
                  <div
                    key={b}
                    className="flex flex-wrap items-center gap-3 p-3 rounded-xl vision-surface border border-[var(--v-border-subtle)]"
                  >
                    <Landmark size={16} className="vision-accent-text shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold vision-text">{b}</p>
                      {acc && (
                        <p className="text-xs vision-positive-text mt-0.5">Compte : {acc.email}</p>
                      )}
                    </div>
                    {acc ? (
                      <button type="button" className={btnG} onClick={() => startEdit(acc)}>
                        <Pencil size={12} /> Accès
                      </button>
                    ) : (
                      <button type="button" className={btnP} onClick={() => openCreateBanque(b)}>
                        <UserPlus size={12} /> Créer l’accès
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Formulaire création / édition */}
      {formOpen && (
        <div ref={formRef} className={`${G} p-5 space-y-4 scroll-mt-4`}>
          <div className="flex items-center justify-between gap-2">
            <p className={lbl}>
              {editingId ? "Modifier l’accès" : `Nouvel accès · ${roleLabel(role)}`}
            </p>
            <button type="button" className={btnG} onClick={resetForm}><X size={14} /> Fermer</button>
          </div>

          {role === "ASSOCIE" && (
            <div>
              <label className={lbl}>Associé (déjà en base)</label>
              <div className="relative">
                <select
                  className={selectCls}
                  value={shareholderName}
                  onChange={(e) => {
                    const v = e.target.value;
                    setShareholderName(v);
                    if (v) {
                      const parts = v.split(/\s+/);
                      setFirstName(parts[0] ?? "");
                      setName(parts.slice(1).join(" ") || parts[0] || "");
                      setEntitySlugs(
                        scis
                          .filter((s) => (s.associes ?? []).some((a) => a.name.trim() === v))
                          .map((s) => s.id),
                      );
                    }
                  }}
                >
                  <option value="">Choisir un associé…</option>
                  {associesEnBase.map((a) => (
                    <option key={a.name} value={a.name}>
                      {a.name} ({a.scis.join(", ")})
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 vision-field-icon"
                  aria-hidden
                />
              </div>
            </div>
          )}

          {role === "BANQUE" && (
            <div>
              <label className={lbl}>Banque (déjà en base)</label>
              <div className="relative">
                <select
                  className={selectCls}
                  value={bankName}
                  onChange={(e) => {
                    const v = e.target.value;
                    setBankName(v);
                    if (v) setName(v);
                  }}
                >
                  <option value="">Choisir une banque…</option>
                  {banquesEnBase.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 vision-field-icon"
                  aria-hidden
                />
              </div>
            </div>
          )}

          {!editingId && (
            <IconTextField
              id="compte-email"
              label="Email de connexion"
              icon={<UserPlus size={16} />}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ex. associe@email.fr"
              autoComplete="off"
            />
          )}
          {editingId && (
            <div>
              <label className={lbl}>Email</label>
              <input className={inp} value={email} disabled />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Prénom</label>
              <input className={inp} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Nom</label>
              <input className={inp} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>

          <div>
            <label className={lbl}>
              {editingId ? "Nouveau mot de passe (optionnel)" : "Mot de passe temporaire"}
            </label>
            <div className="flex gap-2">
              <input
                className={inp}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={editingId ? "Laisser vide pour ne pas changer" : ""}
                autoComplete="new-password"
              />
              <button type="button" className={btnG} onClick={() => setPassword(genPassword())} title="Générer">
                <KeyRound size={14} />
              </button>
            </div>
          </div>

          {role === "ASSOCIE" && (
            <div>
              <p className={lbl}>SCI visibles pour ce compte</p>
              <p className="text-xs vision-text-muted mb-2">
                Par défaut : les SCI où cet associé a déjà des parts. Décochez pour restreindre.
              </p>
              <div className="flex flex-wrap gap-2">
                {scis.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleEntity(s.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      entitySlugs.includes(s.id) ? "vision-nav-active" : "vision-surface vision-text-muted"
                    }`}
                  >
                    {entitySlugs.includes(s.id) && <Check size={10} className="inline mr-1" />}
                    {s.shortName}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className={lbl}>Pages visibles</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {roleViews.map((v) => (
                <label key={v} className="flex items-center gap-2 cursor-pointer text-sm vision-text">
                  <input type="checkbox" checked={views.includes(v)} onChange={() => toggleView(v)} />
                  {PAGE_TITLES[v]}
                </label>
              ))}
            </div>
          </div>

          <button type="button" disabled={saving} onClick={handleSave} className={btnP}>
            {editingId ? <Pencil size={14} /> : <UserPlus size={14} />}
            {saving ? "Enregistrement…" : editingId ? "Enregistrer" : "Créer le compte"}
          </button>
        </div>
      )}

      <div className={`${G} p-5`}>
        <p className={`${lbl} mb-4`}>Comptes de connexion déjà créés</p>
        {loading ? (
          <p className="text-sm vision-text-muted">Chargement…</p>
        ) : profiles.length === 0 ? (
          <p className="text-sm vision-text-muted">Aucun compte Auth pour l’instant.</p>
        ) : (
          <div className="space-y-2">
            {profiles.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center gap-3 p-3 rounded-xl vision-surface border border-[var(--v-border-subtle)]"
              >
                <div className="w-9 h-9 rounded-lg vision-accent-bg flex items-center justify-center text-xs font-bold vision-accent-text">
                  {p.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold vision-text truncate">{p.firstName} {p.name}</p>
                  <p className="text-xs vision-text-muted truncate">
                    {p.email} · {roleLabel(p.role)}
                    {p.role === "BANQUE" && p.bankName ? ` · ${p.bankName}` : ""}
                    {p.role === "ASSOCIE" && p.shareholderName ? ` · ${p.shareholderName}` : ""}
                  </p>
                </div>
                {p.role !== "GERANT" && (
                  <>
                    <button type="button" className={btnG} onClick={() => startEdit(p)} title="Modifier">
                      <Pencil size={12} />
                    </button>
                    <button type="button" className={btnD} onClick={() => handleDelete(p)} title="Supprimer">
                      <Trash2 size={12} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
