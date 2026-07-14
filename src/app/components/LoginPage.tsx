import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Building2, Lock, Mail, User } from "lucide-react";
import { api } from "@/lib/api";
import type { AuthUser } from "@/lib/auth";
import { roleLabel, storeSession } from "@/lib/auth";
import { BrandLogo } from "./BrandLogo";
import { G, inp, btnP } from "./layout";

interface LoginPageProps {
  onLogin: (user: AuthUser) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState("johann@vision.local");
  const [password, setPassword] = useState("vision");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoUsers, setDemoUsers] = useState<Array<{ email: string; name: string; role: string }>>([]);

  useEffect(() => {
    api.demoUsers().then(setDemoUsers).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { token, user } = await api.login(email, password);
      storeSession(token, user);
      onLogin(user);
    } catch {
      setError("Identifiants incorrects ou API indisponible");
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (u: { email: string }) => {
    setEmail(u.email);
    setPassword("vision");
  };

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
        <div className="flex flex-col items-center mb-8">
          <BrandLogo />
          <p className="text-sm vision-text-muted mt-4 text-center">Patrimoine immobilier · Accès sécurisé par rôle</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
            />
          </div>
          <div>
            <label className="text-xs font-semibold vision-text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Lock size={12} /> Mot de passe
            </label>
            <input
              type="password"
              className={inp}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && <p className="text-sm vision-negative-text">{error}</p>}

          <button type="submit" disabled={loading} className={`${btnP} w-full justify-center`}>
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        {demoUsers.length > 0 && (
          <div className="mt-8 pt-6 border-t border-[var(--v-border-subtle)]">
            <p className="text-xs vision-text-muted mb-3 flex items-center gap-1.5">
              <User size={12} /> Comptes démo (mot de passe : vision)
            </p>
            <div className="space-y-2">
              {demoUsers.map((u) => (
                <button
                  key={u.email}
                  type="button"
                  onClick={() => quickLogin(u)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl vision-surface border border-[var(--v-border-subtle)] hover:vision-surface-strong transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center vision-accent-bg">
                    <Building2 size={14} className="vision-accent-text" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold vision-text truncate">{u.name}</p>
                    <p className="text-xs vision-text-muted">{roleLabel(u.role as import("@/lib/auth").UserRole)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
