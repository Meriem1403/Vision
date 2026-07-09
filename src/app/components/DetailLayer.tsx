import { Maximize2 } from "lucide-react";
import { DetailDrawer } from "./DetailDrawer";
import { PropertyDetailContent, CreditDetailContent } from "./PropertyDetail";
import { PropertyDetailPage } from "./PropertyDetailPage";
import {
  SciDetailContent, SciDetailPage,
  TenantDetailContent, TenantDetailPage,
  AlertDetailContent, AlertDetailPage,
  ComptaDetailContent, ComptaDetailPage,
} from "./EntityDetailViews";
import type { DetailTarget, View } from "@/app/detail";
import { FULL_PAGE_BACK } from "@/app/detail";
import type { AlertItem, Property, SCI, Tenant } from "./entityTypes";

const sciOf = (p: Property, scis: SCI[]) => scis.find((s) => s.id === p.sciId) ?? scis[0];

function drawerMeta(target: DetailTarget, ctx: {
  properties: Property[];
  scis: SCI[];
  tenants: Tenant[];
  alerts: AlertItem[];
}): { title: string; subtitle?: string } {
  const { properties, scis, tenants, alerts } = ctx;
  switch (target.kind) {
    case "property": {
      const p = properties.find((x) => x.id === target.id);
      const sci = p ? sciOf(p, scis) : null;
      if (target.section === "credit" && p?.credit) return { title: p.credit.banque, subtitle: `${p.ville} · ${sci?.shortName ?? ""}` };
      return { title: p?.address ?? "", subtitle: p ? `${p.ville} · ${sci?.shortName ?? ""}` : undefined };
    }
    case "sci": {
      const s = scis.find((x) => x.id === target.id);
      return { title: s?.name ?? "", subtitle: s ? `${s.type} · ${s.creation}` : undefined };
    }
    case "tenant": {
      const t = tenants.find((x) => x.id === target.id);
      const p = t ? properties.find((x) => x.id === t.propertyId) : null;
      return { title: t?.nom ?? "", subtitle: p ? `${p.address}, ${p.ville}` : undefined };
    }
    case "alert": {
      const a = alerts.find((x) => x.id === target.id);
      return { title: a?.title ?? "", subtitle: a?.detail };
    }
    case "compta": {
      const s = scis.find((x) => x.id === target.sciId);
      return { title: `Comptabilité · ${s?.shortName ?? ""}`, subtitle: s?.name };
    }
  }
}

function DrawerBody({ target, ctx, onPropertyCredit, onOpenFullPage }: {
  target: DetailTarget;
  ctx: { properties: Property[]; scis: SCI[]; tenants: Tenant[]; alerts: AlertItem[] };
  onPropertyCredit?: () => void;
  onOpenFullPage: () => void;
}) {
  const { properties, scis, tenants, alerts } = ctx;
  switch (target.kind) {
    case "property": {
      const p = properties.find((x) => x.id === target.id);
      const sci = p ? sciOf(p, scis) : null;
      if (!p || !sci) return null;
      if (target.section === "credit" && p.credit) {
        return <CreditDetailContent credit={p.credit} property={p} sciName={sci.shortName} sciColor={sci.color} />;
      }
      return (
        <PropertyDetailContent
          property={p}
          sciName={sci.shortName}
          sciColor={sci.color}
          onViewCredit={p.credit ? onPropertyCredit : undefined}
        />
      );
    }
    case "sci": {
      const s = scis.find((x) => x.id === target.id);
      if (!s) return null;
      return <SciDetailContent sci={s} properties={properties} />;
    }
    case "tenant": {
      const t = tenants.find((x) => x.id === target.id);
      if (!t) return null;
      const p = properties.find((x) => x.id === t.propertyId);
      const sci = p ? sciOf(p, scis) : scis[0];
      return <TenantDetailContent tenant={t} property={p} sci={sci} />;
    }
    case "alert": {
      const a = alerts.find((x) => x.id === target.id);
      if (!a) return null;
      return <AlertDetailContent alert={a} />;
    }
    case "compta": {
      const s = scis.find((x) => x.id === target.sciId);
      if (!s) return null;
      return <ComptaDetailContent sci={s} properties={properties} />;
    }
  }
}

