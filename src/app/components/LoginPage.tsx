import { useState } from "react";
import { motion } from "motion/react";
import { KeyRound, Lock, LogIn, Mail, Shield } from "lucide-react";
import { api } from "@/lib/api";
import type { AuthUser } from "@/lib/auth";
import { storeSession, storeUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  supabaseGetSessionUser,
  supabaseLogin,
  supabaseRequestPasswordReset,
  supabaseUpdatePassword,
} from "@/lib/supabaseRepo";
import { BrandLogo } from "./BrandLogo";
import { G, inp, btnP, btnG } from "./layout";

interface LoginPageProps {
  onLogin: (user: AuthUser) => void;
  /** Mode récupération après clic sur le lien email Supabase */
  passwordRecovery?: boolean;
  onPasswordRecoveryDone?: () => void;
}

type Mode = "login" | "forgot" | "reset";

const isProd = import.meta.env.PROD;
const showDevHints = import.meta.env.DEV && import.meta.env.VITE_SHOW_DEMO_ACCOUNTS === "true";

export function LoginPage({ onLogin, passwordRecovery = false, onPasswordRecoveryDone }: LoginPageProps) {
  const usingSupabase = isSupabaseConfigured();
  const [mode, setMode] = useState<Mode>(passwordRecovery ? "reset" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  if (!usingSupabase && isProd) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-4 vision-app-bg">
        <div className={`${G} w-full max-w-md p-6 sm:p-8 text-center`}>
          <BrandLogo />
          <p className="text-sm vision-text mt-6 font-semibold">Configuration manquante</p>
          <p className="text-sm vision-text-muted mt-2">
            Les variables <code className="text-xs">VITE_SUPABASE_URL</code> et{" "}
            <code className="text-xs">VITE_SUPABASE_ANON_KEY</code> doivent être définies sur Netlify.
          </p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      if (mode === "forgot") {
        if (usingSupabase) {
          await supabaseRequestPasswordReset(email);
        }
        setInfo("Si un compte existe pour cet email, un lien de réinitialisation vient d’être envoyé.");
        setMode("login");
        return;
      }

      if (mode === "reset") {
        if (password.length < 8) {
          throw new Error("Le mot de passe doit contenir au moins 8 caractères.");
        }
        if (password !== confirm) {
          throw new Error("Les deux mots de passe ne correspondent pas.");
        }
        if (!usingSupabase) throw new Error("Réinitialisation disponible uniquement avec Supabase.");
        await supabaseUpdatePassword(password);
        setInfo("Mot de passe mis à jour. Connexion en cours…");
        onPasswordRecoveryDone?.();
        const user = await supabaseGetSessionUser();
        if (user) {
          storeUser(user);
          onLogin(user);
        }
        return;
      }

      // login
      if (usingSupabase) {
        const user = await supabaseLogin(email, password);
        storeUser(user);
        onLogin(user);
      } else {
        const { token, user } = await api.login(email, password);
        storeSession(token, user);
        onLogin(user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible.");
    } finally {
      setLoading(false);
    }
  };

  const title =
    mode === "forgot" ? "Mot de passe oublié" : mode === "reset" ? "Nouveau mot de passe" : "Connexion";
  const subtitle =
    mode === "forgot"
      ? "Indiquez votre email pour recevoir un lien sécurisé."
      : mode === "reset"
        ? "Choisissez un nouveau mot de passe pour votre compte."
        : "Accès réservé au gérant, associés et partenaires bancaires.";

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 vision-app-bg relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-48 -left-48 w-[500px] h-[500px] rounded-full" style={{ background: "radial-gradient(circle,var(--v-blob-1) 0%,transparent 65%)" }} />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full" style={{ background: "radial-gradient(circle,var(--v-blob-2) 0%,transparent 65%)" }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${G} w-full max-w-md p-6 sm:p-8 relative z-10`}
      >
        <div className="flex flex-col items-center mb-6">
          <BrandLogo />
          <div className="mt-5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold vision-surface border border-[var(--v-border-subtle)] vision-text-muted">
            <Shield size={12} /> Espace sécurisé
          </div>
          <h1 className="text-xl font-bold vision-text mt-4" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
            {title}
          </h1>
          <p className="text-sm vision-text-muted mt-1.5 text-center">{subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode !== "reset" && (
            <div>
              <label className="text-xs font-semibold vision-text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Mail size={12} /> Email
              </label>
              <input
                type="email"
                className={inp}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
                placeholder="vous@exemple.fr"
              />
            </div>
          )}

          {mode !== "forgot" && (
            <div>
              <label className="text-xs font-semibold vision-text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Lock size={12} /> {mode === "reset" ? "Nouveau mot de passe" : "Mot de passe"}
              </label>
              <input
                type="password"
                className={inp}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={mode === "reset" ? "new-password" : "current-password"}
                placeholder={mode === "reset" ? "Au moins 8 caractères" : "••••••••"}
                minLength={mode === "reset" ? 8 : undefined}
              />
            </div>
          )}

          {mode === "reset" && (
            <div>
              <label className="text-xs font-semibold vision-text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <KeyRound size={12} /> Confirmer
              </label>
              <input
                type="password"
                className={inp}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="Répétez le mot de passe"
                minLength={8}
              />
            </div>
          )}

          {mode === "login" && usingSupabase && (
            <button
              type="button"
              className="text-xs vision-text-muted hover:vision-text transition-colors"
              onClick={() => {
                setMode("forgot");
                setError("");
                setInfo("");
              }}
            >
              Mot de passe oublié ?
            </button>
          )}

          {(mode === "forgot" || (mode === "reset" && !passwordRecovery)) && (
            <button
              type="button"
              className="text-xs vision-text-muted hover:vision-text transition-colors"
              onClick={() => {
                setMode("login");
                setError("");
                setInfo("");
              }}
            >
              ← Retour à la connexion
            </button>
          )}

          {info && (
            <p className="text-sm vision-positive-text" role="status">
              {info}
            </p>
          )}
          {error && (
            <p className="text-sm vision-negative-text" role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className={`${btnP} w-full justify-center gap-2`}>
            {mode === "login" && <LogIn size={16} />}
            {mode === "forgot" && <Mail size={16} />}
            {mode === "reset" && <KeyRound size={16} />}
            {loading
              ? mode === "forgot"
                ? "Envoi…"
                : mode === "reset"
                  ? "Enregistrement…"
                  : "Connexion…"
              : mode === "forgot"
                ? "Envoyer le lien"
                : mode === "reset"
                  ? "Enregistrer"
                  : "Se connecter"}
          </button>
        </form>

        {showDevHints && mode === "login" && (
          <div className="mt-6 pt-5 border-t border-[var(--v-border-subtle)]">
            <p className="text-xs vision-text-faint mb-2">Mode dev — comptes à créer dans Supabase Auth</p>
            <button type="button" className={btnG} onClick={() => setEmail("johann@example.com")}>
              Remplir email exemple
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
