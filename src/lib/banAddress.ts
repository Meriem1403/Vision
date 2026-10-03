/** Autocomplétion adresse FR — BAN + API Geo */

export interface BanSuggestion {
  id: string;
  label: string;
  address: string;
  cp: string;
  ville: string;
  type: string;
}

export type BanSearchKind = "address" | "city" | "postcode";

interface BanFeature {
  properties?: {
    id?: string;
    label?: string;
    name?: string;
    housenumber?: string;
    street?: string;
    postcode?: string;
    city?: string;
    type?: string;
  };
}

interface GeoCommune {
  nom?: string;
  code?: string;
  codesPostaux?: string[];
}

interface GeoDepartement {
  nom?: string;
  code?: string;
}

const BAN_URL = "https://api-adresse.data.gouv.fr/search/";
const GEO_COMMUNES = "https://geo.api.gouv.fr/communes";
const GEO_DEPTS = "https://geo.api.gouv.fr/departements";

let deptsCache: GeoDepartement[] | null = null;

async function loadDepartements(signal?: AbortSignal): Promise<GeoDepartement[]> {
  if (deptsCache) return deptsCache;
  const res = await fetch(GEO_DEPTS, { signal });
  if (!res.ok) throw new Error(`Geo depts ${res.status}`);
  deptsCache = (await res.json()) as GeoDepartement[];
  return deptsCache;
}

function mapBanFeatures(features: BanFeature[], fallbackQ: string): BanSuggestion[] {
  return features.map((f, i) => {
    const p = f.properties ?? {};
    const type = p.type ?? "";
    const address =
      type === "municipality" || type === "locality"
        ? ""
        : p.name?.trim()
          || [p.housenumber, p.street].filter(Boolean).join(" ").trim()
          || (p.label?.split(",")[0]?.trim() ?? "");
    return {
      id: p.id ?? `ban-${i}-${p.label ?? fallbackQ}`,
      label: p.label ?? (address || fallbackQ),
      address,
      cp: p.postcode ?? "",
      ville: p.city ?? p.name ?? "",
      type,
    };
  });
}

function communeToSuggestions(c: GeoCommune, cpFilter?: string): BanSuggestion[] {
  const ville = c.nom ?? "";
  const codes = c.codesPostaux ?? [];
  const filtered = cpFilter
    ? codes.filter((cp) => cp.startsWith(cpFilter))
    : codes;
  const use = filtered.length > 0 ? filtered : codes.slice(0, 1);
  if (use.length === 0) {
    return [{
      id: `geo-${c.code ?? ville}`,
      label: ville,
      address: "",
      cp: "",
      ville,
      type: "municipality",
    }];
  }
  return use.slice(0, 3).map((cp) => ({
    id: `geo-${c.code ?? ville}-${cp}`,
    label: `${ville} (${cp})`,
    address: "",
    cp,
    ville,
    type: "municipality",
  }));
}

async function searchCities(query: string, signal?: AbortSignal): Promise<BanSuggestion[]> {
  const q = query.trim();
  if (!q) return [];
  const url = new URL(GEO_COMMUNES);
  url.searchParams.set("nom", q);
  url.searchParams.set("fields", "nom,code,codesPostaux");
  url.searchParams.set("boost", "population");
  url.searchParams.set("limit", "8");
  const res = await fetch(url.toString(), { signal });
  if (!res.ok) throw new Error(`Geo communes ${res.status}`);
  const data = (await res.json()) as GeoCommune[];
  return data.flatMap((c) => communeToSuggestions(c).slice(0, 1));
}

async function searchPostcodes(query: string, signal?: AbortSignal): Promise<BanSuggestion[]> {
  const digits = query.replace(/\D/g, "");
  if (!digits) return [];

  if (digits.length === 5) {
    const url = new URL(GEO_COMMUNES);
    url.searchParams.set("codePostal", digits);
    url.searchParams.set("fields", "nom,code,codesPostaux");
    url.searchParams.set("boost", "population");
    url.searchParams.set("limit", "8");
    const res = await fetch(url.toString(), { signal });
    if (!res.ok) throw new Error(`Geo CP ${res.status}`);
    const data = (await res.json()) as GeoCommune[];
    return data.flatMap((c) => communeToSuggestions(c, digits));
  }

  if (digits.length === 1) {
    const depts = await loadDepartements(signal);
    return depts
      .filter((d) => (d.code ?? "").startsWith(digits))
      .slice(0, 10)
      .map((d) => ({
        id: `dept-${d.code}`,
        label: `${d.code} — ${d.nom ?? ""}`,
        address: "",
        cp: d.code ?? "",
        ville: "",
        type: "department",
      }));
  }

  // 2–4 chiffres : communes du département, filtrées par préfixe CP
  const dept = digits.slice(0, 2);
  const url = new URL(GEO_COMMUNES);
  url.searchParams.set("codeDepartement", dept);
  url.searchParams.set("fields", "nom,code,codesPostaux");
  url.searchParams.set("boost", "population");
  url.searchParams.set("limit", "40");
  const res = await fetch(url.toString(), { signal });
  if (!res.ok) throw new Error(`Geo dept ${res.status}`);
  const data = (await res.json()) as GeoCommune[];

  const out: BanSuggestion[] = [];
  const seen = new Set<string>();
  for (const c of data) {
    for (const s of communeToSuggestions(c, digits)) {
      const key = `${s.cp}|${s.ville}`;
      if (seen.has(key)) continue;
      if (digits.length >= 2 && s.cp && !s.cp.startsWith(digits)) continue;
      seen.add(key);
      out.push(s);
      if (out.length >= 8) return out;
    }
  }
  return out;
}

async function searchAddresses(
  query: string,
  opts: { signal?: AbortSignal; cp?: string; ville?: string; limit?: number },
): Promise<BanSuggestion[]> {
  const raw = query.trim();
  if (!raw) return [];

  let q = raw;
  const ville = opts.ville?.trim();
  if (ville && !q.toLowerCase().includes(ville.toLowerCase())) {
    q = `${q} ${ville}`;
  }

  const url = new URL(BAN_URL);
  url.searchParams.set("q", q);
  url.searchParams.set("limit", String(opts.limit ?? 8));
  url.searchParams.set("autocomplete", "1");

  const cp = (opts.cp ?? "").replace(/\D/g, "");
  if (cp.length === 5) url.searchParams.set("postcode", cp);

  const res = await fetch(url.toString(), { signal: opts.signal });
  if (!res.ok) throw new Error(`BAN ${res.status}`);
  const data = (await res.json()) as { features?: BanFeature[] };
  return mapBanFeatures(data.features ?? [], raw).filter((s) => s.type !== "municipality" || !!s.address);
}

export async function searchBanAddresses(
  query: string,
  opts: {
    limit?: number;
    signal?: AbortSignal;
    kind?: BanSearchKind;
    cp?: string;
    ville?: string;
  } = {},
): Promise<BanSuggestion[]> {
  const kind = opts.kind ?? "address";
  const q = query.trim();
  if (!q) return [];

  if (kind === "city") return searchCities(q, opts.signal);
  if (kind === "postcode") return searchPostcodes(q, opts.signal);
  return searchAddresses(q, opts);
}