export function FullPageDetail({ target, view, ctx, section, onSectionChange, onBack, onOpenProperty }: {
  target: DetailTarget;
  view: View;
  ctx: { properties: Property[]; scis: SCI[]; tenants: Tenant[]; alerts: AlertItem[] };
  section: "property" | "credit";
  onSectionChange: (s: "property" | "credit") => void;
  onBack: () => void;
  onOpenProperty?: (id: string) => void;
}) {
  const backLabel = FULL_PAGE_BACK[view];
  const { properties, scis, tenants, alerts } = ctx;

  switch (target.kind) {
    case "property": {
      const p = properties.find((x) => x.id === target.id);
      const sci = p ? sciOf(p, scis) : null;
      if (!p || !sci) return null;
      return (
        <PropertyDetailPage
          property={p}
          sciName={sci.shortName}
          sciColor={sci.color}
          section={target.section ?? section}
          onSectionChange={onSectionChange}
          onBack={onBack}
          backLabel={backLabel}
        />
      );
    }
    case "sci": {
      const s = scis.find((x) => x.id === target.id);
      if (!s) return null;
      return <SciDetailPage sci={s} properties={properties} backLabel={backLabel} onBack={onBack} onSelectProperty={onOpenProperty} />;
    }
    case "tenant": {
      const t = tenants.find((x) => x.id === target.id);
      if (!t) return null;
      const p = properties.find((x) => x.id === t.propertyId);
      const sci = p ? sciOf(p, scis) : scis[0];
      return <TenantDetailPage tenant={t} property={p} sci={sci} backLabel={backLabel} onBack={onBack} />;
    }
    case "alert": {
      const a = alerts.find((x) => x.id === target.id);
      if (!a) return null;
      return <AlertDetailPage alert={a} backLabel={backLabel} onBack={onBack} />;
    }
    case "compta": {
      const s = scis.find((x) => x.id === target.sciId);
      if (!s) return null;
      return <ComptaDetailPage sci={s} properties={properties} backLabel={backLabel} onBack={onBack} />;
    }
  }
}

export function AppDetailDrawer({ drawerTarget, fullPageTarget, view, ctx, onClose, onOpenFullPage, onPropertyCredit }: {
  drawerTarget: DetailTarget | null;
  fullPageTarget: DetailTarget | null;
  view: View;
  ctx: { properties: Property[]; scis: SCI[]; tenants: Tenant[]; alerts: AlertItem[] };
  onClose: () => void;
  onOpenFullPage: (target: DetailTarget) => void;
  onPropertyCredit: () => void;
}) {
  if (!drawerTarget || fullPageTarget) return null;
  const meta = drawerMeta(drawerTarget, ctx);
  return (
    <DetailDrawer
      open
      title={meta.title}
      subtitle={meta.subtitle}
      onClose={onClose}
      actions={
        <button
          type="button"
          onClick={() => onOpenFullPage(drawerTarget)}
          className="inline-flex items-center gap-1.5 bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-400/25 rounded-xl px-3 py-2 text-xs font-semibold transition-all"
          title="Ouvrir en pleine page"
        >
          <Maximize2 size={13} />
          <span className="hidden sm:inline">Page complète</span>
        </button>
      }
    >
      <DrawerBody target={drawerTarget} ctx={ctx} onPropertyCredit={onPropertyCredit} onOpenFullPage={() => onOpenFullPage(drawerTarget)} />
    </DetailDrawer>
  );
}

export function fullPageHeaderTitle(target: DetailTarget | null, ctx: { properties: Property[]; scis: SCI[]; tenants: Tenant[]; alerts: AlertItem[] }, fallback: string): string {
  if (!target) return fallback;
  return drawerMeta(target, ctx).title || fallback;
}

export function fullPageHeaderSubtitle(target: DetailTarget | null, view: View, ctx: { properties: Property[]; scis: SCI[]; tenants: Tenant[]; alerts: AlertItem[] }): string {
  if (!target) return "";
  const meta = drawerMeta(target, ctx);
  const labels: Record<DetailTarget["kind"], string> = {
    property: "Fiche bien",
    sci: "Fiche SCI",
    tenant: "Fiche locataire",
    alert: "Alerte",
    compta: "Comptabilité",
  };
  return `${labels[target.kind]}${meta.subtitle ? ` · ${meta.subtitle.split("·")[0]?.trim() ?? ""}` : ""}`;
}
