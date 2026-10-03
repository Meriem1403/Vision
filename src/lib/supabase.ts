import { createClient } from "@supabase/supabase-js";

/** Netlify : guillemets, espaces, /rest/v1 collés par erreur */
function cleanEnv(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  let s = raw.trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s || undefined;
}

/** Netlify/env souvent collés avec /rest/v1 ou un slash final → erreur "Invalid path…" */
function normalizeSupabaseUrl(raw: string | undefined): string | undefined {
  const cleaned = cleanEnv(raw);
  if (!cleaned) return undefined;
  try {
    const withProtocol = cleaned.startsWith("http") ? cleaned : `https://${cleaned}`;
    const u = new URL(withProtocol);
    // garder uniquement l'origine : https://xxxx.supabase.co
    return u.origin;
  } catch {
    return undefined;
  }
}

const supabaseUrl = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL as string | undefined);
const supabaseAnonKey = cleanEnv(import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);

export const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export const isSupabaseConfigured = () => supabase !== null;
