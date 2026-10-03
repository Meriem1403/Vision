/** Séparation stricte : investissement (SCI) vs résidence principale (RP). */

export type EntityLike = {
  id?: string;
  slug?: string;
  shortName?: string;
  type?: string;
};

/** True si l’entité est la résidence principale (type RP, slug/id `rp`, ou libellé). */
export function isResidenceEntity(entity: EntityLike | null | undefined): boolean {
  if (!entity) return false;
  const type = String(entity.type ?? "").trim().toUpperCase();
  if (type === "RP") return true;
  const key = String(entity.id ?? entity.slug ?? "")
    .trim()
    .toLowerCase();
  if (key === "rp" || key.startsWith("rp-") || key.endsWith("-rp")) return true;
  const short = String(entity.shortName ?? "").trim().toUpperCase();
  return short === "RP";
}

export function filterInvestmentEntities<T extends EntityLike>(entities: T[]): T[] {
  return entities.filter((e) => !isResidenceEntity(e));
}

export function filterResidenceEntities<T extends EntityLike>(entities: T[]): T[] {
  return entities.filter((e) => isResidenceEntity(e));
}

export function filterPropertiesByEntities<T extends { sciId: string }, E extends EntityLike & { id: string }>(
  properties: T[],
  entities: E[],
): T[] {
  const ids = new Set(entities.map((e) => e.id));
  return properties.filter((p) => ids.has(p.sciId));
}
