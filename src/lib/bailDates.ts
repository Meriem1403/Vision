/** Parse une date de bail (YYYY-MM-DD ou JJ/MM/AAAA) → timestamp local midi. */
export function bailDateToTs(value: string): number {
  if (!value?.trim()) return 0;
  const v = value.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) {
    const d = new Date(`${v.slice(0, 10)}T12:00:00`);
    return Number.isNaN(d.getTime()) ? 0 : d.getTime();
  }
  const fr = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (fr) {
    const d = new Date(+fr[3], +fr[2] - 1, +fr[1], 12, 0, 0);
    return Number.isNaN(d.getTime()) ? 0 : d.getTime();
  }
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

export function syncTenantBailTs<T extends { debutBail: string; finBail: string }>(
  t: T,
): T & { debutTs: number; finTs: number } {
  return {
    ...t,
    debutTs: bailDateToTs(t.debutBail),
    finTs: bailDateToTs(t.finBail),
  };
}

/** % d’avancement du bail (0–100). Tolère debutTs/finTs à 0 en recalculant depuis les dates. */
export function leaseProgressPct(t: {
  debutBail: string;
  finBail: string;
  debutTs?: number;
  finTs?: number;
}): number {
  const debut = t.debutTs && t.debutTs > 0 ? t.debutTs : bailDateToTs(t.debutBail);
  const fin = t.finTs && t.finTs > 0 ? t.finTs : bailDateToTs(t.finBail);
  if (!debut || !fin || fin <= debut) return 0;
  const now = Date.now();
  if (now >= fin) return 100;
  if (now <= debut) return 0;
  return Math.round(((now - debut) / (fin - debut)) * 100);
}

export function formatBailDate(value: string): string {
  if (!value?.trim()) return "—";
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("fr-FR");
  }
  return value;
}
