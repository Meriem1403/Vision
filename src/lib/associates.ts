/** Associés / actionnaires — liste déroulante + dédoublonnage de noms. */

export const ASSOCIE_OTHER_VALUE = "__nouvel_associe__";

function normalizeAssocieKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

/** Liste unique des associés connus (ordre alpha FR). */
export function listAssocieOptions(existing: string[] = []): string[] {
  const byKey = new Map<string, string>();
  for (const n of existing) {
    const trimmed = n?.trim();
    if (!trimmed) continue;
    const key = normalizeAssocieKey(trimmed);
    if (!byKey.has(key)) byKey.set(key, trimmed);
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));
}

/** Réutilise le libellé canonique si le nom existe déjà (casse / accents). */
export function resolveAssocieName(input: string, existing: string[] = []): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  const key = normalizeAssocieKey(trimmed);
  const hit = listAssocieOptions(existing).find((n) => normalizeAssocieKey(n) === key);
  return hit ?? trimmed;
}

export function sameAssocieName(a: string, b: string): boolean {
  if (!a.trim() || !b.trim()) return false;
  return normalizeAssocieKey(a) === normalizeAssocieKey(b);
}
