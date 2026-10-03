/** Banques courantes FR — base de la liste déroulante crédit. */
export const KNOWN_BANKS = [
  "Crédit Agricole",
  "BNP Paribas",
  "Société Générale",
  "LCL",
  "CIC",
  "Crédit Mutuel",
  "Banque Populaire",
  "BRED",
  "Caisse d'Épargne",
  "La Banque Postale",
  "HSBC",
  "Boursorama",
] as const;

export const BANK_OTHER_VALUE = "__autre__";

function normalizeBankKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

/** Fusionne banques connues + déjà utilisées (sans doublons, ordre alpha). */
export function listBankOptions(existing: string[] = []): string[] {
  const byKey = new Map<string, string>();
  for (const b of [...KNOWN_BANKS, ...existing]) {
    const trimmed = b?.trim();
    if (!trimmed) continue;
    const key = normalizeBankKey(trimmed);
    if (!byKey.has(key)) byKey.set(key, trimmed);
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));
}

/** Si une banque existe déjà (casse/accents près), réutilise le libellé canonique. */
export function resolveBankName(input: string, existing: string[] = []): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  const key = normalizeBankKey(trimmed);
  const options = listBankOptions(existing);
  const hit = options.find((b) => normalizeBankKey(b) === key);
  return hit ?? trimmed;
}
