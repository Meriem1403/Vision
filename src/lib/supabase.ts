import { createClient } from "@supabase/supabase-js";

/** Netlify/env souvent collés avec /rest/v1 ou un slash final → erreur "Invalid path…" */
function normalizeSupabaseUrl(raw: string | undefined): string | undefined {
  if (!raw?.trim()) return undefined;
  try {
    const u = new URL(raw.trim());
    // garder uniquement l'origine : https://xxxx.supabase.co
    return u.origin;
  } catch {
    return undefined;
  }
}

const supabaseUrl = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL as string | undefined);
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

export const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export const isSupabaseConfigured = () => supabase !== null;
