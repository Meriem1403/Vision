import type { DetailTarget, View } from "@/app/detail";

export const VIEW_PATHS: Record<View, string> = {
  dashboard: "/dashboard",
  sci: "/sci",
  biens: "/biens",
  credits: "/credits",
  location: "/location",
  comptabilite: "/comptabilite",
  patrimoine: "/patrimoine",
  alertes: "/alertes",
  dossiers: "/dossiers",
  "portail-banque": "/portail-banque",
  comptes: "/comptes",
};

const PATH_TO_VIEW: Record<string, View> = Object.fromEntries(
  Object.entries(VIEW_PATHS).map(([view, path]) => [path.slice(1), view as View]),
) as Record<string, View>;

export type PortfolioSegment = "investissement" | "residence";

export type AppLocation = {
  view: View;
  detail: DetailTarget | null;
  editing: boolean;
};

/** Construit le chemin d’une vue liste (sans détail). */
export function viewPath(view: View): string {
  return VIEW_PATHS[view];
}

/** Construit le chemin d’une fiche complète. */
export function detailPath(target: DetailTarget, opts?: { editing?: boolean; fromView?: View }): string {
  const edit = opts?.editing ? "/edit" : "";
  switch (target.kind) {
    case "property":
      if (target.section === "credit") {
        if (opts?.fromView === "credits") return `/credits/${target.id}${edit}`;
        return `/biens/${target.id}/credit${edit}`;
      }
      return `/biens/${target.id}${edit}`;
    case "sci":
      return `/sci/${target.id}${edit}`;
    case "tenant":
      return `/location/${target.id}${edit}`;
    case "alert":
      return `/alertes/${target.id}`;
    case "compta":
      return `/comptabilite/${target.sciId}`;
  }
}

/** Parse l’URL courante → vue + fiche + mode édition. */
export function parseAppLocation(pathname: string): AppLocation | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return null;

  const root = parts[0];
  const view = PATH_TO_VIEW[root];
  if (!view) return null;

  if (parts.length === 1) {
    return { view, detail: null, editing: false };
  }

  const id = parts[1];
  if (!id) return { view, detail: null, editing: false };

  if (view === "biens") {
    if (parts[2] === "credit") {
      const editing = parts[3] === "edit";
      return { view, detail: { kind: "property", id, section: "credit" }, editing };
    }
    const editing = parts[2] === "edit";
    return { view, detail: { kind: "property", id, section: "property" }, editing };
  }

  if (view === "credits") {
    const editing = parts[2] === "edit";
    return { view, detail: { kind: "property", id, section: "credit" }, editing };
  }

  if (view === "sci") {
    const editing = parts[2] === "edit";
    return { view, detail: { kind: "sci", id }, editing };
  }

  if (view === "location") {
    const editing = parts[2] === "edit";
    return { view, detail: { kind: "tenant", id }, editing };
  }

  if (view === "alertes") {
    return { view, detail: { kind: "alert", id }, editing: false };
  }

  if (view === "comptabilite") {
    return { view, detail: { kind: "compta", sciId: id }, editing: false };
  }

  return { view, detail: null, editing: false };
}

export function readSegment(search: string): PortfolioSegment {
  const params = new URLSearchParams(search);
  return params.get("segment") === "residence" ? "residence" : "investissement";
}

export function withSearch(path: string, opts?: { segment?: PortfolioSegment; page?: number }): string {
  const params = new URLSearchParams();
  if (opts?.segment === "residence") params.set("segment", "residence");
  if (opts?.page && opts.page > 1) params.set("page", String(opts.page));
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export function readPage(search: string): number {
  const n = Number(new URLSearchParams(search).get("page") ?? "1");
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}
