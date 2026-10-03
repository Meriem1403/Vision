import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router";
import { toast, Toaster } from "sonner";
import { formatBailDate, leaseProgressPct, syncTenantBailTs } from "@/lib/bailDates";
import { creationToInputValue, formatCreationDisplay } from "@/lib/creationDate";
import { computeLoanSummary, enrichCredit, patchCreditField } from "@/lib/loanCalculator";
import { cashFlowMensuel, honorairesGestionMensuel } from "@/lib/propertyFinance";
import { computePortfolioYield, formatYieldPct } from "@/lib/propertyYield";
import { api, isApiAvailable } from "@/lib/api";
import {
  detailPath, parseAppLocation, readSegment, viewPath, withSearch,
  type PortfolioSegment,
} from "@/lib/routes";
import { AddressAutocomplete } from "@/app/components/AddressAutocomplete";
import { AssocieField } from "@/app/components/AssocieField";
import { BanqueField } from "@/app/components/BanqueField";
import { resolveAssocieName, sameAssocieName } from "@/lib/associates";
import { FilterEmpty, FilterSelect, FiltersPanel, SearchBar, matchesSearch } from "@/app/components/ListFilters";
import { PaginationBar, useCardsGridPageSize, useDuoGridPageSize, usePagination } from "@/app/components/Pagination";
import { TamPdfImportButton } from "@/app/components/TamPdfImport";
import { useNumberStepperHandlers } from "@/app/components/numberStepper";
import type { TamImportResult } from "@/lib/tamPdfImport";
import { resolveBankName } from "@/lib/banks";
import {
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  LayoutDashboard, Building2, Home, CreditCard, Users, FileText,
  TrendingUp, Bell, Plus, ArrowUpRight, ArrowDownRight, Pencil,
  Trash2, Check, X, ChevronLeft, Phone, Mail, MapPin, Calendar,
  Shield, Key, AlertTriangle, Euro, BarChart2, Menu, LayoutGrid,
  List, Eye, ChevronDown, ChevronUp, Maximize2, Palette, LogOut, Banknote, Landmark, UserCog,
} from "lucide-react";
import { AppDetailDrawer, FullPageDetail, fullPageHeaderTitle, fullPageHeaderSubtitle } from "@/app/components/DetailLayer";
import type { DetailTarget } from "@/app/detail";
import { LoginPage } from "@/app/components/LoginPage";
import { BankDossierView } from "@/app/components/BankDossierView";
import { BankPortalView } from "@/app/components/BankPortalView";
import { BrandLogo } from "@/app/components/BrandLogo";
import { ThemeSettings, ThemeSettingsModal } from "@/app/components/ThemeSettings";
import { UsersAdminView } from "@/app/components/UsersAdminView";
import { VisionPatrimoinePanel } from "@/app/components/VisionPatrimoine";
import {
  pageWrap, formWrap, cardsGrid, G, GE, inp, lbl, btnP, btnG, btnD, btnS, selectCls,
} from "@/app/components/layout";
import { ChartTooltipContent, chartAxisTick, chartGridStroke } from "@/app/components/ChartTooltip";
import { MetricLabel } from "@/app/components/MetricWithFormula";
import { TooltipProvider } from "@/app/components/ui/tooltip";
import type { AuthUser } from "@/lib/auth";
import { clearSession, getStoredUser, greetingLabel, roleLabel, storeUser } from "@/lib/auth";
import {
  canAccessView, canManageData, defaultViewForRole, filterProperties, filterScisWithProperties,
  associeShareRatio, PAGE_TITLES, type View,
} from "@/lib/permissions";
import {
  filterInvestmentEntities,
  filterPropertiesByEntities,
  filterResidenceEntities,
  isResidenceEntity,
} from "@/lib/portfolioSegments";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import {
  deleteAlert as sbDeleteAlert,
  deleteProperty as sbDeleteProperty,
  deleteSci as sbDeleteSci,
  deleteTenant as sbDeleteTenant,
  fetchPortfolio,
  supabaseGetSessionUser,
  supabaseLogout,
  upsertProperty as sbUpsertProperty,
  upsertSci as sbUpsertSci,
  upsertTenant as sbUpsertTenant,
} from "@/lib/supabaseRepo";
import {
  applyVisionTheme, loadThemeId, loadCustomColors, getPresetVars, customToVars,
  type CustomThemeColors,
} from "@/lib/visionTheme";

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface Associe { name: string; parts: number }
interface Credit { banque: string; montantInitial: number; taux: number; duree: number; debut: string; assuranceMensuelle?: number; mensualite: number; capitalRestant: number; finCredit?: string | null }
interface Property { id: string; sciId: string; address: string; ville: string; cp: string; type: string; surface: number; lots: number; prixAchat: number; travaux: number; fraisNotaire: number; valeurActuelle: number; loyer: number; taxeFonciere: number; assurance: number; gestionDeleguee?: boolean; honorairesGestionPct?: number; credit?: Credit }
interface SCI { id: string; name: string; shortName: string; type: "IR" | "IS" | "RP"; creation: string; valeurEstimee: number; associes: Associe[]; color: string; gradient: string }
interface Tenant { id: string; propertyId: string; nom: string; initiales: string; tel: string; email: string; debutBail: string; finBail: string; debutTs: number; finTs: number; loyer: number; charges: number; statut: "En cours" | "Impayé" | "Terminé" }
interface AlertItem { id: string; type: "bail" | "credit" | "taxe" | "assurance" | "info"; title: string; detail: string; severity: "high" | "medium" | "low" }
type CrudMode = "list" | "create" | "edit";

// ─── DATA ────────────────────────────────────────────────────────────────────

const SCIS_INIT: SCI[] = [
  { id: "beneduc", name: "SCI IR BENEDUC", shortName: "BENEDUC", type: "IR", creation: "Janv. 2017", valeurEstimee: 380000, color: "#60a5fa", gradient: "from-blue-500/20 to-transparent", associes: [{ name: "Johann Faraut", parts: 50 }, { name: "Alexandre Niel", parts: 50 }] },
  { id: "troika", name: "SCI IR TROIKA", shortName: "TROIKA", type: "IR", creation: "Juin 2017", valeurEstimee: 1265000, color: "#a78bfa", gradient: "from-violet-500/20 to-transparent", associes: [{ name: "Johann Faraut", parts: 33 }, { name: "Alexandre Niel", parts: 67 }] },
  { id: "lavista", name: "SCI IS LA VISTA", shortName: "LA VISTA", type: "IS", creation: "Mars 2020", valeurEstimee: 390000, color: "#22d3ee", gradient: "from-cyan-500/20 to-transparent", associes: [{ name: "Johann Faraut", parts: 33 }, { name: "Alexandre Niel", parts: 67 }] },
  { id: "rp", name: "Résidence Principale", shortName: "RP", type: "RP", creation: "Mai 2019", valeurEstimee: 630000, color: "#34d399", gradient: "from-emerald-500/20 to-transparent", associes: [{ name: "Johann Faraut", parts: 66 }, { name: "Alexandre Niel", parts: 34 }] },
];
const PROPS_INIT: Property[] = [
  { id: "p1", sciId: "beneduc", address: "14 Rue Séry", ville: "Lille", cp: "59000", type: "T2", surface: 45, lots: 1, prixAchat: 80000, travaux: 12000, fraisNotaire: 6500, valeurActuelle: 130000, loyer: 620, taxeFonciere: 850, assurance: 540, credit: { banque: "Crédit Agricole", montantInitial: 70000, taux: 1.80, duree: 180, mensualite: 440, debut: "2018-03-01", capitalRestant: 32000 } },
  { id: "p2", sciId: "beneduc", address: "8 Rue Danton", ville: "Roubaix", cp: "59100", type: "T1", surface: 32, lots: 1, prixAchat: 65000, travaux: 8000, fraisNotaire: 5200, valeurActuelle: 110000, loyer: 490, taxeFonciere: 620, assurance: 456, credit: { banque: "BNP Paribas", montantInitial: 58000, taux: 2.10, duree: 180, mensualite: 370, debut: "2019-06-01", capitalRestant: 28500 } },
  { id: "p3", sciId: "beneduc", address: "22 Rue Victor Hugo", ville: "Tourcoing", cp: "59200", type: "Immeuble", surface: 180, lots: 4, prixAchat: 180000, travaux: 45000, fraisNotaire: 14000, valeurActuelle: 140000, loyer: 2200, taxeFonciere: 2100, assurance: 1200, credit: { banque: "Société Générale", montantInitial: 160000, taux: 2.40, duree: 240, mensualite: 900, debut: "2020-01-01", capitalRestant: 128000 } },
  { id: "p4", sciId: "troika", address: "45 Av. de la République", ville: "Lyon", cp: "69003", type: "T3", surface: 72, lots: 1, prixAchat: 195000, travaux: 18000, fraisNotaire: 15000, valeurActuelle: 280000, loyer: 1100, taxeFonciere: 1400, assurance: 1020, credit: { banque: "LCL", montantInitial: 175000, taux: 1.60, duree: 300, mensualite: 680, debut: "2017-09-01", capitalRestant: 118000 } },
  { id: "p5", sciId: "troika", address: "12 Rue du Commerce", ville: "Lyon", cp: "69002", type: "Local commercial", surface: 95, lots: 1, prixAchat: 320000, travaux: 35000, fraisNotaire: 25000, valeurActuelle: 420000, loyer: 2800, taxeFonciere: 3200, assurance: 2280, credit: { banque: "CIC", montantInitial: 290000, taux: 2.00, duree: 240, mensualite: 1450, debut: "2018-11-01", capitalRestant: 198000 } },
  { id: "p6", sciId: "troika", address: "7 Imp. des Tilleuls", ville: "Villeurbanne", cp: "69100", type: "T2", surface: 48, lots: 1, prixAchat: 142000, travaux: 9000, fraisNotaire: 11000, valeurActuelle: 195000, loyer: 780, taxeFonciere: 980, assurance: 720, credit: { banque: "Crédit Mutuel", montantInitial: 128000, taux: 1.90, duree: 240, mensualite: 620, debut: "2019-04-01", capitalRestant: 89000 } },
  { id: "p7", sciId: "troika", address: "33 Bd Gambetta", ville: "Caluire-et-Cuire", cp: "69300", type: "Immeuble", surface: 320, lots: 6, prixAchat: 420000, travaux: 80000, fraisNotaire: 33000, valeurActuelle: 370000, loyer: 4200, taxeFonciere: 4800, assurance: 3840, credit: { banque: "Banque Populaire", montantInitial: 380000, taux: 2.20, duree: 300, mensualite: 1780, debut: "2021-02-01", capitalRestant: 335000 } },
  { id: "p8", sciId: "lavista", address: "18 Rue de la Paix", ville: "Marseille", cp: "13001", type: "T4", surface: 98, lots: 1, prixAchat: 220000, travaux: 25000, fraisNotaire: 17000, valeurActuelle: 265000, loyer: 1250, taxeFonciere: 1650, assurance: 1500, credit: { banque: "BRED", montantInitial: 198000, taux: 2.30, duree: 240, mensualite: 990, debut: "2020-07-01", capitalRestant: 158000 } },
  { id: "p9", sciId: "lavista", address: "5 Rue Paradis", ville: "Marseille", cp: "13006", type: "T2", surface: 55, lots: 1, prixAchat: 145000, travaux: 12000, fraisNotaire: 11000, valeurActuelle: 125000, loyer: 820, taxeFonciere: 890, assurance: 984, credit: { banque: "Caisse d'Épargne", montantInitial: 130000, taux: 2.60, duree: 240, mensualite: 680, debut: "2021-10-01", capitalRestant: 118000 } },
  { id: "p10", sciId: "rp", address: "24 Allée des Roses", ville: "Lyon", cp: "69006", type: "Maison", surface: 165, lots: 1, prixAchat: 480000, travaux: 0, fraisNotaire: 34000, valeurActuelle: 630000, loyer: 0, taxeFonciere: 2800, assurance: 2160, credit: { banque: "LCL", montantInitial: 430000, taux: 1.35, duree: 360, mensualite: 1380, debut: "2019-05-01", capitalRestant: 368000 } },
];
const TENANTS_INIT: Tenant[] = [
  { id: "t1", propertyId: "p1", nom: "Sophie Martin", initiales: "SM", tel: "06 12 34 56 78", email: "sophie.martin@gmail.com", debutBail: "01/09/2021", finBail: "31/08/2024", debutTs: 1630454400000, finTs: 1725062400000, loyer: 620, charges: 50, statut: "En cours" },
  { id: "t2", propertyId: "p2", nom: "Karim Benzali", initiales: "KB", tel: "06 87 65 43 21", email: "k.benzali@outlook.fr", debutBail: "15/03/2022", finBail: "14/03/2025", debutTs: 1647302400000, finTs: 1741910400000, loyer: 490, charges: 30, statut: "Impayé" },
  { id: "t3", propertyId: "p4", nom: "Claire Dupont", initiales: "CD", tel: "07 11 22 33 44", email: "claire.d@gmail.com", debutBail: "01/07/2023", finBail: "30/06/2026", debutTs: 1688169600000, finTs: 1782086400000, loyer: 1100, charges: 80, statut: "En cours" },
  { id: "t4", propertyId: "p5", nom: "SARL Tech Express", initiales: "TE", tel: "04 72 88 99 00", email: "contact@techexpress.fr", debutBail: "01/01/2022", finBail: "31/12/2027", debutTs: 1640995200000, finTs: 1830297600000, loyer: 2800, charges: 0, statut: "En cours" },
  { id: "t5", propertyId: "p6", nom: "Marc Leroy", initiales: "ML", tel: "06 55 44 33 22", email: "marc.leroy@free.fr", debutBail: "01/01/2023", finBail: "31/12/2025", debutTs: 1672531200000, finTs: 1767225600000, loyer: 780, charges: 60, statut: "En cours" },
  { id: "t6", propertyId: "p8", nom: "Nathalie Petit", initiales: "NP", tel: "06 99 88 77 66", email: "npetit@wanadoo.fr", debutBail: "01/08/2024", finBail: "31/07/2027", debutTs: 1722470400000, finTs: 1816041600000, loyer: 1250, charges: 100, statut: "En cours" },
  { id: "t7", propertyId: "p9", nom: "Antoine Garcia", initiales: "AG", tel: "07 33 44 55 66", email: "a.garcia@yahoo.fr", debutBail: "01/11/2022", finBail: "31/10/2025", debutTs: 1667260800000, finTs: 1761868800000, loyer: 820, charges: 70, statut: "En cours" },
];
const ALERTS_INIT: AlertItem[] = [
  { id: "a1", type: "info", title: "Loyer impayé", detail: "Karim Benzali · 8 Rue Danton, Roubaix · Juillet 2026", severity: "high" },
  { id: "a2", type: "bail", title: "Bail arrivant à échéance", detail: "Sophie Martin · 14 Rue Séry, Lille · Fin 31/08/2024", severity: "high" },
  { id: "a3", type: "credit", title: "Fin de prêt dans 8 mois", detail: "Crédit Agricole · 14 Rue Séry, Lille · Mars 2025", severity: "high" },
  { id: "a4", type: "credit", title: "Fin de prêt dans 11 mois", detail: "BNP Paribas · 8 Rue Danton, Roubaix · Juin 2025", severity: "medium" },
  { id: "a5", type: "taxe", title: "Taxe foncière à régler", detail: "SCI TROIKA · 45 Av. de la République · Octobre 2026", severity: "medium" },
  { id: "a6", type: "assurance", title: "Assurance à renouveler", detail: "SCI BENEDUC · Immeuble Victor Hugo, Tourcoing · Déc. 2026", severity: "low" },
];
const PATRIMOINE_DATA = [
  { an: "2017", valeur: 580, dette: 415, net: 165 }, { an: "2018", valeur: 850, dette: 630, net: 220 },
  { an: "2019", valeur: 1320, dette: 1010, net: 310 }, { an: "2020", valeur: 1870, dette: 1240, net: 630 },
  { an: "2021", valeur: 2120, dette: 1100, net: 1020 }, { an: "2022", valeur: 2380, dette: 980, net: 1400 },
  { an: "2023", valeur: 2510, dette: 900, net: 1610 }, { an: "2024", valeur: 2665, dette: 848, net: 1817 },
];

// ─── UTILS ───────────────────────────────────────────────────────────────────

const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
const uid = () => `id_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const cashFlow = (p: Property) => cashFlowMensuel(p, false);
const finCredit = (c: Credit) => {
  if (c.finCredit) {
    const d = new Date(c.finCredit);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    }
  }
  if (!c.debut || !c.duree) return "—";
  const summary = computeLoanSummary({ montantInitial: c.montantInitial, tauxAnnuel: c.taux, dureeMois: c.duree, dateDebut: c.debut, assuranceMensuelle: c.assuranceMensuelle });
  return summary.finCredit.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
};

function LoanCalcSummary({ credit }: { credit: Pick<Credit, "montantInitial" | "taux" | "duree" | "debut" | "assuranceMensuelle"> }) {
  const summary = useMemo(() => {
    if (!credit.montantInitial || !credit.duree || !credit.debut) return null;
    return computeLoanSummary({
      montantInitial: credit.montantInitial,
      tauxAnnuel: credit.taux,
      dureeMois: credit.duree,
      dateDebut: credit.debut,
      assuranceMensuelle: credit.assuranceMensuelle,
    });
  }, [credit.montantInitial, credit.taux, credit.duree, credit.debut, credit.assuranceMensuelle]);

  if (!summary) return null;

  return (
    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 sm:gap-3 w-full">
      {[
        { l: "Mensualité crédit", v: fmt(summary.mensualite), c: "var(--v-violet-text)" },
        { l: "Mensualité totale", v: fmt(summary.mensualiteTotale), c: "var(--v-info-text)" },
        { l: "Capital restant", v: fmt(summary.capitalRestant), c: "var(--v-negative-text)" },
        { l: "Intérêts totaux", v: fmt(summary.totalInterets), c: "var(--v-warning-text)" },
        { l: "Remboursé", v: `${summary.pctRembourse} %`, c: "var(--v-positive-text)" },
        { l: "Fin de prêt", v: summary.finCredit.toLocaleDateString("fr-FR", { month: "short", year: "numeric" }), c: "var(--v-text-muted)" },
      ].map((m) => (
        <div key={m.l} className="vision-surface rounded-xl p-3">
          <MetricLabel label={m.l} />
          <p className="text-xs font-bold font-mono" style={{ color: m.c }}>{m.v}</p>
        </div>
      ))}
    </div>
  );
}
const FALLBACK_SCI: SCI = {
  id: "_fallback", name: "Entité", shortName: "—", type: "IR", creation: "", valeurEstimee: 0,
  associes: [], color: "#60a5fa", gradient: "from-blue-500/20 to-transparent",
};
const sciOf = (p: Property, scis: SCI[]) => scis.find((s) => s.id === p.sciId) ?? scis[0] ?? FALLBACK_SCI;
const leasePct = (t: Tenant) => leaseProgressPct(t);

// ─── MOTION ──────────────────────────────────────────────────────────────────

const ease = [0.22, 1, 0.36, 1] as const;
const pageV = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.32, ease } }, exit: { opacity: 0, y: -10, transition: { duration: 0.18 } } };
const gridV = { hidden: {}, show: { transition: { staggerChildren: 0.055, delayChildren: 0.04 } } };
const itemV = { hidden: { opacity: 0, y: 18, scale: 0.97 }, show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.38, ease } } };
const rowV = { hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0, transition: { duration: 0.3, ease } } };
const slideV = { hidden: { opacity: 0, height: 0 }, show: { opacity: 1, height: "auto", transition: { duration: 0.28, ease } }, exit: { opacity: 0, height: 0, transition: { duration: 0.18 } } };

// ─── PRIMITIVES ───────────────────────────────────────────────────────────────

/** Badge KPI inline (évite w-full de `G` qui empile les cartes). */
const kpiBadge = "vision-glass backdrop-blur-xl rounded-2xl px-4 py-3 w-auto shrink-0 min-w-0";

function GI({ label, className = "", type, onChange, value, ...p }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; className?: string }) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const isDate = type === "date" || type === "datetime-local" || type === "month";
  const isNumber = type === "number";

  const emitNumber = (next: number) => {
    if (!onChange) return;
    const str = String(next);
    onChange({
      target: { value: str, name: p.name, type: "number" },
      currentTarget: { value: str, name: p.name, type: "number" },
    } as React.ChangeEvent<HTMLInputElement>);
  };

  const getNumberValue = () =>
    Number(value === "" || value === undefined ? inputRef.current?.value : value) || 0;

  const upHandlers = useNumberStepperHandlers({
    dir: 1,
    step: p.step,
    min: p.min,
    max: p.max,
    getValue: getNumberValue,
    emit: emitNumber,
  });
  const downHandlers = useNumberStepperHandlers({
    dir: -1,
    step: p.step,
    min: p.min,
    max: p.max,
    getValue: getNumberValue,
    emit: emitNumber,
  });

  return (
    <div className={className}>
      {label && <label className={lbl}>{label}</label>}
      <div className="relative w-full min-w-0">
        <input
          ref={inputRef}
          type={type}
          className={`${inp} vision-input-controlled ${isDate || isNumber ? "pr-10" : ""}`}
          {...p}
          value={value}
          onChange={onChange}
        />
        {isDate && (
          <span
            aria-hidden
            className="vision-field-icon pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-7 h-7 rounded-md z-[1]"
          >
            <Calendar size={16} strokeWidth={2} />
          </span>
        )}
        {isNumber && (
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
            <button
              type="button"
              tabIndex={-1}
              aria-label="Augmenter"
              className="vision-field-icon inline-flex items-center justify-center w-6 h-3.5 rounded select-none touch-none"
              {...upHandlers}
            >
              <ChevronUp size={14} strokeWidth={2.25} />
            </button>
            <button
              type="button"
              tabIndex={-1}
              aria-label="Diminuer"
              className="vision-field-icon inline-flex items-center justify-center w-6 h-3.5 rounded select-none touch-none"
              {...downHandlers}
            >
              <ChevronDown size={14} strokeWidth={2.25} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
function GS({ label, options, className = "", id, ...p }: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; options: { value: string; label: string }[]; className?: string }) {
  const selectId = id ?? (label ? `gs-${label.replace(/\s+/g, "-").toLowerCase()}` : undefined);
  return (
    <div className={`min-w-0 ${className}`}>
      {label && <label htmlFor={selectId} className={lbl}>{label}</label>}
      <div className="relative w-full">
        <select id={selectId} className={selectCls} {...p}>
          {options.map((o) => <option key={o.value} value={o.value} className="vision-input vision-text">{o.label}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5" style={{ color: "var(--v-accent-text)" }} aria-hidden />
      </div>
    </div>
  );
}
function GSec({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className={`${G} p-5`}><p className={`${lbl} mb-4`}>{title}</p>{children}</div>;
}
function CashChip({ value }: { value: number }) {
  const pos = value >= 0;
  return <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${pos ? "bg-emerald-400/14 vision-positive-text border border-emerald-400/20" : "bg-red-400/14 vision-negative-text border border-red-400/20"}`}>{pos ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}{pos ? "+" : ""}{fmt(value)}</span>;
}
function SCIChip({ sci }: { sci: SCI }) {
  return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-bold border" style={{ color: sci.color, borderColor: `${sci.color}28`, backgroundColor: `${sci.color}14` }}><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sci.color }} />{sci.shortName}</span>;
}
function Ava({ initiales, color, size = 36 }: { initiales: string; color: string; size?: number }) {
  return <div className="rounded-xl flex items-center justify-center font-bold flex-shrink-0" style={{ width: size, height: size, backgroundColor: `${color}28`, border: `1px solid ${color}38`, color, fontSize: size * 0.33 }}>{initiales}</div>;
}
function Ring({ pct, color, size = 64 }: { pct: number; color: string; size?: number }) {
  const r = (size - 10) / 2; const c = 2 * Math.PI * r; const off = c * (1 - Math.min(pct, 100) / 100);
  return <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--v-surface-strong)" strokeWidth={7} /><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={7} strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.8s ease" }} /></svg>;
}
function GBar({ pct, color }: { pct: number; color: string }) {
  return <div className="w-full h-1.5 vision-surface rounded-full overflow-hidden"><motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${Math.min(pct, 100)}%` }} transition={{ duration: 0.7, delay: 0.15, ease }} style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}55` }} /></div>;
}
function FormHdr({ title, onBack, onDelete, onSave, isEdit }: {
  title: string;
  onBack: () => void;
  onDelete?: () => void | Promise<void>;
  onSave: () => void | Promise<void>;
  isEdit: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => void | Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={`${G} px-4 py-4 flex flex-wrap gap-3 items-center justify-between mb-6`}>
      <div className="flex items-center gap-3 min-w-0">
        <button type="button" onClick={onBack} disabled={busy} className={btnG}>
          <ChevronLeft size={14} /><span className="hidden sm:inline">Retour</span>
        </button>
        <p className="vision-text font-semibold text-sm truncate">{title}</p>
      </div>
      <div className="flex items-center gap-2">
        {isEdit && onDelete && (
          <button type="button" disabled={busy} onClick={() => run(onDelete)} className={btnD}>
            <Trash2 size={13} /><span className="hidden sm:inline">Supprimer</span>
          </button>
        )}
        <button type="button" disabled={busy} onClick={() => run(onSave)} className={btnS}>
          <Check size={13} />{busy ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer"}
        </button>
      </div>
    </div>
  );
}
function DelConfirm({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <motion.div variants={slideV} initial="hidden" animate="show" exit="exit" className="overflow-hidden">
      <div className="flex items-center gap-2 pt-3 mt-3 border-t border-[var(--v-border-subtle)]">
        <p className="text-xs vision-negative-text flex-1">Confirmer la suppression ?</p>
        <button onClick={onConfirm} className="px-3 py-1.5 bg-red-500/80 hover:bg-red-400/80 vision-text text-xs font-bold rounded-lg transition-colors"><Check size={11} /></button>
        <button onClick={onCancel} className="px-3 py-1.5 vision-surface-strong hover:vision-surface-strong vision-text-muted text-xs rounded-lg transition-colors"><X size={11} /></button>
      </div>
    </motion.div>
  );
}

// ─── PORTEFEUILLE : INVESTISSEMENT vs RÉSIDENCE PRINCIPALE ───────────────────

const SEGMENT_VIEWS: View[] = ["dashboard", "sci", "biens", "credits", "location", "comptabilite", "patrimoine"];

function PortfolioSegmentTabs({
  segment,
  onChange,
  investCount,
  rpCount,
}: {
  segment: PortfolioSegment;
  onChange: (s: PortfolioSegment) => void;
  investCount: number;
  rpCount: number;
}) {
  return (
    <div className={`${G} flex w-full sm:w-auto p-1 gap-1 mb-4 md:mb-5`}>
      <button
        type="button"
        onClick={() => onChange("investissement")}
        className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all ${segment === "investissement" ? "vision-chip-active" : "vision-text-muted hover:vision-text"}`}
      >
        <TrendingUp size={14} />
        Investissement
        <span className="text-xs opacity-70 font-mono">{investCount}</span>
      </button>
      <button
        type="button"
        onClick={() => onChange("residence")}
        className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all ${segment === "residence" ? "vision-chip-active" : "vision-text-muted hover:vision-text"}`}
      >
        <Home size={14} />
        Résidence principale
        <span className="text-xs opacity-70 font-mono">{rpCount}</span>
      </button>
    </div>
  );
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────

function normPerson(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Quote-part = compte connecté (shareholder_name ou name), uniquement s'il existe dans les SCI. */
function personalShareName(user: AuthUser | null | undefined, scis: SCI[]): string | null {
  if (!user || user.role === "BANQUE") return null;
  const known = [...new Set(scis.flatMap((s) => s.associes.map((a) => a.name)))];
  const candidates = [user.shareholderName, user.name].filter(Boolean) as string[];
  for (const c of candidates) {
    const match = known.find((k) => normPerson(k) === normPerson(c));
    if (match) return match;
  }
  return null;
}

function sciShareRatio(sci: SCI, shareholderName: string): number {
  return associeShareRatio(sci, shareholderName);
}

function DashboardView({
  properties, scis, onSelectProperty, user,
}: {
  properties: Property[];
  scis: SCI[];
  onSelectProperty: (id: string) => void;
  user?: AuthUser | null;
}) {
  // Filet de sécurité : la RP ne doit jamais entrer dans les KPI investissement
  const investScis = useMemo(() => filterInvestmentEntities(scis), [scis]);
  const investProperties = useMemo(
    () => filterPropertiesByEntities(properties, investScis),
    [properties, investScis],
  );
  const isResidenceSegment = scis.length > 0 && scis.every((s) => isResidenceEntity(s));
  const scopeScis = isResidenceSegment ? scis : investScis;
  const scopeProperties = isResidenceSegment ? properties : investProperties;

  const shareName = personalShareName(user, scopeScis);

  const totalBrut = scopeScis.reduce((s, x) => s + x.valeurEstimee, 0);
  const totalDette = scopeProperties.reduce((s, p) => s + (p.credit?.capitalRestant ?? 0), 0);
  const loyers = scopeProperties.reduce((s, p) => s + p.loyer * 12, 0);
  const chargesAnnuelles = scopeProperties.reduce(
    (s, p) => s + (p.taxeFonciere || 0) + (p.assurance || 0) + honorairesGestionMensuel(p) * 12,
    0,
  );
  const cf = scopeProperties.reduce((s, p) => s + cashFlow(p), 0);
  const yieldPct = computePortfolioYield({ loyersAnnuels: loyers, chargesAnnuelles, patrimoineBrut: totalBrut });

  const personal = shareName && !isResidenceSegment
    ? investScis.reduce(
        (acc, sci) => {
          const ratio = sciShareRatio(sci, shareName);
          const props = investProperties.filter((p) => p.sciId === sci.id);
          const dette = props.reduce((s, p) => s + (p.credit?.capitalRestant ?? 0), 0);
          const mens = props.reduce((s, p) => s + (p.credit?.mensualite ?? 0), 0);
          const cash = props.reduce((s, p) => s + cashFlow(p), 0);
          const loy = props.reduce((s, p) => s + p.loyer * 12, 0);
          const charges = props.reduce(
            (s, p) => s + (p.taxeFonciere || 0) + (p.assurance || 0) + honorairesGestionMensuel(p) * 12,
            0,
          );
          acc.brut += sci.valeurEstimee * ratio;
          acc.dette += dette * ratio;
          acc.mensualites += mens * ratio;
          acc.cash += cash * ratio;
          acc.loyers += loy * ratio;
          acc.charges += charges * ratio;
          return acc;
        },
        { brut: 0, dette: 0, mensualites: 0, cash: 0, loyers: 0, charges: 0 },
      )
    : null;

  const personalYield = personal
    ? computePortfolioYield({
        loyersAnnuels: personal.loyers,
        chargesAnnuelles: personal.charges,
        patrimoineBrut: personal.brut,
      })
    : null;

  const kpis = [
    { l: "Patrimoine brut", v: fmt(totalBrut), color: "#60a5fa", Icon: Building2 },
    { l: "Dette restante", v: fmt(totalDette), color: "#f87171", Icon: CreditCard },
    { l: "Patrimoine net", v: fmt(totalBrut - totalDette), color: "#34d399", Icon: TrendingUp },
    { l: "Loyers annuels", v: fmt(loyers), color: "#a78bfa", Icon: Euro },
    { l: "Cash-flow / mois", v: `${cf >= 0 ? "+" : ""}${fmt(cf)}`, color: "#34d399", Icon: ArrowUpRight },
    { l: "Rendement brut", v: formatYieldPct(yieldPct.brut), color: "#fbbf24", Icon: BarChart2 },
    { l: "Rendement net", v: formatYieldPct(yieldPct.net), color: "#34d399", Icon: TrendingUp },
  ];

  const personalKpis = personal
    ? [
        { l: "Ma part — brut", v: fmt(personal.brut), color: "#60a5fa", Icon: Building2 },
        { l: "Ma part — dette", v: fmt(personal.dette), color: "#f87171", Icon: CreditCard },
        { l: "Ma part — net", v: fmt(personal.brut - personal.dette), color: "#34d399", Icon: TrendingUp },
        { l: "Ma part — loyers/an", v: fmt(personal.loyers), color: "#a78bfa", Icon: Euro },
        { l: "Ma part — cash/mois", v: `${personal.cash >= 0 ? "+" : ""}${fmt(personal.cash)}`, color: personal.cash >= 0 ? "#34d399" : "#f87171", Icon: ArrowUpRight },
        { l: "Ma part — mensualités", v: fmt(personal.mensualites), color: "#c4b5fd", Icon: BarChart2 },
        { l: "Ma part — rdt brut", v: formatYieldPct(personalYield?.brut), color: "#fbbf24", Icon: BarChart2 },
        { l: "Ma part — rdt net", v: formatYieldPct(personalYield?.net), color: "#34d399", Icon: TrendingUp },
      ]
    : [];

  return (
    <div className={`${pageWrap} space-y-4 md:space-y-5 lg:space-y-6`}>
      <motion.div variants={gridV} initial="hidden" animate="show" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 sm:gap-4 w-full">
        {kpis.map((k) => (
          <motion.div key={k.l} variants={itemV} whileHover={{ y: -3, scale: 1.02 }} className={`${G} p-4 cursor-default`} style={{ borderColor: `${k.color}1e` }}>
            <div className="flex items-center justify-between mb-3 gap-2">
              <MetricLabel label={k.l} className="mb-0 min-w-0" />
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${k.color}1e` }}><k.Icon size={16} style={{ color: k.color }} /></div>
            </div>
            <p className="text-base sm:text-lg font-bold truncate" style={{ color: k.color, fontFamily: "'JetBrains Mono',monospace" }}>{k.v}</p>
          </motion.div>
        ))}
      </motion.div>

      {personal && (
        <motion.div variants={itemV} initial="hidden" animate="show" className={`${G} p-4 sm:p-5`}>
          <div className="flex flex-wrap items-end justify-between gap-2 mb-4">
            <div>
              <p className={lbl}>Quote-part personnelle</p>
              <p className="text-xs sm:text-sm vision-text-muted mt-0.5">
                Indicateurs au prorata des parts de {shareName} dans les SCI d&apos;investissement (hors résidence principale)
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-4 w-full">
            {personalKpis.map((k) => (
              <div key={k.l} className="vision-surface rounded-xl p-3" style={{ border: `1px solid ${k.color}22` }}>
                <div className="flex items-center justify-between mb-2 gap-2">
                  <MetricLabel label={k.l} className="mb-0 min-w-0" />
                  <k.Icon size={14} style={{ color: k.color }} className="flex-shrink-0" />
                </div>
                <p className="text-sm sm:text-base font-bold font-mono truncate" style={{ color: k.color }}>{k.v}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {investScis.map((sci) => {
              const ratio = sciShareRatio(sci, shareName!);
              const pct = Math.round(ratio * 100);
              const props = investProperties.filter((p) => p.sciId === sci.id);
              const dette = props.reduce((s, p) => s + (p.credit?.capitalRestant ?? 0), 0);
              return (
                <div key={sci.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 vision-surface">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: sci.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold vision-text truncate">{sci.shortName}</p>
                    <p className="text-xs vision-text-muted">{pct}% · part dette {fmt(dette * ratio)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 md:gap-5 w-full">
        <motion.div variants={itemV} initial="hidden" animate="show" transition={{ delay: 0.12 }} className={`${G} p-4 sm:p-5 xl:col-span-2 w-full min-w-0`}>
          <p className={`${lbl} mb-4`}>Répartition par entité{shareName ? ` · ${shareName}` : ""}</p>
          <div style={{ height: 160 }}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={scopeScis.map((s) => ({ name: s.shortName, value: shareName ? s.valeurEstimee * sciShareRatio(s, shareName) : s.valeurEstimee, color: s.color }))} dataKey="value" nameKey="name" innerRadius={45} outerRadius={74} paddingAngle={3}>{scopeScis.map((s, i) => <Cell key={i} fill={s.color} opacity={0.82} />)}</Pie><Tooltip content={<ChartTooltipContent unit="currency" />} /></PieChart></ResponsiveContainer></div>
          <div className="mt-4 space-y-2.5">{scopeScis.map((s) => {
            const ratio = shareName ? sciShareRatio(s, shareName) : 1;
            const val = s.valeurEstimee * ratio;
            return (
              <div key={s.id} className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-xs vision-text-muted flex-1 truncate">{s.shortName}{shareName ? ` · ${Math.round(ratio * 100)}%` : ""}</span>
                <span className="text-xs font-semibold font-mono flex-shrink-0" style={{ color: s.color }}>{fmt(val)}</span>
              </div>
            );
          })}</div>
        </motion.div>
        <motion.div variants={itemV} initial="hidden" animate="show" transition={{ delay: 0.18 }} className={`${G} p-4 sm:p-5 xl:col-span-3 w-full min-w-0`}>
          <p className={`${lbl} mb-0.5`}>Évolution du patrimoine</p>
          <p className="text-xs vision-text-muted mb-4">2017–2024 · milliers d&apos;euros</p>
          <ResponsiveContainer width="100%" height={188}>
            <AreaChart data={PATRIMOINE_DATA} margin={{ top: 5, right: 5, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#60a5fa" stopOpacity={0.22} /><stop offset="100%" stopColor="#60a5fa" stopOpacity={0} /></linearGradient>
                <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34d399" stopOpacity={0.22} /><stop offset="100%" stopColor="#34d399" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
              <XAxis dataKey="an" tick={chartAxisTick} axisLine={false} tickLine={false} />
              <YAxis tick={chartAxisTick} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}k`} />
              <Tooltip content={<ChartTooltipContent unit="k" />} />
              <Area type="monotone" dataKey="valeur" stroke="#60a5fa" strokeWidth={2} fill="url(#g1)" name="Valeur brute" />
              <Area type="monotone" dataKey="dette" stroke="#f87171" strokeWidth={1.5} fill="none" strokeDasharray="5 3" name="Dette" />
              <Area type="monotone" dataKey="net" stroke="#34d399" strokeWidth={2} fill="url(#g2)" name="Net" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
      <motion.div variants={gridV} initial="hidden" animate="show" className={`${cardsGrid}`}>
        {[...scopeProperties].sort((a, b) => cashFlow(b) - cashFlow(a)).slice(0, 4).map((p) => {
          const sci = sciOf(p, scopeScis);
          return (
            <motion.div key={p.id} variants={itemV} whileHover={{ y: -4 }} onClick={() => onSelectProperty(p.id)} className={`${G} p-4 overflow-hidden cursor-pointer`} style={{ borderColor: `${sci.color}18` }}>
              <div className="h-0.5 w-10 rounded-full mb-4" style={{ backgroundColor: sci.color, boxShadow: `0 0 8px ${sci.color}` }} />
              <p className="text-sm font-bold vision-text leading-tight">{p.address}</p>
              <p className="text-xs vision-text-muted mt-0.5 mb-3">{p.ville} · {p.type}</p>
              <div className="flex items-center justify-between flex-wrap gap-2"><SCIChip sci={sci} /><CashChip value={cashFlow(p)} /></div>
              <p className="text-xs vision-text-muted mt-3 flex items-center gap-1"><Eye size={14} /> Voir le détail</p>
            </motion.div>
          );
        })}
      </motion.div>

      <VisionPatrimoinePanel
        scis={scopeScis}
        properties={scopeProperties}
        onSelectProperty={onSelectProperty}
        shareholderName={shareName}
      />
    </div>
  );
}

// ─── PROPERTY FORM ───────────────────────────────────────────────────────────

const PTYPES = ["T1", "T2", "T3", "T4", "Maison", "Immeuble", "Local commercial"];

function PropertyForm({ property, scis, existingBanks = [], onSave, onBack, onDelete }: { property: Property | null; scis: SCI[]; existingBanks?: string[]; onSave: (p: Property) => void | Promise<void>; onBack: () => void; onDelete?: () => void | Promise<void> }) {
  const isEdit = !!property;
  const [f, setF] = useState<Property>(property ?? { id: uid(), sciId: scis[0]?.id ?? "", address: "", ville: "", cp: "", type: "T2", surface: 0, lots: 1, prixAchat: 0, travaux: 0, fraisNotaire: 0, valeurActuelle: 0, loyer: 0, taxeFonciere: 0, assurance: 0, gestionDeleguee: false, honorairesGestionPct: 0 });
  const [hasCredit, setHasCredit] = useState(!!property?.credit);
  const [cred, setCred] = useState<Credit>(property?.credit ?? { banque: "", montantInitial: 0, taux: 0, duree: 0, mensualite: 0, debut: "", capitalRestant: 0, assuranceMensuelle: 0, finCredit: "" });
  const upd = (k: keyof Property, v: string | number | boolean) => setF((p) => ({ ...p, [k]: v }));
  const updC = (k: keyof Credit, v: string | number) => setCred((c) => patchCreditField(c, k, v));
  const applyTamImport = (r: TamImportResult) => {
    setHasCredit(true);
    // Ne pas passer une fin PDF partielle : enrichCredit dérive fin = début + durée (mensualité exacte)
    setCred((c) => enrichCredit({
      ...c,
      banque: r.banque || c.banque,
      montantInitial: r.montantInitial,
      taux: r.taux,
      duree: r.duree,
      debut: r.debut,
      finCredit: null,
      assuranceMensuelle: r.assuranceMensuelle,
      mensualite: r.mensualite,
      capitalRestant: r.capitalRestant,
    }));
  };
  const enrichedCred = useMemo(() => enrichCredit(cred), [cred]);
  const sci = scis.find((s) => s.id === f.sciId);
  return (
    <motion.div variants={pageV} initial="hidden" animate="show" className={formWrap}>
      <FormHdr
        title={isEdit ? `Modifier · ${f.address}` : "Nouveau bien"}
        onBack={onBack}
        onDelete={onDelete}
        onSave={() => onSave({
          ...f,
          credit: hasCredit
            ? { ...enrichedCred, banque: resolveBankName(enrichedCred.banque, existingBanks) }
            : undefined,
        })}
        isEdit={isEdit}
      />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-5 w-full">
      <GSec title="Entité propriétaire">
        <div className="grid grid-cols-2 gap-2">
          {scis.map((s) => (
            <motion.button key={s.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => upd("sciId", s.id)} className="flex items-center gap-3 p-3 rounded-xl border transition-all text-left" style={f.sciId === s.id ? { borderColor: s.color, backgroundColor: `${s.color}14` } : { borderColor: "rgba(255,255,255,0.07)", backgroundColor: "rgba(255,255,255,0.02)" }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: `${s.color}22`, color: s.color }}>{s.shortName.slice(0, 2)}</div>
              <div className="min-w-0"><p className="text-xs font-bold vision-text truncate">{s.shortName}</p><p className="text-xs vision-text-muted">{s.type}</p></div>
            </motion.button>
          ))}
        </div>
      </GSec>
      <GSec title="Localisation">
        <AddressAutocomplete
          value={{ address: f.address, cp: f.cp, ville: f.ville }}
          onChange={(loc) => setF((p) => ({ ...p, address: loc.address, cp: loc.cp, ville: loc.ville }))}
        />
      </GSec>
      <GSec title="Type & Caractéristiques">
        <div className="flex flex-wrap gap-2 mb-4">{PTYPES.map((t) => <motion.button key={t} whileTap={{ scale: 0.94 }} onClick={() => upd("type", t)} className="px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all" style={f.type === t ? { borderColor: sci?.color, backgroundColor: `${sci?.color}18`, color: sci?.color } : { borderColor: "rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.38)" }}>{t}</motion.button>)}</div>
        <div className="grid grid-cols-2 gap-3"><GI label="Surface (m²)" type="number" placeholder="65" value={f.surface || ""} onChange={(e) => upd("surface", +e.target.value)} /><GI label="Nombre de lots" type="number" placeholder="1" value={f.lots || ""} onChange={(e) => upd("lots", +e.target.value)} /></div>
      </GSec>
      <GSec title="Financier">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
          <GI label="Prix d'achat (€)" type="number" value={f.prixAchat || ""} onChange={(e) => upd("prixAchat", +e.target.value)} />
          <GI label="Travaux (€)" type="number" value={f.travaux || ""} onChange={(e) => upd("travaux", +e.target.value)} />
          <GI label="Frais de notaire (€)" type="number" value={f.fraisNotaire || ""} onChange={(e) => upd("fraisNotaire", +e.target.value)} />
          <GI label="Valeur actuelle (€)" type="number" value={f.valeurActuelle || ""} onChange={(e) => upd("valeurActuelle", +e.target.value)} />
          <GI label="Loyer mensuel (€)" type="number" value={f.loyer || ""} onChange={(e) => upd("loyer", +e.target.value)} />
          <GI label="Taxe foncière/an (€)" type="number" value={f.taxeFonciere || ""} onChange={(e) => upd("taxeFonciere", +e.target.value)} />
          <GI label="Assurance/an (€)" type="number" value={f.assurance || ""} onChange={(e) => upd("assurance", +e.target.value)} className="sm:col-span-2" />
        </div>
      </GSec>
      <div className={`${G} p-5`}>
        <label className="flex items-center gap-3 cursor-pointer mb-1">
          <div
            className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors duration-200 ${f.gestionDeleguee ? "bg-blue-500/70" : "vision-surface-strong"}`}
            onClick={() => upd("gestionDeleguee", !f.gestionDeleguee)}
          >
            <motion.div animate={{ x: f.gestionDeleguee ? 22 : 2 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} className="w-4 h-4 bg-white rounded-full absolute top-1 shadow" />
          </div>
          <div>
            <span className="text-sm font-semibold vision-text">Gestion locative déléguée</span>
            <p className="text-xs vision-text-muted mt-0.5">
              {f.gestionDeleguee ? "Cabinet de gestion" : "Gestion directe"}
            </p>
          </div>
        </label>
        <AnimatePresence initial={false}>
          {f.gestionDeleguee && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease }}
              className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3"
            >
              <GI
                label="Honoraires de gestion (% du loyer)"
                type="number"
                step="0.1"
                value={f.honorairesGestionPct || ""}
                onChange={(e) => upd("honorairesGestionPct", +e.target.value)}
              />
              <div className="flex flex-col justify-end">
                <p className="text-xs vision-text-muted mb-1">Coût mensuel estimé</p>
                <p className="text-sm font-mono font-semibold vision-text">
                  {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(honorairesGestionMensuel(f))}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className={`${G} p-5`}>
        <label className="flex items-center gap-3 cursor-pointer mb-4">
          <div className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors duration-200 ${hasCredit ? "bg-blue-500/70" : "vision-surface-strong"}`} onClick={() => setHasCredit(!hasCredit)}>
            <motion.div animate={{ x: hasCredit ? 22 : 2 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} className="w-4 h-4 bg-white rounded-full absolute top-1 shadow" />
          </div>
          <span className="text-sm font-semibold vision-text">Crédit immobilier</span>
        </label>
        <TamPdfImportButton existingBanks={existingBanks} onImported={applyTamImport} className="mb-4" />
        <AnimatePresence initial={false}>
          {hasCredit && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease }}
            >
              <p className="text-xs vision-text-muted mb-3">Montant, taux, date de début et date de fin — la durée et les mensualités se calculent automatiquement.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <BanqueField value={cred.banque} onChange={(b) => updC("banque", b)} existingBanks={existingBanks} className="sm:col-span-2" />
                <GI label="Montant emprunté (€)" type="number" value={cred.montantInitial || ""} onChange={(e) => updC("montantInitial", +e.target.value)} />
                <GI label="Taux annuel (%)" type="number" step="0.01" value={cred.taux || ""} onChange={(e) => updC("taux", +e.target.value)} />
                <GI label="Date de début" type="date" value={cred.debut} onChange={(e) => updC("debut", e.target.value)} />
                <GI label="Date de fin" type="date" value={cred.finCredit ?? ""} onChange={(e) => updC("finCredit", e.target.value)} />
                <GI label="Durée (mois)" type="number" value={cred.duree || ""} onChange={(e) => updC("duree", +e.target.value)} />
                <GI label="Assurance mensuelle (€)" type="number" step="0.01" value={cred.assuranceMensuelle || ""} onChange={(e) => updC("assuranceMensuelle", +e.target.value)} />
              </div>
              <LoanCalcSummary credit={cred} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </div>
    </motion.div>
  );
}

// ─── BIENS VIEW ──────────────────────────────────────────────────────────────

function BiensView({ properties, scis, onAdd, onUpdate, onDelete, onSelectProperty, onOpenFullPage }: { properties: Property[]; scis: SCI[]; onAdd: (p: Property) => void | Promise<void>; onUpdate: (p: Property) => void | Promise<void>; onDelete: (id: string) => void | Promise<void>; onSelectProperty: (id: string) => void; onOpenFullPage: (id: string) => void }) {
  const [mode, setMode] = useState<CrudMode>("list");
  const [editing, setEditing] = useState<Property | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filterSci, setFilterSci] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterCredit, setFilterCredit] = useState<"all" | "with" | "without">("all");
  const [filterCash, setFilterCash] = useState<"all" | "pos" | "neg">("all");
  const [display, setDisplay] = useState<"grid" | "table">("grid");
  const types = useMemo(() => [...new Set(properties.map((p) => p.type).filter(Boolean))].sort(), [properties]);
  const filtered = useMemo(() => properties.filter((p) => {
    if (filterSci !== "all" && p.sciId !== filterSci) return false;
    if (filterType !== "all" && p.type !== filterType) return false;
    if (filterCredit === "with" && !p.credit) return false;
    if (filterCredit === "without" && p.credit) return false;
    const cf = cashFlow(p);
    if (filterCash === "pos" && cf < 0) return false;
    if (filterCash === "neg" && cf >= 0) return false;
    const sci = sciOf(p, scis);
    return matchesSearch(query, p.address, p.ville, p.cp, p.type, sci.shortName, sci.name, p.credit?.banque);
  }), [properties, scis, filterSci, filterType, filterCredit, filterCash, query]);
  const pageSize = useCardsGridPageSize();
  const paging = usePagination(filtered, `${filterSci}-${filterType}-${filterCredit}-${filterCash}-${query}-${filtered.length}`, pageSize);
  const filtersActive = query !== "" || filterSci !== "all" || filterType !== "all" || filterCredit !== "all" || filterCash !== "all";
  const resetFilters = () => {
    setQuery("");
    setFilterSci("all");
    setFilterType("all");
    setFilterCredit("all");
    setFilterCash("all");
  };
  if (mode !== "list") {
    return (
      <PropertyForm
        property={editing}
        scis={scis}
        existingBanks={properties.map((p) => p.credit?.banque).filter((b): b is string => Boolean(b))}
        onBack={() => { setMode("list"); setEditing(null); }}
        onSave={async (p) => {
          if (mode === "create") await onAdd(p);
          else await onUpdate(p);
          setMode("list");
          setEditing(null);
        }}
        onDelete={editing ? async () => { await onDelete(editing.id); setMode("list"); setEditing(null); } : undefined}
      />
    );
  }

  return (
    <div className={`${pageWrap} space-y-4 md:space-y-5`}>
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <SearchBar value={query} onChange={setQuery} placeholder="Rechercher une adresse, ville, type, banque…" className="sm:flex-1" />
        <div className="flex items-center gap-2 sm:ml-auto shrink-0">
          <div className={`${G} flex p-1`}>
            <button type="button" onClick={() => setDisplay("grid")} className={`p-2 rounded-xl transition-all ${display === "grid" ? "vision-chip-active" : "vision-text-muted hover:vision-text-muted"}`}><LayoutGrid size={14} /></button>
            <button type="button" onClick={() => setDisplay("table")} className={`p-2 rounded-xl transition-all ${display === "table" ? "vision-chip-active" : "vision-text-muted hover:vision-text-muted"}`}><List size={14} /></button>
          </div>
          <button type="button" onClick={() => { setEditing(null); setMode("create"); }} className={`${btnP} whitespace-nowrap shrink-0`}><Plus size={14} className="shrink-0" /><span className="whitespace-nowrap">Nouveau bien</span></button>
        </div>
      </div>
      <FiltersPanel onReset={resetFilters} resetVisible={filtersActive}>
            <FilterSelect
              label="Entité"
              value={filterSci}
              onChange={setFilterSci}
              options={[
                { value: "all", label: `Toutes (${properties.length})` },
                ...scis.map((s) => ({
                  value: s.id,
                  label: `${s.shortName} (${properties.filter((p) => p.sciId === s.id).length})`,
                })),
              ]}
            />
            <FilterSelect
              label="Type"
              value={filterType}
              onChange={setFilterType}
              options={[
                { value: "all", label: "Tous types" },
                ...types.map((t) => ({
                  value: t,
                  label: `${t} (${properties.filter((p) => p.type === t).length})`,
                })),
              ]}
            />
            <FilterSelect
              label="Crédit"
              value={filterCredit}
              onChange={(v) => setFilterCredit(v as "all" | "with" | "without")}
              options={[
                { value: "all", label: "Tous" },
                { value: "with", label: "Avec crédit" },
                { value: "without", label: "Sans crédit" },
              ]}
            />
            <FilterSelect
              label="Cash-flow"
              value={filterCash}
              onChange={(v) => setFilterCash(v as "all" | "pos" | "neg")}
              options={[
                { value: "all", label: "Tous" },
                { value: "pos", label: "Positif" },
                { value: "neg", label: "Négatif" },
              ]}
            />
      </FiltersPanel>

      {filtered.length === 0 ? <FilterEmpty /> : null}

      <AnimatePresence mode="wait">
        {display === "grid" && filtered.length > 0 ? (
          <motion.div key="grid" variants={gridV} initial="hidden" animate="show" exit={{ opacity: 0, transition: { duration: 0.15 } }} className={cardsGrid}>
            {paging.pageItems.map((p) => {
              const sci = sciOf(p, scis);
              const cf = cashFlow(p);
              const pv = p.valeurActuelle - p.prixAchat - p.travaux - p.fraisNotaire;
              const cpct = p.credit ? Math.round(((p.credit.montantInitial - p.credit.capitalRestant) / p.credit.montantInitial) * 100) : 0;
              return (
                <motion.div key={p.id} variants={itemV} whileHover={{ y: -4 }} onClick={() => onSelectProperty(p.id)} className={`${G} overflow-hidden cursor-pointer`} style={{ borderColor: `${sci.color}18` }}>
                  <div className="h-0.5 w-full" style={{ backgroundColor: sci.color, opacity: 0.45 }} />
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-2 mb-4">
                      <div className="min-w-0"><p className="text-sm font-bold vision-text leading-tight">{p.address}</p><div className="flex items-center gap-1 mt-0.5"><MapPin size={14} className="vision-text-muted" /><p className="text-xs vision-text-muted">{p.cp} {p.ville}</p></div></div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <SCIChip sci={sci} />
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} title="Ouvrir en pleine page" onClick={(e) => { e.stopPropagation(); onOpenFullPage(p.id); }} className="w-7 h-7 rounded-lg vision-surface hover:bg-blue-500/20 flex items-center justify-center vision-text-muted hover:vision-info-text transition-all"><Maximize2 size={11} /></motion.button>
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); setEditing(p); setMode("edit"); }} className="w-7 h-7 rounded-lg vision-surface hover:vision-surface-strong flex items-center justify-center vision-text-muted hover:vision-text transition-all"><Pencil size={11} /></motion.button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {[{ l: "Type", v: `${p.type} · ${p.surface}m²` }, { l: "Valeur", v: fmt(p.valeurActuelle) }, { l: "Loyer/mois", v: p.loyer > 0 ? fmt(p.loyer) : "—" }, { l: "Plus-value", v: `${pv >= 0 ? "+" : ""}${fmt(pv)}`, col: pv >= 0 ? "#34d399" : "#f87171" }].map((m) => (
                        <div key={m.l} className="vision-surface rounded-xl p-3"><MetricLabel label={m.l} /><p className="text-xs font-bold font-mono truncate vision-text" style={{ color: m.col }}>{m.v}</p></div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mb-3"><CashChip value={cf} />{p.credit && <span className="text-xs vision-text-muted font-mono">{fmt(p.credit.capitalRestant)}</span>}</div>
                    {p.credit && <div className="mb-4"><GBar pct={cpct} color={sci.color} /><p className="text-xs vision-text-muted mt-1">{cpct}% remboursé · fin {finCredit(p.credit)}</p></div>}
                    <p className="text-xs vision-text-muted flex items-center gap-1 mb-2"><Eye size={14} /> Cliquer pour l&apos;aperçu · <Maximize2 size={14} className="inline" /> pour la page complète</p>
                    <AnimatePresence>
                      {confirmDel === p.id
                        ? <DelConfirm onConfirm={() => { onDelete(p.id); setConfirmDel(null); }} onCancel={() => setConfirmDel(null)} />
                        : <motion.button whileHover={{ backgroundColor: "rgba(239,68,68,0.07)" }} onClick={(e) => { e.stopPropagation(); setConfirmDel(p.id); }} className="w-full mt-1 py-1.5 rounded-xl text-xs vision-text-faint hover:vision-negative-text border border-transparent hover:border-red-400/14 transition-all text-center">Supprimer ce bien</motion.button>}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        ) : display === "table" && filtered.length > 0 ? (
          <motion.div key="table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.15 } }} className={`${G} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-[var(--v-border-subtle)]">{["Adresse", "Entité", "Type", "Loyer/mois", "Cash-flow", "Plus-value", "Crédit restant", "Actions"].map((h) => <th key={h} className="text-left px-4 py-3 vision-table-head whitespace-nowrap">{h}</th>)}</tr></thead>
                <tbody>
                  {paging.pageItems.map((p, i) => {
                    const sci = sciOf(p, scis);
                    const cf = cashFlow(p);
                    const pv = p.valeurActuelle - p.prixAchat - p.travaux - p.fraisNotaire;
                    return (
                      <motion.tr key={p.id} variants={rowV} initial="hidden" animate="show" transition={{ delay: i * 0.04 }} onClick={() => onSelectProperty(p.id)} className="border-b border-[var(--v-border-subtle)] hover:vision-surface transition-colors group cursor-pointer">
                        <td className="px-4 py-3.5"><p className="text-sm vision-text font-medium">{p.address}</p><p className="text-xs vision-text-muted">{p.ville}</p></td>
                        <td className="px-4 py-3.5"><SCIChip sci={sci} /></td>
                        <td className="px-4 py-3.5 text-xs vision-text-muted whitespace-nowrap">{p.type} · {p.surface}m²</td>
                        <td className="px-4 py-3.5 text-xs font-mono vision-text">{p.loyer > 0 ? fmt(p.loyer) : "—"}</td>
                        <td className="px-4 py-3.5"><CashChip value={cf} /></td>
                        <td className="px-4 py-3.5 text-xs font-mono font-bold" style={{ color: pv >= 0 ? "#34d399" : "#f87171" }}>{pv >= 0 ? "+" : ""}{fmt(pv)}</td>
                        <td className="px-4 py-3.5 text-xs font-mono vision-text-muted">{p.credit ? fmt(p.credit.capitalRestant) : "—"}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <motion.button whileHover={{ scale: 1.1 }} title="Pleine page" onClick={(e) => { e.stopPropagation(); onOpenFullPage(p.id); }} className="w-7 h-7 rounded-lg vision-surface hover:bg-blue-500/20 flex items-center justify-center vision-text-muted hover:vision-info-text transition-all"><Maximize2 size={11} /></motion.button>
                            <motion.button whileHover={{ scale: 1.1 }} onClick={(e) => { e.stopPropagation(); setEditing(p); setMode("edit"); }} className="w-7 h-7 rounded-lg vision-surface hover:vision-surface-strong flex items-center justify-center vision-text-muted hover:vision-text transition-all"><Pencil size={11} /></motion.button>
                            {confirmDel === p.id ? (
                              <div className="flex gap-1">
                                <button onClick={(e) => { e.stopPropagation(); onDelete(p.id); setConfirmDel(null); }} className="px-2 py-1 bg-red-500/80 vision-text text-xs font-bold rounded-lg">Oui</button>
                                <button onClick={(e) => { e.stopPropagation(); setConfirmDel(null); }} className="px-2 py-1 vision-surface-strong vision-text-muted text-xs rounded-lg">Non</button>
                              </div>
                            ) : <motion.button whileHover={{ scale: 1.1 }} onClick={(e) => { e.stopPropagation(); setConfirmDel(p.id); }} className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/28 flex items-center justify-center vision-negative-text/55 hover:vision-negative-text transition-all"><Trash2 size={11} /></motion.button>}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <PaginationBar page={paging.page} totalPages={paging.totalPages} total={paging.total} from={paging.from} to={paging.to} onChange={paging.setPage} />
    </div>
  );
}

// ─── SCI FORM & VIEW ─────────────────────────────────────────────────────────

function SCIForm({
  sci,
  existingAssociates = [],
  onSave,
  onBack,
  onDelete,
}: {
  sci: SCI | null;
  /** Associés déjà présents sur le patrimoine (autres SCI) */
  existingAssociates?: string[];
  onSave: (s: SCI) => void | Promise<void>;
  onBack: () => void;
  onDelete?: () => void | Promise<void>;
}) {
  const isEdit = !!sci;
  const [f, setF] = useState<SCI>(sci ?? { id: uid(), name: "", shortName: "", type: "IR", creation: "", valeurEstimee: 0, associes: [{ name: "", parts: 50 }, { name: "", parts: 50 }], color: "#60a5fa", gradient: "from-blue-500/20 to-transparent" });
  const updF = (k: keyof SCI, v: string | number) => setF((s) => ({ ...s, [k]: v }));
  const knownNames = useMemo(
    () => [...existingAssociates, ...f.associes.map((a) => a.name)],
    [existingAssociates, f.associes],
  );
  return (
    <motion.div variants={pageV} initial="hidden" animate="show" className={formWrap}>
      <FormHdr
        title={isEdit ? `Modifier · ${f.name}` : "Nouvelle SCI"}
        onBack={onBack}
        onDelete={onDelete}
        onSave={() => {
          const cleaned = f.associes
            .map((a) => ({ ...a, name: resolveAssocieName(a.name, knownNames) }))
            .filter((a) => a.name.trim().length > 0);
          // Fusionne les doublons éventuels (même nom) en additionnant les parts
          const merged: Associe[] = [];
          for (const a of cleaned) {
            const hit = merged.find((m) => sameAssocieName(m.name, a.name));
            if (hit) hit.parts += a.parts;
            else merged.push({ ...a });
          }
          onSave({ ...f, associes: merged });
        }}
        isEdit={isEdit}
      />
      <GSec title="Identité">
        <div className="space-y-3">
          <GI label="Nom complet" placeholder="SCI IR DUPONT" value={f.name} onChange={(e) => updF("name", e.target.value)} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <GI label="Nom court" placeholder="DUPONT" value={f.shortName} onChange={(e) => updF("shortName", e.target.value)} />
            <GI label="Date de création" type="date" value={creationToInputValue(f.creation)} onChange={(e) => updF("creation", e.target.value)} />
          </div>
          <div><label className={lbl}>Régime fiscal</label><div className="flex gap-2">{(["IR", "IS", "RP"] as const).map((t) => <motion.button key={t} whileTap={{ scale: 0.94 }} onClick={() => updF("type", t)} className="flex-1 py-2.5 rounded-xl border text-sm font-bold transition-all" style={f.type === t ? { backgroundColor: "rgba(96,165,250,0.18)", borderColor: "#60a5fa", color: "#60a5fa" } : { borderColor: "rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.33)" }}>{t}</motion.button>)}</div></div>
          <GI label="Valeur estimée (€)" type="number" value={f.valeurEstimee || ""} onChange={(e) => updF("valeurEstimee", +e.target.value)} />
        </div>
      </GSec>
      <GSec title="Associés">
        <div className="space-y-3">
          {f.associes.map((a, i) => (
            <div key={i} className="flex gap-2 sm:gap-3 items-end">
              <AssocieField
                className="flex-1 min-w-0"
                value={a.name}
                existingNames={knownNames}
                excludeNames={f.associes.map((x, j) => (j === i ? "" : x.name))}
                onChange={(name) => setF((s) => ({
                  ...s,
                  associes: s.associes.map((x, j) => (j === i ? { ...x, name } : x)),
                }))}
              />
              <div className="flex items-end gap-2 shrink-0">
                <GI type="number" placeholder="50" value={a.parts || ""} onChange={(e) => setF((s) => ({ ...s, associes: s.associes.map((x, j) => j === i ? { ...x, parts: +e.target.value } : x) }))} className="w-20" />
                <span className="vision-text-muted text-sm pb-3">%</span>
              </div>
              <button
                type="button"
                title="Retirer cet associé"
                aria-label="Retirer cet associé"
                onClick={() => setF((s) => ({ ...s, associes: s.associes.filter((_, j) => j !== i) }))}
                className="mb-0.5 w-10 h-10 rounded-xl border border-red-400/20 bg-red-500/10 hover:bg-red-500/25 flex items-center justify-center vision-negative-text shrink-0 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => setF((s) => ({ ...s, associes: [...s.associes, { name: "", parts: 0 }] }))} className={btnG}><Plus size={13} />Associé</button>
        </div>
      </GSec>
    </motion.div>
  );
}

function SCIView({ scis, properties, onAdd, onUpdate, onDelete, onSelectSci, onOpenFullPage }: { scis: SCI[]; properties: Property[]; onAdd: (s: SCI) => void | Promise<void>; onUpdate: (s: SCI) => void | Promise<void>; onDelete: (id: string) => void | Promise<void>; onSelectSci: (id: string) => void; onOpenFullPage: (id: string) => void }) {
  const [mode, setMode] = useState<CrudMode>("list");
  const [editing, setEditing] = useState<SCI | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "IR" | "IS" | "RP">("all");
  const filtered = useMemo(() => scis.filter((s) => {
    if (filterType !== "all" && s.type !== filterType) return false;
    const assoc = s.associes.map((a) => a.name).join(" ");
    return matchesSearch(query, s.name, s.shortName, s.type, s.creation, assoc);
  }), [scis, filterType, query]);
  const pageSize = useDuoGridPageSize();
  const paging = usePagination(filtered, `${filterType}-${query}-${filtered.length}`, pageSize);
  const filtersActive = query !== "" || filterType !== "all";
  const resetFilters = () => { setQuery(""); setFilterType("all"); };
  if (mode !== "list") {
    return (
      <SCIForm
        sci={editing}
        existingAssociates={scis.flatMap((s) => s.associes.map((a) => a.name))}
        onBack={() => { setMode("list"); setEditing(null); }}
        onSave={async (s) => {
          if (mode === "create") await onAdd(s);
          else await onUpdate(s);
          setMode("list");
          setEditing(null);
        }}
        onDelete={editing ? async () => { await onDelete(editing.id); setMode("list"); setEditing(null); } : undefined}
      />
    );
  }
  return (
    <div className={`${pageWrap} space-y-4 md:space-y-5`}>
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <SearchBar value={query} onChange={setQuery} placeholder="Rechercher une SCI, associé…" className="sm:flex-1" />
        <button type="button" onClick={() => { setEditing(null); setMode("create"); }} className={`${btnP} whitespace-nowrap shrink-0 sm:ml-auto`}><Plus size={14} className="shrink-0" /><span className="whitespace-nowrap">Nouvelle SCI</span></button>
      </div>
      <FiltersPanel onReset={resetFilters} resetVisible={filtersActive}>
            <FilterSelect
              label="Régime"
              value={filterType}
              onChange={(v) => setFilterType(v as "all" | "IR" | "IS" | "RP")}
              options={[
                { value: "all", label: `Tous régimes (${scis.length})` },
                ...(["IR", "IS", "RP"] as const)
                  .filter((t) => scis.some((s) => s.type === t))
                  .map((t) => ({
                    value: t,
                    label: `${t} (${scis.filter((s) => s.type === t).length})`,
                  })),
              ]}
            />
      </FiltersPanel>
      {filtered.length === 0 ? <FilterEmpty /> : null}
      <motion.div variants={gridV} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-2 gap-4 md:gap-5 w-full">
        {paging.pageItems.map((sci) => {
          const props = properties.filter((p) => p.sciId === sci.id);
          const cf = props.reduce((s, p) => s + cashFlow(p), 0);
          return (
            <motion.div key={sci.id} variants={itemV} whileHover={{ y: -2 }} onClick={() => onSelectSci(sci.id)} className={`${G} overflow-hidden cursor-pointer`} style={{ borderColor: `${sci.color}1e` }}>
              <div className={`p-5 bg-gradient-to-br ${sci.gradient}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3"><div className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold" style={{ backgroundColor: `${sci.color}25`, color: sci.color }}>{sci.shortName.slice(0, 2)}</div><div><p className="font-bold vision-text">{sci.name}</p><p className="text-xs vision-text-muted">{formatCreationDisplay(sci.creation)}</p></div></div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-lg text-xs font-bold border" style={{ color: sci.color, borderColor: `${sci.color}38`, backgroundColor: `${sci.color}14` }}>{sci.type}</span>
                    <motion.button whileHover={{ scale: 1.1 }} title="Pleine page" onClick={(e) => { e.stopPropagation(); onOpenFullPage(sci.id); }} className="w-8 h-8 rounded-lg vision-surface hover:bg-blue-500/20 flex items-center justify-center vision-text-muted hover:vision-info-text transition-all"><Maximize2 size={14} /></motion.button>
                    <motion.button whileHover={{ scale: 1.1 }} onClick={(e) => { e.stopPropagation(); setEditing(sci); setMode("edit"); }} className="w-8 h-8 rounded-lg vision-surface hover:vision-surface-strong flex items-center justify-center vision-text-muted hover:vision-text transition-all"><Pencil size={13} /></motion.button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[{ l: "Valeur", v: fmt(sci.valeurEstimee) }, { l: "Loyers/mois", v: fmt(props.reduce((s, p) => s + p.loyer, 0)) }, { l: "Cash-flow", v: `${cf >= 0 ? "+" : ""}${fmt(cf)}` }].map((m) => (
                    <div key={m.l} className="bg-black/18 backdrop-blur rounded-xl p-3"><p className="text-xs vision-text-muted mb-1">{m.l}</p><p className="text-xs font-bold font-mono vision-text truncate">{m.v}</p></div>
                  ))}
                </div>
              </div>
              <div className="px-5 py-4 border-t border-[var(--v-border-subtle)]">
                <p className={`${lbl} mb-3`}>Associés</p>
                <div className="space-y-2.5">{sci.associes.filter((a) => a.name.trim()).map((a) => <div key={a.name} className="flex items-center gap-3"><Ava initiales={a.name.split(" ").map((n) => n[0]).join("")} color={sci.color} size={28} /><span className="text-xs vision-text-muted flex-1 truncate">{a.name}</span><span className="text-sm font-bold font-mono flex-shrink-0" style={{ color: sci.color }}>{a.parts}%</span></div>)}</div>
              </div>
              {props.length > 0 && <div className="px-5 pb-4 border-t border-[var(--v-border-subtle)]"><p className={`${lbl} my-3`}>{props.length} bien{props.length > 1 ? "s" : ""}</p><div className="space-y-1.5">{props.map((p) => <motion.div key={p.id} whileHover={{ x: 3 }} className="flex items-center justify-between py-2 px-3 rounded-xl vision-surface hover:vision-surface transition-colors"><div><p className="text-xs font-medium vision-text">{p.address}</p><p className="text-xs vision-text-muted">{p.type} · {p.surface}m²</p></div><CashChip value={cashFlow(p)} /></motion.div>)}</div></div>}
              <p className="px-5 pb-2 text-xs vision-text-muted flex items-center gap-1"><Eye size={14} /> Cliquer pour l&apos;aperçu</p>
              <AnimatePresence>
                {confirmDel === sci.id
                  ? <motion.div variants={slideV} initial="hidden" animate="show" exit="exit" className="px-5 pb-4 overflow-hidden"><div className="flex items-center gap-2 pt-3 border-t border-[var(--v-border-subtle)]"><p className="text-xs vision-negative-text flex-1">Supprimer cette SCI ?</p><button onClick={() => { onDelete(sci.id); setConfirmDel(null); }} className="px-3 py-1.5 bg-red-500/80 vision-text text-xs font-bold rounded-lg">Oui</button><button onClick={() => setConfirmDel(null)} className="px-3 py-1.5 vision-surface-strong vision-text-muted text-xs rounded-lg">Non</button></div></motion.div>
                  : <motion.button onClick={(e) => { e.stopPropagation(); setConfirmDel(sci.id); }} className="w-full py-2 text-xs vision-text-faint hover:vision-negative-text hover:bg-red-500/07 transition-all">Supprimer cette SCI</motion.button>}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </motion.div>
      <PaginationBar page={paging.page} totalPages={paging.totalPages} total={paging.total} from={paging.from} to={paging.to} onChange={paging.setPage} />
    </div>
  );
}

// ─── CREDITS VIEW ────────────────────────────────────────────────────────────

type CreditEntry = Credit & { id: string; propertyId: string };

function CreditFormView({ credit, properties, onSave, onBack, onDelete }: { credit: CreditEntry | null; properties: Property[]; onSave: (c: CreditEntry) => void | Promise<void>; onBack: () => void; onDelete?: () => void | Promise<void> }) {
  const isEdit = !!credit;
  const [f, setF] = useState<CreditEntry>(credit ?? { id: uid(), propertyId: properties[0]?.id ?? "", banque: "", montantInitial: 0, taux: 0, duree: 0, mensualite: 0, debut: "", capitalRestant: 0, assuranceMensuelle: 0, finCredit: "" });
  const existingBanks = useMemo(
    () => properties.map((p) => p.credit?.banque).filter((b): b is string => Boolean(b)),
    [properties],
  );
  const upd = (k: string, v: string | number) => setF((c) => patchCreditField(c, k, v));
  const applyTamImport = (r: TamImportResult) => {
    setF((c) => enrichCredit({
      ...c,
      banque: r.banque || c.banque,
      montantInitial: r.montantInitial,
      taux: r.taux,
      duree: r.duree,
      debut: r.debut,
      finCredit: null,
      assuranceMensuelle: r.assuranceMensuelle,
      mensualite: r.mensualite,
      capitalRestant: r.capitalRestant,
    }) as CreditEntry);
  };
  const enriched = useMemo(() => enrichCredit(f) as CreditEntry, [f]);
  return (
    <motion.div variants={pageV} initial="hidden" animate="show" className={formWrap}>
      <FormHdr
        title={isEdit ? `Modifier · ${f.banque}` : "Nouveau crédit"}
        onBack={onBack}
        onDelete={onDelete}
        onSave={() => onSave({
          ...enriched,
          id: f.id,
          propertyId: f.propertyId,
          banque: resolveBankName(enriched.banque, existingBanks),
        })}
        isEdit={isEdit}
      />
      <GSec title="Bien associé"><GS label="Bien" value={f.propertyId} onChange={(e) => upd("propertyId", e.target.value)} options={properties.map((p) => ({ value: p.id, label: `${p.address}, ${p.ville}` }))} /></GSec>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-5 w-full">
      <GSec title="Prêt bancaire — saisie minimale">
        <TamPdfImportButton existingBanks={existingBanks} onImported={applyTamImport} className="mb-4" />
        <p className="text-xs vision-text-muted mb-4">Renseignez montant, taux, date de début et date de fin. La durée et les mensualités se calculent automatiquement.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
          <BanqueField value={f.banque} onChange={(b) => upd("banque", b)} existingBanks={existingBanks} className="sm:col-span-2 xl:col-span-3" />
          <GI label="Montant emprunté (€)" type="number" value={f.montantInitial || ""} onChange={(e) => upd("montantInitial", +e.target.value)} />
          <GI label="Taux annuel (%)" type="number" step="0.01" value={f.taux || ""} onChange={(e) => upd("taux", +e.target.value)} />
          <GI label="Date de début" type="date" value={f.debut} onChange={(e) => upd("debut", e.target.value)} />
          <GI label="Date de fin" type="date" value={f.finCredit ?? ""} onChange={(e) => upd("finCredit", e.target.value)} />
          <GI label="Durée (mois)" type="number" value={f.duree || ""} onChange={(e) => upd("duree", +e.target.value)} />
          <GI label="Assurance mensuelle (€)" type="number" step="0.01" value={f.assuranceMensuelle || ""} onChange={(e) => upd("assuranceMensuelle", +e.target.value)} />
        </div>
        <LoanCalcSummary credit={f} />
      </GSec>
      </div>
    </motion.div>
  );
}

function CreditsView({ properties, scis, onUpdateProperty, onSelectCredit, onOpenFullPage }: { properties: Property[]; scis: SCI[]; onUpdateProperty: (p: Property) => void | Promise<void>; onSelectCredit: (propertyId: string) => void; onOpenFullPage: (propertyId: string) => void }) {
  const allCredits: CreditEntry[] = properties.filter((p) => p.credit).map((p) => ({ ...p.credit!, id: `c_${p.id}`, propertyId: p.id }));
  const [mode, setMode] = useState<CrudMode>("list");
  const [editing, setEditing] = useState<CreditEntry | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filterSci, setFilterSci] = useState("all");
  const [filterBanque, setFilterBanque] = useState("all");
  const banques = useMemo(() => [...new Set(allCredits.map((c) => c.banque).filter(Boolean))].sort(), [allCredits]);
  const filtered = useMemo(() => allCredits.filter((c) => {
    const prop = properties.find((p) => p.id === c.propertyId);
    if (!prop) return false;
    if (filterSci !== "all" && prop.sciId !== filterSci) return false;
    if (filterBanque !== "all" && c.banque !== filterBanque) return false;
    const sci = sciOf(prop, scis);
    return matchesSearch(query, c.banque, prop.address, prop.ville, sci.shortName, String(c.taux), String(c.capitalRestant));
  }), [allCredits, properties, scis, filterSci, filterBanque, query]);
  const save = async (c: CreditEntry) => {
    const computed = enrichCredit(c) as CreditEntry;
    const prop = properties.find((p) => p.id === c.propertyId)!;
    await onUpdateProperty({
      ...prop,
      credit: {
        banque: computed.banque,
        montantInitial: computed.montantInitial,
        taux: computed.taux,
        duree: computed.duree,
        debut: computed.debut,
        assuranceMensuelle: computed.assuranceMensuelle,
        mensualite: computed.mensualite,
        capitalRestant: computed.capitalRestant,
        finCredit: computed.finCredit ?? null,
      },
    });
    setMode("list");
    setEditing(null);
  };
  const del = async (c: CreditEntry) => {
    const prop = properties.find((p) => p.id === c.propertyId)!;
    await onUpdateProperty({ ...prop, credit: undefined });
    setConfirmDel(null);
  };
  const pageSize = useCardsGridPageSize();
  const paging = usePagination(filtered, `${filterSci}-${filterBanque}-${query}-${filtered.length}`, pageSize);
  const filtersActive = query !== "" || filterSci !== "all" || filterBanque !== "all";
  const resetFilters = () => { setQuery(""); setFilterSci("all"); setFilterBanque("all"); };
  if (mode !== "list") {
    return (
      <CreditFormView
        credit={editing}
        properties={properties}
        onBack={() => { setMode("list"); setEditing(null); }}
        onSave={save}
        onDelete={editing ? async () => { await del(editing); setMode("list"); setEditing(null); } : undefined}
      />
    );
  }

  return (
    <div className={`${pageWrap} space-y-4 md:space-y-5`}>
      <div className="flex flex-nowrap items-center gap-3 min-w-0 overflow-x-auto">
        <div className="flex flex-nowrap items-stretch gap-3 shrink-0">
          {[{ l: "Capital total", v: fmt(filtered.reduce((s, c) => s + c.capitalRestant, 0)), c: "#f87171" }, { l: "Mensualités/mois", v: fmt(filtered.reduce((s, c) => s + c.mensualite, 0)), c: "#a78bfa" }].map((k) => (
            <div key={k.l} className={kpiBadge}><p className="text-xs vision-text-muted whitespace-nowrap">{k.l}</p><p className="text-base font-bold font-mono mt-0.5 whitespace-nowrap" style={{ color: k.c }}>{k.v}</p></div>
          ))}
        </div>
        <button type="button" onClick={() => { setEditing(null); setMode("create"); }} className={`${btnP} ml-auto whitespace-nowrap shrink-0`}><Plus size={14} className="shrink-0" /><span className="whitespace-nowrap">Nouveau crédit</span></button>
      </div>
      <SearchBar value={query} onChange={setQuery} placeholder="Rechercher une banque, adresse, SCI…" />
      <FiltersPanel onReset={resetFilters} resetVisible={filtersActive}>
            <FilterSelect
              label="Entité"
              value={filterSci}
              onChange={setFilterSci}
              options={[
                { value: "all", label: `Toutes (${allCredits.length})` },
                ...scis.map((s) => ({
                  value: s.id,
                  label: `${s.shortName} (${allCredits.filter((c) => properties.find((p) => p.id === c.propertyId)?.sciId === s.id).length})`,
                })),
              ]}
            />
            <FilterSelect
              label="Banque"
              value={filterBanque}
              onChange={setFilterBanque}
              options={[
                { value: "all", label: "Toutes banques" },
                ...banques.map((b) => ({
                  value: b,
                  label: `${b} (${allCredits.filter((c) => c.banque === b).length})`,
                })),
              ]}
            />
      </FiltersPanel>
      {filtered.length === 0 ? <FilterEmpty /> : null}
      <motion.div variants={gridV} initial="hidden" animate="show" className={cardsGrid}>
        {paging.pageItems.map((c) => {
          const prop = properties.find((p) => p.id === c.propertyId)!;
          const sci = sciOf(prop, scis);
          const pct = Math.round(((c.montantInitial - c.capitalRestant) / c.montantInitial) * 100);
          return (
            <motion.div key={c.id} variants={itemV} whileHover={{ y: -3 }} onClick={() => onSelectCredit(c.propertyId)} className={`${G} p-5 cursor-pointer`} style={{ borderColor: `${sci.color}18` }}>
              <div className="flex items-start gap-4 mb-5">
                <div className="relative flex-shrink-0"><Ring pct={pct} color={sci.color} size={64} /><div className="absolute inset-0 flex items-center justify-center"><span className="text-xs font-bold" style={{ color: sci.color }}>{pct}%</span></div></div>
                <div className="flex-1 min-w-0 pt-1"><p className="text-sm font-bold vision-text">{c.banque}</p><p className="text-xs vision-text-muted truncate">{prop.address}, {prop.ville}</p><div className="mt-1"><SCIChip sci={sci} /></div></div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <motion.button whileHover={{ scale: 1.1 }} title="Pleine page" onClick={(e) => { e.stopPropagation(); onOpenFullPage(c.propertyId); }} className="w-7 h-7 rounded-lg vision-surface hover:bg-blue-500/20 flex items-center justify-center vision-text-muted hover:vision-info-text transition-all"><Maximize2 size={11} /></motion.button>
                  <motion.button whileHover={{ scale: 1.1 }} onClick={(e) => { e.stopPropagation(); setEditing(c); setMode("edit"); }} className="w-7 h-7 rounded-lg vision-surface hover:vision-surface-strong flex items-center justify-center vision-text-muted hover:vision-text transition-all"><Pencil size={11} /></motion.button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[{ l: "Capital restant", v: fmt(c.capitalRestant), col: "#f87171" }, { l: "Mensualité", v: fmt(c.mensualite) }, { l: "Taux", v: `${c.taux} %` }, { l: "Remboursé", v: fmt(c.montantInitial - c.capitalRestant), col: "#34d399" }].map((m) => (
                  <div key={m.l} className="vision-surface rounded-xl p-3"><MetricLabel label={m.l === "Mensualité" ? "Mensualité crédit" : m.l} /><p className="text-xs font-bold font-mono" style={{ color: m.col ?? "rgba(255,255,255,0.85)" }}>{m.v}</p></div>
                ))}
              </div>
              <GBar pct={pct} color={sci.color} />
              <div className="flex items-center justify-between mt-1.5"><span className="text-xs vision-text-muted font-mono">{fmt(c.montantInitial)}</span><span className="text-xs vision-text-muted flex items-center gap-1"><Calendar size={14} />Fin {finCredit(c)}</span></div>
              <p className="text-xs vision-text-muted mt-2 flex items-center gap-1"><Eye size={14} /> Voir amortissement</p>
              <AnimatePresence>
                {confirmDel === c.id ? <DelConfirm onConfirm={() => del(c)} onCancel={() => setConfirmDel(null)} /> : <motion.button whileHover={{ backgroundColor: "rgba(239,68,68,0.07)" }} onClick={(e) => { e.stopPropagation(); setConfirmDel(c.id); }} className="w-full mt-3 py-1.5 rounded-xl text-xs vision-text-faint hover:vision-negative-text border border-transparent hover:border-red-400/14 transition-all">Supprimer</motion.button>}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </motion.div>
      <PaginationBar page={paging.page} totalPages={paging.totalPages} total={paging.total} from={paging.from} to={paging.to} onChange={paging.setPage} />
    </div>
  );
}

// ─── TENANT FORM & VIEW ──────────────────────────────────────────────────────

function TenantForm({ tenant, properties, scis, onSave, onBack, onDelete }: { tenant: Tenant | null; properties: Property[]; scis: SCI[]; onSave: (t: Tenant) => void | Promise<void>; onBack: () => void; onDelete?: () => void | Promise<void> }) {
  const isEdit = !!tenant;
  const [f, setF] = useState<Tenant>(tenant ?? { id: uid(), propertyId: properties[0]?.id ?? "", nom: "", initiales: "", tel: "", email: "", debutBail: "", finBail: "", debutTs: 0, finTs: 0, loyer: 0, charges: 0, statut: "En cours" });
  const upd = (k: keyof Tenant, v: string | number) => setF((t) => ({ ...t, [k]: v }));
  return (
    <motion.div variants={pageV} initial="hidden" animate="show" className={formWrap}>
      <FormHdr
        title={isEdit ? `Modifier · ${f.nom}` : "Nouveau locataire"}
        onBack={onBack}
        onDelete={onDelete}
        onSave={() => onSave(syncTenantBailTs({
          ...f,
          initiales: f.nom.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2),
        }))}
        isEdit={isEdit}
      />
      <GSec title="Bien loué"><GS label="Bien" value={f.propertyId} onChange={(e) => upd("propertyId", e.target.value)} options={properties.filter((p) => p.loyer > 0).map((p) => ({ value: p.id, label: `${p.address}, ${p.ville} (${sciOf(p, scis).shortName})` }))} /></GSec>
      <GSec title="Identité">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
          <GI label="Nom complet" placeholder="Sophie Martin" value={f.nom} onChange={(e) => upd("nom", e.target.value)} className="sm:col-span-2" />
          <GI label="Téléphone" value={f.tel} onChange={(e) => upd("tel", e.target.value)} />
          <GI label="Email" type="email" value={f.email} onChange={(e) => upd("email", e.target.value)} />
        </div>
      </GSec>
      <GSec title="Bail & Financier">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
          <GI label="Début du bail" type="date" value={f.debutBail} onChange={(e) => upd("debutBail", e.target.value)} />
          <GI label="Fin du bail" type="date" value={f.finBail} onChange={(e) => upd("finBail", e.target.value)} />
          <GI label="Loyer mensuel (€)" type="number" value={f.loyer || ""} onChange={(e) => upd("loyer", +e.target.value)} />
          <GI label="Charges (€)" type="number" value={f.charges || ""} onChange={(e) => upd("charges", +e.target.value)} />
          <div className="sm:col-span-2"><label className={lbl}>Statut</label><div className="flex gap-2">{(["En cours", "Impayé", "Terminé"] as const).map((s) => <motion.button key={s} whileTap={{ scale: 0.94 }} onClick={() => upd("statut", s)} className="flex-1 py-2.5 rounded-xl border text-xs font-semibold transition-all" style={f.statut === s ? { backgroundColor: s === "En cours" ? "rgba(52,211,153,0.16)" : s === "Impayé" ? "rgba(248,113,113,0.16)" : "rgba(255,255,255,0.09)", borderColor: s === "En cours" ? "#34d399" : s === "Impayé" ? "#f87171" : "rgba(255,255,255,0.18)", color: s === "En cours" ? "#34d399" : s === "Impayé" ? "#f87171" : "rgba(255,255,255,0.5)" } : { borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.28)" }}>{s}</motion.button>)}</div></div>
        </div>
      </GSec>
    </motion.div>
  );
}

function LocationView({ tenants, properties, scis, onAdd, onUpdate, onDelete, onSelectTenant, onOpenFullPage }: { tenants: Tenant[]; properties: Property[]; scis: SCI[]; onAdd: (t: Tenant) => void | Promise<void>; onUpdate: (t: Tenant) => void | Promise<void>; onDelete: (id: string) => void | Promise<void>; onSelectTenant: (id: string) => void; onOpenFullPage: (id: string) => void }) {
  const [mode, setMode] = useState<CrudMode>("list");
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filterStatut, setFilterStatut] = useState<"all" | Tenant["statut"]>("all");
  const [filterSci, setFilterSci] = useState("all");
  const filtered = useMemo(() => tenants.filter((t) => {
    if (filterStatut !== "all" && t.statut !== filterStatut) return false;
    const prop = properties.find((p) => p.id === t.propertyId);
    if (filterSci !== "all" && prop?.sciId !== filterSci) return false;
    const sci = prop ? sciOf(prop, scis) : null;
    return matchesSearch(query, t.nom, t.email, t.tel, t.statut, prop?.address, prop?.ville, sci?.shortName);
  }), [tenants, properties, scis, filterStatut, filterSci, query]);
  const pageSize = useCardsGridPageSize();
  const paging = usePagination(filtered, `${filterStatut}-${filterSci}-${query}-${filtered.length}`, pageSize);
  const filtersActive = query !== "" || filterStatut !== "all" || filterSci !== "all";
  const resetFilters = () => { setQuery(""); setFilterStatut("all"); setFilterSci("all"); };
  if (mode !== "list") {
    return (
      <TenantForm
        tenant={editing}
        properties={properties}
        scis={scis}
        onBack={() => { setMode("list"); setEditing(null); }}
        onSave={async (t) => {
          if (mode === "create") await onAdd(t);
          else await onUpdate(t);
          setMode("list");
          setEditing(null);
        }}
        onDelete={editing ? async () => { await onDelete(editing.id); setMode("list"); setEditing(null); } : undefined}
      />
    );
  }
  const statStyle: Record<Tenant["statut"], { bg: string; color: string }> = { "En cours": { bg: "rgba(52,211,153,0.13)", color: "#34d399" }, "Impayé": { bg: "rgba(248,113,113,0.13)", color: "#f87171" }, "Terminé": { bg: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)" } };
  return (
    <div className={`${pageWrap} space-y-4 md:space-y-5`}>
      <div className="flex flex-nowrap items-center gap-3 min-w-0 overflow-x-auto">
        <div className="flex flex-nowrap items-stretch gap-3 shrink-0">
          {[{ l: "Actifs", v: `${filtered.filter((t) => t.statut !== "Terminé").length}`, c: "#60a5fa" }, { l: "Loyers/mois", v: fmt(filtered.filter((t) => t.statut === "En cours").reduce((s, t) => s + t.loyer, 0)), c: "#34d399" }, { l: "Impayés", v: `${filtered.filter((t) => t.statut === "Impayé").length}`, c: "#f87171" }].map((k) => (
            <div key={k.l} className={kpiBadge}><p className="text-xs vision-text-muted whitespace-nowrap">{k.l}</p><p className="text-base font-bold font-mono mt-0.5 whitespace-nowrap" style={{ color: k.c }}>{k.v}</p></div>
          ))}
        </div>
        <button type="button" onClick={() => { setEditing(null); setMode("create"); }} className={`${btnP} ml-auto whitespace-nowrap shrink-0`}><Plus size={14} className="shrink-0" /><span className="whitespace-nowrap">Nouveau locataire</span></button>
      </div>
      <SearchBar value={query} onChange={setQuery} placeholder="Rechercher un locataire, email, bien…" />
      <FiltersPanel onReset={resetFilters} resetVisible={filtersActive}>
            <FilterSelect
              label="Statut"
              value={filterStatut}
              onChange={(v) => setFilterStatut(v as "all" | Tenant["statut"])}
              options={[
                { value: "all", label: `Tous (${tenants.length})` },
                ...(["En cours", "Impayé", "Terminé"] as const).map((s) => ({
                  value: s,
                  label: `${s} (${tenants.filter((t) => t.statut === s).length})`,
                })),
              ]}
            />
            <FilterSelect
              label="Entité"
              value={filterSci}
              onChange={setFilterSci}
              options={[
                { value: "all", label: "Toutes entités" },
                ...scis.map((s) => ({ value: s.id, label: s.shortName })),
              ]}
            />
      </FiltersPanel>
      {filtered.length === 0 ? <FilterEmpty /> : null}
      <motion.div variants={gridV} initial="hidden" animate="show" className={cardsGrid}>
        {paging.pageItems.map((t) => {
          const prop = properties.find((p) => p.id === t.propertyId)!;
          const sci = prop ? sciOf(prop, scis) : (scis[0] ?? FALLBACK_SCI);
          const pct = leasePct(t);
          const ss = statStyle[t.statut];
          return (
            <motion.div key={t.id} variants={itemV} whileHover={{ y: -3 }} onClick={() => onSelectTenant(t.id)} className={`${G} p-5 cursor-pointer`} style={{ borderColor: `${sci.color}18` }}>
              <div className="flex items-start gap-3 mb-4">
                <Ava initiales={t.initiales} color={sci.color} size={38} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2"><p className="text-sm font-bold vision-text truncate">{t.nom}</p>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: ss.bg, color: ss.color }}>{t.statut}</span>
                      <motion.button whileHover={{ scale: 1.1 }} title="Pleine page" onClick={(e) => { e.stopPropagation(); onOpenFullPage(t.id); }} className="w-8 h-8 rounded-md vision-surface hover:bg-blue-500/20 flex items-center justify-center vision-text-muted hover:vision-info-text transition-all"><Maximize2 size={14} /></motion.button>
                      <motion.button whileHover={{ scale: 1.1 }} onClick={(e) => { e.stopPropagation(); setEditing(t); setMode("edit"); }} className="w-8 h-8 rounded-md vision-surface hover:vision-surface-strong flex items-center justify-center vision-text-muted hover:vision-text transition-all"><Pencil size={14} /></motion.button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5"><Phone size={14} className="vision-text-muted" /><p className="text-xs vision-text-muted">{t.tel}</p></div>
                  <div className="flex items-center gap-1"><Mail size={14} className="vision-text-muted" /><p className="text-xs vision-text-muted truncate">{t.email}</p></div>
                </div>
              </div>
              {prop && <motion.div whileHover={{ x: 2 }} className="vision-surface rounded-xl p-3 mb-3 flex items-center gap-2"><MapPin size={14} style={{ color: sci.color }} className="flex-shrink-0" /><div className="min-w-0"><p className="text-xs font-semibold vision-text truncate">{prop.address}</p><p className="text-xs vision-text-muted">{prop.ville} · {prop.type}</p></div></motion.div>}
              <div className="mb-3"><div className="flex justify-between mb-1.5"><span className="text-xs vision-text-muted">{formatBailDate(t.debutBail)}</span><span className="text-xs vision-text-muted">{formatBailDate(t.finBail)}</span></div><GBar pct={pct} color={sci.color} /><p className="text-xs vision-text-muted mt-1">{pct < 100 ? `${100 - pct}% de bail restant` : "Bail terminé"}</p></div>
              <div className="flex items-center justify-between pt-3 border-t border-[var(--v-border-subtle)]">
                <div><p className="text-xs vision-text-muted">Loyer</p><p className="text-sm font-bold font-mono vision-text">{fmt(t.loyer)}</p></div>
                {t.charges > 0 && <div><p className="text-xs vision-text-muted">Charges</p><p className="text-xs font-mono vision-text-muted">{fmt(t.charges)}</p></div>}
                <div><p className="text-xs vision-text-muted">Total</p><p className="text-sm font-bold font-mono" style={{ color: "#34d399" }}>{fmt(t.loyer + t.charges)}</p></div>
              </div>
              <AnimatePresence>
                {confirmDel === t.id ? <DelConfirm onConfirm={() => { onDelete(t.id); setConfirmDel(null); }} onCancel={() => setConfirmDel(null)} /> : <motion.button whileHover={{ backgroundColor: "rgba(239,68,68,0.07)" }} onClick={() => setConfirmDel(t.id)} className="w-full mt-3 py-1.5 rounded-xl text-xs vision-text-faint hover:vision-negative-text border border-transparent hover:border-red-400/14 transition-all">Supprimer</motion.button>}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </motion.div>
      <PaginationBar page={paging.page} totalPages={paging.totalPages} total={paging.total} from={paging.from} to={paging.to} onChange={paging.setPage} />
    </div>
  );
}

// ─── COMPTABILITÉ ─────────────────────────────────────────────────────────────

function ComptabiliteView({ properties, scis, onSelectSci, onOpenFullPage }: { properties: Property[]; scis: SCI[]; onSelectSci: (id: string) => void; onOpenFullPage: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [filterResult, setFilterResult] = useState<"all" | "pos" | "neg">("all");
  const filteredScis = useMemo(() => scis.filter((sci) => {
    const props = properties.filter((p) => p.sciId === sci.id);
    const res = props.reduce((s, p) => s + cashFlow(p), 0);
    if (filterResult === "pos" && res < 0) return false;
    if (filterResult === "neg" && res >= 0) return false;
    return matchesSearch(query, sci.name, sci.shortName, sci.type);
  }), [scis, properties, query, filterResult]);
  const grandCF = properties.reduce((s, p) => s + cashFlow(p), 0);
  const barData = filteredScis.map((sci) => { const props = properties.filter((p) => p.sciId === sci.id); return { name: sci.shortName, revenus: props.reduce((s, p) => s + p.loyer, 0), charges: props.reduce((s, p) => s + (p.credit?.mensualite ?? 0) + p.taxeFonciere / 12 + p.assurance / 12, 0), fill: sci.color }; });
  const pageSize = useDuoGridPageSize();
  const paging = usePagination(filteredScis, `${query}-${filterResult}-${filteredScis.length}`, pageSize);
  const filtersActive = query !== "" || filterResult !== "all";
  const resetFilters = () => { setQuery(""); setFilterResult("all"); };
  return (
    <div className={`${pageWrap} space-y-4 md:space-y-5`}>
      <motion.div variants={itemV} initial="hidden" animate="show" className={`${GE} p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4`} style={{ borderColor: grandCF >= 0 ? "rgba(52,211,153,0.2)" : "rgba(248,113,113,0.2)" }}>
        <div><p className={lbl}>Résultat net consolidé mensuel</p><p className="text-3xl sm:text-4xl font-bold" style={{ color: grandCF >= 0 ? "#34d399" : "#f87171", fontFamily: "'JetBrains Mono',monospace" }}>{grandCF >= 0 ? "+" : ""}{fmt(grandCF)}</p></div>
        <p className="vision-text-muted text-sm font-mono">{fmt(grandCF * 12)} / an</p>
      </motion.div>
      <SearchBar value={query} onChange={setQuery} placeholder="Rechercher une entité…" />
      <FiltersPanel onReset={resetFilters} resetVisible={filtersActive}>
            <FilterSelect
              label="Résultat"
              value={filterResult}
              onChange={(v) => setFilterResult(v as "all" | "pos" | "neg")}
              options={[
                { value: "all", label: `Tous (${scis.length})` },
                { value: "pos", label: "Positif" },
                { value: "neg", label: "Négatif" },
              ]}
            />
      </FiltersPanel>
      <motion.div variants={itemV} initial="hidden" animate="show" transition={{ delay: 0.1 }} className={`${G} p-5`}>
        <p className={`${lbl} mb-4`}>Revenus vs Charges par entité</p>
        <ResponsiveContainer width="100%" height={210}>
          <BarChart data={barData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
            <XAxis dataKey="name" tick={chartAxisTick} axisLine={false} tickLine={false} />
            <YAxis tick={chartAxisTick} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<ChartTooltipContent unit="currency" />} />
            <Bar dataKey="revenus" name="Revenus" radius={[4, 4, 0, 0]}>{barData.map((d, i) => <Cell key={i} fill={d.fill} opacity={0.78} />)}</Bar>
            <Bar dataKey="charges" name="Charges" radius={[4, 4, 0, 0]}>{barData.map((d, i) => <Cell key={i} fill={d.fill} opacity={0.32} />)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
      {filteredScis.length === 0 ? <FilterEmpty /> : null}
      <motion.div variants={gridV} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-2 gap-4 md:gap-5 w-full">
        {paging.pageItems.map((sci) => {
          const props = properties.filter((p) => p.sciId === sci.id);
          const loyers = props.reduce((s, p) => s + p.loyer, 0);
          const credits = props.reduce((s, p) => s + (p.credit?.mensualite ?? 0), 0);
          const taxes = props.reduce((s, p) => s + p.taxeFonciere / 12, 0);
          const assurances = props.reduce((s, p) => s + p.assurance / 12, 0);
          const res = loyers - credits - taxes - assurances;
          const maxV = Math.max(loyers, credits + taxes + assurances, 1);
          return (
            <motion.div key={sci.id} variants={itemV} whileHover={{ y: -2 }} onClick={() => onSelectSci(sci.id)} className={`${G} overflow-hidden cursor-pointer`}>
              <div className={`px-5 py-4 bg-gradient-to-r ${sci.gradient} flex items-center justify-between gap-3`}>
                <div className="flex items-center gap-3 min-w-0"><div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: `${sci.color}25`, color: sci.color }}>{sci.shortName.slice(0, 2)}</div><p className="font-bold vision-text text-sm truncate">{sci.name}</p></div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <p className="text-xl font-bold font-mono" style={{ color: res >= 0 ? "#34d399" : "#f87171" }}>{res >= 0 ? "+" : ""}{fmt(res)}</p>
                  <motion.button whileHover={{ scale: 1.1 }} title="Pleine page" onClick={(e) => { e.stopPropagation(); onOpenFullPage(sci.id); }} className="w-7 h-7 rounded-lg vision-surface hover:bg-blue-500/20 flex items-center justify-center vision-text-muted hover:vision-info-text transition-all"><Maximize2 size={11} /></motion.button>
                </div>
              </div>
              <div className="p-5 space-y-4">
                {[{ label: "Loyers", value: loyers, color: "#34d399", dir: "▲" }, { label: "Crédits", value: credits, color: "#f87171", dir: "▼" }, { label: "Taxe foncière", value: taxes, color: "#fbbf24", dir: "▼" }, { label: "Assurances", value: assurances, color: "#94a3b8", dir: "▼" }].map((row) => (
                  <div key={row.label}><div className="flex justify-between items-center mb-1.5"><p className="text-xs vision-text-muted">{row.label}</p><p className="text-xs font-bold font-mono" style={{ color: row.color }}>{row.dir} {fmt(row.value)}</p></div><GBar pct={(row.value / maxV) * 100} color={row.color} /></div>
                ))}
                <div className="pt-3 border-t border-[var(--v-border-subtle)] flex justify-between items-center"><span className="text-xs vision-text-muted">Résultat mensuel</span><span className="text-base font-bold font-mono" style={{ color: res >= 0 ? "#34d399" : "#f87171" }}>{res >= 0 ? "+" : ""}{fmt(res)}</span></div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
      <PaginationBar page={paging.page} totalPages={paging.totalPages} total={paging.total} from={paging.from} to={paging.to} onChange={paging.setPage} />
    </div>
  );
}

// ─── PATRIMOINE ───────────────────────────────────────────────────────────────

function PatrimoineView({ properties, scis, onSelectProperty, onOpenFullPage }: { properties: Property[]; scis: SCI[]; onSelectProperty: (id: string) => void; onOpenFullPage: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [filterSci, setFilterSci] = useState("all");
  const [filterPv, setFilterPv] = useState<"all" | "pos" | "neg">("all");
  const items = useMemo(() => properties
    .map((p) => {
      const cr = p.prixAchat + p.travaux + p.fraisNotaire;
      const pv = p.valeurActuelle - cr;
      return { p, cr, pv, pct: cr > 0 ? (pv / cr) * 100 : 0, sci: sciOf(p, scis) };
    })
    .filter((x) => {
      if (filterSci !== "all" && x.p.sciId !== filterSci) return false;
      if (filterPv === "pos" && x.pv < 0) return false;
      if (filterPv === "neg" && x.pv >= 0) return false;
      return matchesSearch(query, x.p.address, x.p.ville, x.p.type, x.sci.shortName, x.sci.name);
    })
    .sort((a, b) => b.pv - a.pv), [properties, scis, query, filterSci, filterPv]);
  const paging = usePagination(items, `${filterSci}-${filterPv}-${query}-${items.length}`);
  const totalPV = items.reduce((s, x) => s + x.pv, 0);
  const filtersActive = query !== "" || filterSci !== "all" || filterPv !== "all";
  const resetFilters = () => { setQuery(""); setFilterSci("all"); setFilterPv("all"); };
  return (
    <div className={`${pageWrap} space-y-4 md:space-y-5`}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[{ l: "Coût de revient total", v: fmt(items.reduce((s, x) => s + x.cr, 0)), c: "rgba(255,255,255,0.65)" }, { l: "Valeur de marché", v: fmt(scis.reduce((s, x) => s + x.valeurEstimee, 0)), c: "#60a5fa" }, { l: "Plus-value latente", v: `${totalPV >= 0 ? "+" : ""}${fmt(totalPV)}`, c: totalPV >= 0 ? "#34d399" : "#f87171" }].map((k, i) => (
          <motion.div key={k.l} variants={itemV} initial="hidden" animate="show" transition={{ delay: i * 0.07 }} className={`${G} p-4`}><p className={lbl}>{k.l}</p><p className="text-xl font-bold font-mono" style={{ color: k.c }}>{k.v}</p></motion.div>
        ))}
      </div>
      <SearchBar value={query} onChange={setQuery} placeholder="Rechercher un bien, une ville, une SCI…" />
      <FiltersPanel onReset={resetFilters} resetVisible={filtersActive}>
            <FilterSelect
              label="Entité"
              value={filterSci}
              onChange={setFilterSci}
              options={[
                { value: "all", label: "Toutes entités" },
                ...scis.map((s) => ({ value: s.id, label: s.shortName })),
              ]}
            />
            <FilterSelect
              label="Plus-value"
              value={filterPv}
              onChange={(v) => setFilterPv(v as "all" | "pos" | "neg")}
              options={[
                { value: "all", label: "Toutes" },
                { value: "pos", label: "Positive" },
                { value: "neg", label: "Négative" },
              ]}
            />
      </FiltersPanel>
      <motion.div variants={itemV} initial="hidden" animate="show" transition={{ delay: 0.15 }} className={`${G} p-5`}>
        <p className={`${lbl} mb-4`}>Évolution 2017 – 2024 · k€</p>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={PATRIMOINE_DATA} margin={{ top: 5, right: 5, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="pv2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#60a5fa" stopOpacity={0.26} /><stop offset="100%" stopColor="#60a5fa" stopOpacity={0} /></linearGradient>
              <linearGradient id="pn2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34d399" stopOpacity={0.26} /><stop offset="100%" stopColor="#34d399" stopOpacity={0} /></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
            <XAxis dataKey="an" tick={chartAxisTick} axisLine={false} tickLine={false} />
            <YAxis tick={chartAxisTick} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}k`} />
            <Tooltip content={<ChartTooltipContent unit="k" />} />
            <Area type="monotone" dataKey="valeur" stroke="#60a5fa" strokeWidth={2.5} fill="url(#pv2)" name="Valeur brute" />
            <Area type="monotone" dataKey="dette" stroke="#f87171" strokeWidth={1.5} fill="none" strokeDasharray="5 3" name="Dette" />
            <Area type="monotone" dataKey="net" stroke="#34d399" strokeWidth={2.5} fill="url(#pn2)" name="Net" />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {items.length === 0 ? <FilterEmpty /> : null}
      {/* Desktop table / mobile cards */}
      <motion.div variants={itemV} initial="hidden" animate="show" transition={{ delay: 0.2 }} className={`${G} overflow-hidden`}>
        <div className="px-5 py-4 border-b border-[var(--v-border-subtle)]"><p className={lbl}>Plus-values latentes par bien</p></div>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-[var(--v-border-subtle)]">{["Bien", "Entité", "Coût de revient", "Valeur actuelle", "Plus-value", "Gain %"].map((h) => <th key={h} className="text-left px-5 py-3 vision-table-head whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>
              {paging.pageItems.map(({ p, cr, pv, pct, sci }, i) => (
                <motion.tr key={p.id} variants={rowV} initial="hidden" animate="show" transition={{ delay: i * 0.04 }} onClick={() => onSelectProperty(p.id)} className="border-b border-[var(--v-border-subtle)] hover:vision-surface transition-colors cursor-pointer group">
                  <td className="px-5 py-3.5"><p className="text-sm vision-text font-medium">{p.address}</p><p className="text-xs vision-text-muted">{p.ville} · {p.type}</p></td>
                  <td className="px-5 py-3.5"><SCIChip sci={sci} /></td>
                  <td className="px-5 py-3.5 font-mono text-xs vision-text-muted">{fmt(cr)}</td>
                  <td className="px-5 py-3.5 font-mono text-xs font-semibold vision-text/82">{fmt(p.valeurActuelle)}</td>
                  <td className="px-5 py-3.5 font-mono text-sm font-bold" style={{ color: pv >= 0 ? "#34d399" : "#f87171" }}>{pv >= 0 ? "+" : ""}{fmt(pv)}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold" style={{ color: pct >= 0 ? "#34d399" : "#f87171" }}>{pct >= 0 ? "+" : ""}{pct.toFixed(1)}%</span>
                      <motion.button whileHover={{ scale: 1.1 }} title="Pleine page" onClick={(e) => { e.stopPropagation(); onOpenFullPage(p.id); }} className="w-7 h-7 rounded-lg vision-surface hover:bg-blue-500/20 flex items-center justify-center vision-text-muted hover:vision-info-text opacity-0 group-hover:opacity-100 transition-all"><Maximize2 size={11} /></motion.button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="md:hidden p-4 space-y-2">
          {paging.pageItems.map(({ p, pv, pct, sci }) => (
            <button key={p.id} type="button" onClick={() => onSelectProperty(p.id)} className="w-full flex items-center justify-between py-3 border-b border-[var(--v-border-subtle)] last:border-0 text-left hover:vision-surface px-1 rounded-lg transition-colors">
              <div className="min-w-0 mr-3"><p className="text-xs font-medium vision-text truncate">{p.address}</p><p className="text-xs vision-text-muted">{p.ville}</p><div className="mt-1"><SCIChip sci={sci} /></div></div>
              <div className="text-right flex-shrink-0"><p className="text-sm font-bold font-mono" style={{ color: pv >= 0 ? "#34d399" : "#f87171" }}>{pv >= 0 ? "+" : ""}{fmt(pv)}</p><p className="text-xs font-mono" style={{ color: pct >= 0 ? "#34d399" : "#f87171" }}>{pct >= 0 ? "+" : ""}{pct.toFixed(1)}%</p></div>
            </button>
          ))}
        </div>
      </motion.div>
      <PaginationBar page={paging.page} totalPages={paging.totalPages} total={paging.total} from={paging.from} to={paging.to} onChange={paging.setPage} />
    </div>
  );
}

// ─── ALERTES — TIMELINE ───────────────────────────────────────────────────────

function AlertesView({ alerts, onDelete, onSelectAlert, onOpenFullPage }: { alerts: AlertItem[]; onDelete: (id: string) => void; onSelectAlert: (id: string) => void; onOpenFullPage: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [filterSev, setFilterSev] = useState<"all" | AlertItem["severity"]>("all");
  const [filterType, setFilterType] = useState<"all" | AlertItem["type"]>("all");
  const iconMap = { bail: Key, credit: CreditCard, taxe: Calendar, assurance: Shield, info: AlertTriangle };
  const sevCfg = {
    high: { color: "#f87171", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.22)", label: "Urgent", dot: "#ef4444" },
    medium: { color: "#fbbf24", bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.18)", label: "Important", dot: "#f59e0b" },
    low: { color: "rgba(255,255,255,0.38)", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.09)", label: "Info", dot: "rgba(255,255,255,0.28)" },
  };
  const sorted = useMemo(() => [...alerts]
    .filter((a) => {
      if (filterSev !== "all" && a.severity !== filterSev) return false;
      if (filterType !== "all" && a.type !== filterType) return false;
      return matchesSearch(query, a.title, a.detail, a.type, a.severity);
    })
    .sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.severity] - { high: 0, medium: 1, low: 2 }[b.severity])),
  [alerts, filterSev, filterType, query]);
  const paging = usePagination(sorted, `${filterSev}-${filterType}-${query}-${sorted.length}`);
  const filtersActive = query !== "" || filterSev !== "all" || filterType !== "all";
  const resetFilters = () => { setQuery(""); setFilterSev("all"); setFilterType("all"); };
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {(["high", "medium", "low"] as const).map((sev, i) => {
          const cfg = sevCfg[sev]; const cnt = alerts.filter((a) => a.severity === sev).length;
          return <motion.div key={sev} variants={itemV} initial="hidden" animate="show" transition={{ delay: i * 0.07 }} className={`${G} p-4`} style={{ borderColor: cfg.border }}><p className="text-xs vision-text-muted mb-1">{cfg.label}s</p><p className="text-3xl font-bold" style={{ color: cfg.color, fontFamily: "'JetBrains Mono',monospace" }}>{cnt}</p></motion.div>;
        })}
      </div>
      <SearchBar value={query} onChange={setQuery} placeholder="Rechercher une alerte…" />
      <FiltersPanel onReset={resetFilters} resetVisible={filtersActive}>
            <FilterSelect
              label="Urgence"
              value={filterSev}
              onChange={(v) => setFilterSev(v as "all" | AlertItem["severity"])}
              options={[
                { value: "all", label: `Toutes (${alerts.length})` },
                ...(["high", "medium", "low"] as const).map((sev) => ({
                  value: sev,
                  label: `${sevCfg[sev].label} (${alerts.filter((a) => a.severity === sev).length})`,
                })),
              ]}
            />
            <FilterSelect
              label="Type"
              value={filterType}
              onChange={(v) => setFilterType(v as "all" | AlertItem["type"])}
              options={[
                { value: "all", label: "Tous types" },
                ...(["bail", "credit", "taxe", "assurance", "info"] as const).map((t) => ({
                  value: t,
                  label: `${t} (${alerts.filter((a) => a.type === t).length})`,
                })),
              ]}
            />
      </FiltersPanel>
      {sorted.length === 0 ? <FilterEmpty label={alerts.length === 0 ? "Aucune alerte active" : "Aucun résultat pour ces filtres"} /> : null}
      <div className="relative min-w-0">
        <div className="absolute left-3 sm:left-5 top-2 bottom-2 w-px hidden sm:block" style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.12), rgba(255,255,255,0.03))" }} />
        <div className="space-y-3 pl-0 sm:pl-12">
          {paging.pageItems.map((a, i) => {
            const cfg = sevCfg[a.severity]; const Icon = iconMap[a.type];
            return (
              <motion.div key={a.id} variants={rowV} initial="hidden" animate="show" transition={{ delay: i * 0.06 }} whileHover={{ x: 3 }} onClick={() => onSelectAlert(a.id)}
                className="relative rounded-2xl p-4 backdrop-blur-xl border flex items-start gap-4 cursor-pointer" style={{ backgroundColor: cfg.bg, borderColor: cfg.border }}>
                <div className="absolute -left-[2.85rem] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 hidden sm:flex items-center justify-center" style={{ backgroundColor: cfg.dot, borderColor: "var(--v-bg-1)" }}><div className="w-1.5 h-1.5 rounded-full bg-[var(--v-text)] opacity-80" /></div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${cfg.color}18` }}><Icon size={16} style={{ color: cfg.color }} /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div><p className="text-sm font-bold vision-text">{a.title}</p><p className="text-xs vision-text/37 mt-0.5 leading-relaxed">{a.detail}</p></div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full" style={{ backgroundColor: `${cfg.color}18`, color: cfg.color }}>{cfg.label}</span>
                      <motion.button whileHover={{ scale: 1.1 }} title="Pleine page" onClick={(e) => { e.stopPropagation(); onOpenFullPage(a.id); }} className="w-7 h-7 rounded-xl vision-surface hover:bg-blue-500/20 flex items-center justify-center vision-text-muted hover:vision-info-text transition-colors"><Maximize2 size={14} /></motion.button>
                      <motion.button whileHover={{ scale: 1.1, rotate: 90 }} transition={{ duration: 0.18 }} onClick={(e) => { e.stopPropagation(); onDelete(a.id); }} className="w-7 h-7 rounded-xl vision-surface hover:bg-red-500/28 flex items-center justify-center vision-text-muted hover:vision-negative-text transition-colors"><X size={13} /></motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
      <PaginationBar page={paging.page} totalPages={paging.totalPages} total={paging.total} from={paging.from} to={paging.to} onChange={paging.setPage} />
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────

const ALL_NAV: { id: View; label: string; Icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { id: "sci", label: "SCI", Icon: Building2 },
  { id: "biens", label: "Biens", Icon: Home },
  { id: "credits", label: "Crédits", Icon: CreditCard },
  { id: "location", label: "Locataires", Icon: Users },
  { id: "comptabilite", label: "Comptabilité", Icon: FileText },
  { id: "patrimoine", label: "Patrimoine", Icon: TrendingUp },
  { id: "dossiers", label: "Dossiers banque", Icon: Banknote },
  { id: "comptes", label: "Comptes", Icon: UserCog },
  { id: "portail-banque", label: "Portail banque", Icon: Landmark },
  { id: "alertes", label: "Alertes", Icon: Bell },
];

const APP_ROUTES = [
  "/",
  "/login",
  "/dashboard",
  "/sci",
  "/sci/:id",
  "/sci/:id/edit",
  "/biens",
  "/biens/:id",
  "/biens/:id/edit",
  "/biens/:id/credit",
  "/biens/:id/credit/edit",
  "/credits",
  "/credits/:id",
  "/credits/:id/edit",
  "/location",
  "/location/:id",
  "/location/:id/edit",
  "/comptabilite",
  "/comptabilite/:sciId",
  "/patrimoine",
  "/dossiers",
  "/comptes",
  "/portail-banque",
  "/alertes",
  "/alertes/:id",
] as const;

export default function App() {
  return (
    <Routes>
      {APP_ROUTES.map((path) => (
        <Route key={path} path={path} element={<VisionShell />} />
      ))}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function VisionShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const useSupabase = isSupabaseConfigured();
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => getStoredUser());
  const [authChecked, setAuthChecked] = useState(false);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [properties, setProperties] = useState<Property[]>(() => (useSupabase ? [] : PROPS_INIT));
  const [scis, setScis] = useState<SCI[]>(() => (useSupabase ? [] : SCIS_INIT));
  const [tenants, setTenants] = useState<Tenant[]>(() => (useSupabase ? [] : TENANTS_INIT));
  const [alerts, setAlerts] = useState<AlertItem[]>(() => (useSupabase ? [] : ALERTS_INIT));
  const [dataError, setDataError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [themeId, setThemeId] = useState(() => loadThemeId());
  const [customColors, setCustomColors] = useState<CustomThemeColors>(() => loadCustomColors());
  const [apiOnline, setApiOnline] = useState(false);
  const [drawerTarget, setDrawerTarget] = useState<DetailTarget | null>(null);

  const parsed = useMemo(() => parseAppLocation(location.pathname), [location.pathname]);
  const portfolioSegment = readSegment(location.search);
  const view: View = parsed?.view ?? (authUser ? defaultViewForRole(authUser.role) : "dashboard");
  const fullPageTarget = parsed?.detail ?? null;
  const fullPageEditing = !!parsed?.editing;
  const propertySection = fullPageTarget?.kind === "property" ? (fullPageTarget.section ?? "property") : "property";

  const go = (path: string, opts?: { replace?: boolean }) => {
    navigate(withSearch(path, { segment: portfolioSegment }), opts);
  };

  const setPortfolioSegment = (segment: PortfolioSegment) => {
    navigate(withSearch(location.pathname, { segment }), { replace: true });
  };

  const navItems = useMemo(
    () => (authUser ? ALL_NAV.filter((n) => canAccessView(authUser, n.id)) : []),
    [authUser],
  );

  const visibleProperties = useMemo(
    () => (authUser ? filterProperties(authUser, properties, scis) : []),
    [authUser, properties, scis],
  );
  const visibleScis = useMemo(
    () => (authUser ? filterScisWithProperties(authUser, scis, visibleProperties) : []),
    [authUser, scis, visibleProperties],
  );
  const visibleTenants = useMemo(() => {
    if (!authUser) return [];
    const propIds = new Set(visibleProperties.map((p) => p.id));
    return tenants.filter((t) => propIds.has(t.propertyId));
  }, [authUser, tenants, visibleProperties]);

  /** Investissement (SCI) vs Résidence principale — totalement séparés (KPI / quote-part / listes) */
  const segmentScis = useMemo(
    () => (portfolioSegment === "residence"
      ? filterResidenceEntities(visibleScis)
      : filterInvestmentEntities(visibleScis)),
    [visibleScis, portfolioSegment],
  );
  const segmentProperties = useMemo(
    () => filterPropertiesByEntities(visibleProperties, segmentScis),
    [visibleProperties, segmentScis],
  );
  const segmentTenants = useMemo(() => {
    const ids = new Set(segmentProperties.map((p) => p.id));
    return visibleTenants.filter((t) => ids.has(t.propertyId));
  }, [visibleTenants, segmentProperties]);

  const detailCtx = { properties: visibleProperties, scis: visibleScis, tenants: visibleTenants, alerts };
  const openDrawer = (target: DetailTarget) => setDrawerTarget(target);
  const closeDrawer = () => setDrawerTarget(null);
  const openFullPage = (target: DetailTarget, editing = false) => {
    setDrawerTarget(null);
    go(detailPath(target, { editing, fromView: view }));
  };
  const closeFullPage = () => go(viewPath(view));
  const openPropertyDrawer = (id: string, credit = false) => openDrawer({ kind: "property", id, section: credit ? "credit" : "property" });
  const openPropertyFullPage = (id: string, section: "property" | "credit" = "property") => openFullPage({ kind: "property", id, section });
  const handlePropertySectionChange = (s: "property" | "credit") => {
    if (fullPageTarget?.kind !== "property") return;
    go(detailPath({ kind: "property", id: fullPageTarget.id, section: s }, { editing: fullPageEditing, fromView: view }));
  };

  const handleThemeChange = (id: string) => {
    setThemeId(id);
    if (id === "custom") {
      applyVisionTheme("custom", customToVars(customColors), { isLight: customColors.isLight });
    } else {
      const vars = getPresetVars(id);
      if (vars) applyVisionTheme(id, vars);
    }
  };

  const handleCustomChange = (c: CustomThemeColors) => {
    setCustomColors(c);
    setThemeId("custom");
  };

  useEffect(() => {
    const id = loadThemeId();
    const custom = loadCustomColors();
    if (id === "custom") {
      applyVisionTheme("custom", customToVars(custom), { isLight: custom.isLight });
    } else {
      const vars = getPresetVars(id);
      if (vars) applyVisionTheme(id, vars);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unsub: (() => void) | undefined;

    (async () => {
      try {
        if (useSupabase) {
          const hash = typeof window !== "undefined" ? window.location.hash : "";
          const recoveryFromLink = hash.includes("type=recovery");
          if (recoveryFromLink) setPasswordRecovery(true);

          if (supabase) {
            const { data: sub } = supabase.auth.onAuthStateChange((event) => {
              if (event === "PASSWORD_RECOVERY") {
                setPasswordRecovery(true);
                setAuthUser(null);
              }
            });
            unsub = () => sub.subscription.unsubscribe();
          }

          if (recoveryFromLink) {
            setAuthChecked(true);
            return;
          }

          const user = await supabaseGetSessionUser();
          if (cancelled) return;
          if (user) {
            storeUser(user);
            setAuthUser(user);
          } else {
            clearSession();
            setAuthUser(null);
          }
        } else {
          const token = localStorage.getItem("vision_auth_token");
          if (!token) {
            // Session Supabase résiduelle sans token API → forcer une vraie reconnexion
            clearSession();
            if (!cancelled) setAuthUser(null);
            setAuthChecked(true);
            return;
          }
          const { user } = await api.me();
          if (cancelled) return;
          storeUser(user);
          setAuthUser(user);
        }
      } catch {
        if (!cancelled) {
          clearSession();
          setAuthUser(null);
        }
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    })();

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [useSupabase]);

  useEffect(() => {
    if (!authUser) return;
    let cancelled = false;

    (async () => {
      if (useSupabase) {
        try {
          const data = await fetchPortfolio();
          if (cancelled) return;
          setScis(data.scis as SCI[]);
          setProperties(data.properties.map((p) => ({
            ...p,
            credit: p.credit ? enrichCredit(p.credit as Credit) : undefined,
          })));
          setTenants(data.tenants as Tenant[]);
          setAlerts(data.alerts as AlertItem[]);
          setApiOnline(true);
          setDataError("");
        } catch (e) {
          if (!cancelled) {
            setDataError(e instanceof Error ? e.message : "Erreur chargement Supabase");
            setApiOnline(false);
          }
        }
        return;
      }

      isApiAvailable().then(async (online) => {
        if (cancelled) return;
        setApiOnline(online);
        if (!online) return;
        try {
          const [entities, props] = await Promise.all([api.getEntities(), api.getProperties()]);
          if (cancelled) return;
          if (entities.length) {
            setScis(entities.map((e) => ({
              id: e.id,
              name: e.name,
              shortName: e.shortName,
              type: e.type,
              creation: e.creation,
              valeurEstimee: e.valeurEstimee,
              color: e.color,
              gradient: e.gradient ?? "",
              associes: e.associes,
            })));
          }
          if (props.length) {
            setProperties(props.map((p) => ({
              id: String(p.id),
              sciId: String(p.sciId),
              address: String(p.address),
              ville: String(p.ville),
              cp: String(p.cp),
              type: String(p.type),
              surface: Number(p.surface),
              lots: Number(p.lots),
              prixAchat: Number(p.prixAchat),
              travaux: Number(p.travaux),
              fraisNotaire: Number(p.fraisNotaire),
              valeurActuelle: Number(p.valeurActuelle),
              loyer: Number(p.loyer),
              taxeFonciere: Number(p.taxeFonciere),
              assurance: Number(p.assurance),
              credit: p.credit ? enrichCredit(p.credit as Credit) : undefined,
            })));
          }
        } catch {
          if (!cancelled) setApiOnline(false);
        }
      });
    })();

    return () => { cancelled = true; };
  }, [authUser, useSupabase]);

  const handleLogin = (user: AuthUser) => {
    setAuthUser(user);
    closeDrawer();
    navigate(withSearch(viewPath(defaultViewForRole(user.role))), { replace: true });
  };

  useEffect(() => {
    if (!authChecked) return;
    if (!authUser || passwordRecovery) {
      if (location.pathname !== "/login") navigate("/login", { replace: true });
      return;
    }
    if (location.pathname === "/" || location.pathname === "/login") {
      navigate(withSearch(viewPath(defaultViewForRole(authUser.role)), { segment: portfolioSegment }), { replace: true });
      return;
    }
    if (!parsed || !canAccessView(authUser, parsed.view)) {
      navigate(withSearch(viewPath(defaultViewForRole(authUser.role)), { segment: portfolioSegment }), { replace: true });
    }
  }, [authChecked, authUser, passwordRecovery, location.pathname, parsed, portfolioSegment, navigate]);

  const handleLogout = async () => {
    if (useSupabase) await supabaseLogout().catch(() => {});
    else await api.logout().catch(() => {});
    clearSession();
    setAuthUser(null);
    if (useSupabase) {
      setScis([]);
      setProperties([]);
      setTenants([]);
      setAlerts([]);
    }
    closeDrawer();
    navigate("/login", { replace: true });
  };

  const reloadPortfolio = async () => {
    if (!useSupabase) return;
    const data = await fetchPortfolio();
    setScis(data.scis as SCI[]);
    setProperties(data.properties.map((p) => ({
      ...p,
      credit: p.credit ? enrichCredit(p.credit as Credit) : undefined,
    })));
    setTenants(data.tenants as Tenant[]);
    setAlerts(data.alerts as AlertItem[]);
  };

  const addProp = async (p: Property) => {
    if (useSupabase) {
      try {
        const saved = await sbUpsertProperty(p);
        setProperties((ps) => [...ps, { ...p, ...saved, credit: saved.credit ? enrichCredit(saved.credit as Credit) : undefined }]);
        setDataError("");
        toast.success("Bien enregistré en base");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Enregistrement bien impossible";
        setDataError(msg);
        toast.error(msg);
        throw e;
      }
      return;
    }
    setProperties((ps) => [...ps, p]);
    if (apiOnline) {
      await api.createProperty({
        entityId: p.sciId,
        address: p.address,
        ville: p.ville,
        cp: p.cp,
        type: p.type,
        surface: p.surface,
        lots: p.lots,
        prixAchat: p.prixAchat,
        travaux: p.travaux,
        fraisNotaire: p.fraisNotaire,
        valeurActuelle: p.valeurActuelle,
        loyer: p.loyer,
        taxeFonciere: p.taxeFonciere,
        assurance: p.assurance,
        credit: p.credit,
      }).catch(() => {});
    }
  };
  const updProp = async (p: Property) => {
    if (useSupabase) {
      try {
        const saved = await sbUpsertProperty(p);
        setProperties((ps) =>
          ps.map((x) =>
            x.id === p.id || x.id === saved.id
              ? { ...p, ...saved, credit: saved.credit ? enrichCredit(saved.credit as Credit) : undefined }
              : x,
          ),
        );
        setDataError("");
        toast.success("Modifications enregistrées en base");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Mise à jour bien impossible";
        setDataError(msg);
        toast.error(msg);
        await reloadPortfolio().catch(() => {});
        throw e;
      }
      return;
    }
    setProperties((ps) => ps.map((x) => (x.id === p.id ? p : x)));
    if (apiOnline) {
      await api.updateProperty(p.id, {
        entityId: p.sciId,
        address: p.address,
        ville: p.ville,
        cp: p.cp,
        type: p.type,
        surface: p.surface,
        lots: p.lots,
        prixAchat: p.prixAchat,
        travaux: p.travaux,
        fraisNotaire: p.fraisNotaire,
        valeurActuelle: p.valeurActuelle,
        loyer: p.loyer,
        taxeFonciere: p.taxeFonciere,
        assurance: p.assurance,
        credit: p.credit,
      }).catch(() => {});
    }
  };
  const delProp = async (id: string) => {
    if (useSupabase) {
      try {
        await sbDeleteProperty(id);
        setProperties((ps) => ps.filter((x) => x.id !== id));
        toast.success("Bien supprimé de la base");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Suppression bien impossible";
        setDataError(msg);
        toast.error(msg);
        await reloadPortfolio().catch(() => {});
        throw e;
      }
      return;
    }
    setProperties((ps) => ps.filter((x) => x.id !== id));
    if (apiOnline) await api.deleteProperty(id).catch(() => {});
  };
  const addSCI = async (s: SCI) => {
    if (useSupabase) {
      try {
        const saved = await sbUpsertSci(s);
        setScis((ss) => [...ss, { ...s, ...saved }]);
        setDataError("");
        toast.success("SCI enregistrée en base");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Enregistrement SCI impossible";
        setDataError(msg);
        toast.error(msg);
        throw e;
      }
      return;
    }
    setScis((ss) => [...ss, s]);
  };
  const updSCI = async (s: SCI) => {
    if (useSupabase) {
      try {
        const saved = await sbUpsertSci(s);
        setScis((ss) => ss.map((x) => (x.id === s.id || x.id === saved.id ? { ...s, ...saved } : x)));
        setDataError("");
        toast.success("SCI mise à jour en base");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Mise à jour SCI impossible";
        setDataError(msg);
        toast.error(msg);
        await reloadPortfolio().catch(() => {});
        throw e;
      }
      return;
    }
    setScis((ss) => ss.map((x) => (x.id === s.id ? s : x)));
  };
  const delSCI = async (id: string) => {
    if (useSupabase) {
      try {
        await sbDeleteSci(id);
        setScis((ss) => ss.filter((x) => x.id !== id));
        setProperties((ps) => ps.filter((p) => p.sciId !== id));
        toast.success("SCI supprimée de la base");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Suppression SCI impossible";
        setDataError(msg);
        toast.error(msg);
        await reloadPortfolio().catch(() => {});
        throw e;
      }
      return;
    }
    setScis((ss) => ss.filter((x) => x.id !== id));
  };
  const addTenant = async (t: Tenant) => {
    if (useSupabase) {
      try {
        const saved = await sbUpsertTenant(t);
        setTenants((ts) => [...ts, { ...t, ...saved }]);
        setDataError("");
        toast.success("Locataire enregistré en base");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Enregistrement locataire impossible";
        setDataError(msg);
        toast.error(msg);
        throw e;
      }
      return;
    }
    setTenants((ts) => [...ts, t]);
  };
  const updTenant = async (t: Tenant) => {
    if (useSupabase) {
      try {
        const saved = await sbUpsertTenant(t);
        setTenants((ts) => ts.map((x) => (x.id === t.id || x.id === saved.id ? { ...t, ...saved } : x)));
        setDataError("");
        toast.success("Locataire mis à jour en base");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Mise à jour locataire impossible";
        setDataError(msg);
        toast.error(msg);
        await reloadPortfolio().catch(() => {});
        throw e;
      }
      return;
    }
    setTenants((ts) => ts.map((x) => (x.id === t.id ? t : x)));
  };
  const delTenant = async (id: string) => {
    if (useSupabase) {
      try {
        await sbDeleteTenant(id);
        setTenants((ts) => ts.filter((x) => x.id !== id));
        toast.success("Locataire supprimé de la base");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Suppression locataire impossible";
        setDataError(msg);
        toast.error(msg);
        await reloadPortfolio().catch(() => {});
        throw e;
      }
      return;
    }
    setTenants((ts) => ts.filter((x) => x.id !== id));
  };
  const delAlert = async (id: string) => {
    if (useSupabase) {
      try {
        await sbDeleteAlert(id);
        setAlerts((as) => as.filter((x) => x.id !== id));
        toast.success("Alerte supprimée");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Suppression alerte impossible";
        setDataError(msg);
        toast.error(msg);
        throw e;
      }
      return;
    }
    setAlerts((as) => as.filter((x) => x.id !== id));
  };

  const highAlerts = alerts.filter((a) => a.severity === "high").length;
  const handleNav = (v: View) => {
    setSidebarOpen(false);
    closeDrawer();
    go(viewPath(v));
  };

  const bankLoans = useMemo(
    () =>
      visibleProperties
        .filter((p) => p.credit)
        .map((p) => ({
          banque: p.credit!.banque,
          capitalRestant: p.credit!.capitalRestant,
          mensualite: p.credit!.mensualite,
          propertyAddress: `${p.address}, ${p.ville}`,
        })),
    [visibleProperties],
  );

  if (!authChecked) {
    return <div className="min-h-dvh vision-app-bg flex items-center justify-center vision-text-muted text-sm">Chargement…</div>;
  }

  if (!authUser || passwordRecovery) {
    return (
      <LoginPage
        onLogin={(user) => {
          setPasswordRecovery(false);
          handleLogin(user);
        }}
        passwordRecovery={passwordRecovery}
        onPasswordRecoveryDone={() => setPasswordRecovery(false)}
      />
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
    <div className="h-dvh min-h-0 flex overflow-hidden vision-app-bg">
      {/* Blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-64 -left-64 w-[700px] h-[700px] rounded-full" style={{ background: "radial-gradient(circle,var(--v-blob-1) 0%,transparent 65%)" }} />
        <div className="absolute top-[35%] -right-48 w-[500px] h-[500px] rounded-full" style={{ background: "radial-gradient(circle,var(--v-blob-2) 0%,transparent 65%)" }} />
        <div className="absolute -bottom-48 left-[20%] w-[500px] h-[500px] rounded-full" style={{ background: "radial-gradient(circle,var(--v-blob-3) 0%,transparent 65%)" }} />
      </div>

      {/* Mobile backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            className="fixed inset-0 backdrop-blur-sm z-40 xl:hidden" style={{ background: "var(--v-overlay)" }} onClick={() => setSidebarOpen(false)} />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full z-50 w-[min(88vw,252px)] sm:w-[252px] flex flex-col transition-transform duration-300 ease-in-out xl:relative xl:translate-x-0 xl:z-auto xl:w-[252px] xl:flex-shrink-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ background: "var(--v-sidebar-bg)", borderRight: "1px solid var(--v-sidebar-border)", backdropFilter: "blur(24px)" }}>
        <div className="px-5 py-5 flex items-center justify-between">
          <BrandLogo />
          <button onClick={() => setSidebarOpen(false)} className="xl:hidden w-9 h-9 min-h-[44px] rounded-lg vision-glass flex items-center justify-center vision-text-muted"><X size={18} /></button>
        </div>
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map(({ id, label, Icon }) => {
            const active = view === id;
            return (
              <motion.button key={id} onClick={() => handleNav(id)} whileHover={!active ? { x: 3 } : {}} whileTap={{ scale: 0.97 }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-150 ${active ? "vision-nav-active" : "vision-nav-idle hover:opacity-90"}`}>
                <Icon className="vision-nav-icon" strokeWidth={2} />
                <span className="flex-1">{label}</span>
                <AnimatePresence>{id === "alertes" && highAlerts > 0 && <motion.span key="b" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="text-xs font-bold rounded-full min-w-[1.25rem] h-5 px-1 flex items-center justify-center bg-red-500 text-white">{highAlerts}</motion.span>}</AnimatePresence>
              </motion.button>
            );
          })}
        </nav>
        <ThemeSettings themeId={themeId} customColors={customColors} onThemeChange={handleThemeChange} onCustomChange={handleCustomChange} />
        <div className="px-4 py-4" style={{ borderTop: "1px solid var(--v-sidebar-border)" }}>
          <div className="flex items-center gap-3">
            <Ava initiales={authUser.initials} color="var(--v-accent)" size={36} />
            <div className="flex-1 min-w-0">
              <p className="vision-text text-sm font-semibold truncate">{authUser.name}</p>
              <p className="text-xs vision-text-faint">{roleLabel(authUser.role)}</p>
            </div>
            <button type="button" onClick={handleLogout} className="w-9 h-9 rounded-lg vision-glass flex items-center justify-center vision-text-muted hover:vision-text transition-colors" title="Déconnexion">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden relative z-10 w-full">
        <header className="px-4 sm:px-6 py-3.5 flex items-center justify-between flex-shrink-0" style={{ background: "var(--v-header-bg)", borderBottom: "1px solid var(--v-header-border)", backdropFilter: "blur(16px)" }}>
          <div className="flex items-center gap-3">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.94 }} onClick={() => setSidebarOpen(true)} className="xl:hidden w-10 h-10 min-h-[44px] rounded-xl vision-glass flex items-center justify-center vision-text-muted transition-colors"><Menu size={20} /></motion.button>
            <div>
              <h1 className="text-base md:text-lg font-bold vision-text truncate max-w-[50vw] sm:max-w-none" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                {fullPageTarget
                  ? fullPageHeaderTitle(fullPageTarget, detailCtx, PAGE_TITLES[view])
                  : view === "dashboard"
                    ? `${greetingLabel()}, ${authUser.firstName}`
                    : PAGE_TITLES[view]}
              </h1>
              <p className="text-xs sm:text-sm mt-0.5 vision-text-faint sm:block">
                {fullPageTarget
                  ? <span className="hidden sm:inline">{fullPageHeaderSubtitle(fullPageTarget, view, detailCtx)}</span>
                  : <>
                      <span className="sm:hidden">{view === "dashboard" ? new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }) : `${greetingLabel()}, ${authUser.firstName}`}</span>
                      <span className="hidden sm:inline">
                        {view !== "dashboard" && <>{greetingLabel()}, {authUser.firstName} · </>}
                        {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                      </span>
                    </>}
                {!fullPageTarget && apiOnline && <span className="ml-2" style={{ color: "var(--v-positive)" }}>· {useSupabase ? "Supabase" : "API"} connectée</span>}
                {!fullPageTarget && dataError && <span className="ml-2 vision-negative-text">· {dataError}</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.94 }} onClick={() => setThemeModalOpen(true)} className="xl:hidden w-10 h-10 min-h-[44px] rounded-xl vision-glass flex items-center justify-center vision-text-muted" aria-label="Thèmes et couleurs">
              <Palette size={18} style={{ color: "var(--v-accent)" }} />
            </motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.94 }} onClick={() => handleNav("alertes")} className="relative w-10 h-10 min-h-[44px] rounded-xl vision-glass flex items-center justify-center vision-text-muted">
              <Bell size={18} />
              <AnimatePresence>{highAlerts > 0 && <motion.span key="hb" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="absolute -top-0.5 -right-0.5 min-w-[1.125rem] h-[1.125rem] px-0.5 rounded-full flex items-center justify-center text-xs font-bold text-white bg-red-500">{highAlerts}</motion.span>}</AnimatePresence>
            </motion.button>
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden w-full min-w-0 p-3 sm:p-5 md:p-6 lg:p-8 scroll-pb-4">
          <AnimatePresence mode="wait">
            <motion.div key={fullPageTarget ? `fp-${fullPageTarget.kind}-${"id" in fullPageTarget ? fullPageTarget.id : fullPageTarget.sciId}${fullPageEditing ? "-edit" : ""}` : `${view}-${portfolioSegment}`} variants={pageV} initial="hidden" animate="show" exit="exit" className={`${pageWrap} mx-auto pb-2`}>
              {fullPageTarget && fullPageEditing && canManageData(authUser) ? (
                (() => {
                  const exitEdit = () => fullPageTarget && openFullPage(fullPageTarget, false);
                  const afterDelete = () => closeFullPage();
                  if (fullPageTarget.kind === "property") {
                    const p = visibleProperties.find((x) => x.id === fullPageTarget.id);
                    if (!p) return null;
                    if (propertySection === "credit" && p.credit) {
                      const entry: CreditEntry = { ...p.credit, id: `c_${p.id}`, propertyId: p.id };
                      return (
                        <CreditFormView
                          credit={entry}
                          properties={visibleProperties}
                          onBack={exitEdit}
                          onSave={async (c) => {
                            const computed = enrichCredit(c);
                            await updProp({
                              ...p,
                              credit: {
                                banque: computed.banque,
                                montantInitial: computed.montantInitial,
                                taux: computed.taux,
                                duree: computed.duree,
                                debut: computed.debut,
                                assuranceMensuelle: computed.assuranceMensuelle,
                                mensualite: computed.mensualite,
                                capitalRestant: computed.capitalRestant,
                                finCredit: computed.finCredit ?? null,
                              },
                            });
                            exitEdit();
                          }}
                          onDelete={async () => { await updProp({ ...p, credit: undefined }); afterDelete(); }}
                        />
                      );
                    }
                    return (
                      <PropertyForm
                        property={p}
                        scis={visibleScis}
                        existingBanks={visibleProperties.map((x) => x.credit?.banque).filter((b): b is string => Boolean(b))}
                        onBack={exitEdit}
                        onSave={async (next) => { await updProp(next); exitEdit(); }}
                        onDelete={async () => { await delProp(p.id); afterDelete(); }}
                      />
                    );
                  }
                  if (fullPageTarget.kind === "sci") {
                    const s = visibleScis.find((x) => x.id === fullPageTarget.id);
                    if (!s) return null;
                    return (
                      <SCIForm
                        sci={s}
                        existingAssociates={visibleScis.flatMap((x) => x.associes.map((a) => a.name))}
                        onBack={exitEdit}
                        onSave={async (next) => { await updSCI(next); exitEdit(); }}
                        onDelete={async () => { await delSCI(s.id); afterDelete(); }}
                      />
                    );
                  }
                  if (fullPageTarget.kind === "tenant") {
                    const t = visibleTenants.find((x) => x.id === fullPageTarget.id);
                    if (!t) return null;
                    return (
                      <TenantForm
                        tenant={t}
                        properties={visibleProperties}
                        scis={visibleScis}
                        onBack={exitEdit}
                        onSave={async (next) => { await updTenant(next); exitEdit(); }}
                        onDelete={async () => { await delTenant(t.id); afterDelete(); }}
                      />
                    );
                  }
                  return null;
                })()
              ) : fullPageTarget ? (
                <FullPageDetail
                  target={fullPageTarget}
                  view={view}
                  ctx={detailCtx}
                  section={propertySection}
                  onSectionChange={handlePropertySectionChange}
                  onBack={closeFullPage}
                  onOpenProperty={(id) => openPropertyFullPage(id)}
                  onEdit={canManageData(authUser) && fullPageTarget.kind !== "compta" && fullPageTarget.kind !== "alert"
                    ? () => openFullPage(fullPageTarget, true)
                    : undefined}
                  onDelete={canManageData(authUser) ? (() => {
                    if (fullPageTarget.kind === "property") {
                      return () => {
                        if (propertySection === "credit") {
                          const p = visibleProperties.find((x) => x.id === fullPageTarget.id);
                          if (p) updProp({ ...p, credit: undefined });
                        } else {
                          delProp(fullPageTarget.id);
                        }
                        closeFullPage();
                      };
                    }
                    if (fullPageTarget.kind === "sci") return () => { delSCI(fullPageTarget.id); closeFullPage(); };
                    if (fullPageTarget.kind === "tenant") return () => { delTenant(fullPageTarget.id); closeFullPage(); };
                    if (fullPageTarget.kind === "alert") return () => { delAlert(fullPageTarget.id); closeFullPage(); };
                    return undefined;
                  })() : undefined}
                />
              ) : (
                <>
              {SEGMENT_VIEWS.includes(view) && (
                <PortfolioSegmentTabs
                  segment={portfolioSegment}
                  onChange={setPortfolioSegment}
                  investCount={filterInvestmentEntities(visibleScis).length}
                  rpCount={filterResidenceEntities(visibleScis).length}
                />
              )}
              {view === "dashboard" && <DashboardView properties={segmentProperties} scis={segmentScis} user={authUser} onSelectProperty={(id) => openPropertyDrawer(id)} />}
              {view === "sci" && <SCIView scis={segmentScis} properties={segmentProperties} onAdd={canManageData(authUser) ? addSCI : () => {}} onUpdate={canManageData(authUser) ? updSCI : () => {}} onDelete={canManageData(authUser) ? delSCI : () => {}} onSelectSci={(id) => openDrawer({ kind: "sci", id })} onOpenFullPage={(id) => openFullPage({ kind: "sci", id })} />}
              {view === "biens" && <BiensView properties={segmentProperties} scis={segmentScis} onAdd={canManageData(authUser) ? addProp : () => {}} onUpdate={canManageData(authUser) ? updProp : () => {}} onDelete={canManageData(authUser) ? delProp : () => {}} onSelectProperty={(id) => openPropertyDrawer(id)} onOpenFullPage={(id) => openPropertyFullPage(id)} />}
              {view === "credits" && <CreditsView properties={segmentProperties} scis={segmentScis} onUpdateProperty={canManageData(authUser) ? updProp : () => {}} onSelectCredit={(id) => openPropertyDrawer(id, true)} onOpenFullPage={(id) => openPropertyFullPage(id, "credit")} />}
              {view === "location" && canAccessView(authUser, "location") && <LocationView tenants={segmentTenants} properties={segmentProperties} scis={segmentScis} onAdd={canManageData(authUser) ? addTenant : () => {}} onUpdate={canManageData(authUser) ? updTenant : () => {}} onDelete={canManageData(authUser) ? delTenant : () => {}} onSelectTenant={(id) => openDrawer({ kind: "tenant", id })} onOpenFullPage={(id) => openFullPage({ kind: "tenant", id })} />}
              {view === "comptabilite" && canAccessView(authUser, "comptabilite") && <ComptabiliteView properties={segmentProperties} scis={segmentScis} onSelectSci={(id) => openDrawer({ kind: "compta", sciId: id })} onOpenFullPage={(id) => openFullPage({ kind: "compta", sciId: id })} />}
              {view === "patrimoine" && <PatrimoineView properties={segmentProperties} scis={segmentScis} onSelectProperty={(id) => openPropertyDrawer(id)} onOpenFullPage={(id) => openPropertyFullPage(id)} />}
              {view === "dossiers" && canAccessView(authUser, "dossiers") && (
                <BankDossierView
                  user={authUser}
                  entityOptions={filterInvestmentEntities(visibleScis).map((s) => ({ id: s.id, shortName: s.shortName, valeurEstimee: s.valeurEstimee }))}
                  properties={filterPropertiesByEntities(visibleProperties, filterInvestmentEntities(visibleScis))}
                  scis={filterInvestmentEntities(visibleScis).map((s) => ({ id: s.id, shortName: s.shortName, valeurEstimee: s.valeurEstimee }))}
                />
              )}
              {view === "comptes" && canAccessView(authUser, "comptes") && (
                <UsersAdminView
                  currentUser={authUser}
                  scis={scis.map((s) => ({ id: s.id, shortName: s.shortName, associes: s.associes }))}
                  properties={properties}
                />
              )}
              {view === "portail-banque" && canAccessView(authUser, "portail-banque") && <BankPortalView user={authUser} loans={bankLoans} />}
              {view === "alertes" && <AlertesView alerts={alerts} onDelete={canManageData(authUser) ? delAlert : () => {}} onSelectAlert={(id) => openDrawer({ kind: "alert", id })} onOpenFullPage={(id) => openFullPage({ kind: "alert", id })} />}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Barre de navigation mobile — dans le flux (ne recouvre plus le contenu) */}
        <nav
          className="xl:hidden flex-shrink-0 flex pb-[max(0.5rem,env(safe-area-inset-bottom))]"
          style={{ background: "var(--v-nav-bg)", borderTop: "1px solid var(--v-glass-border)", backdropFilter: "blur(20px)" }}
          aria-label="Navigation principale"
        >
          {navItems.slice(0, 5).map(({ id, label, Icon }) => {
            const active = view === id;
            return (
              <motion.button key={id} onClick={() => handleNav(id)} whileTap={{ scale: 0.88 }} className="flex-1 flex flex-col items-center gap-1 py-2.5 min-h-[56px] transition-colors" style={{ color: active ? "var(--v-accent)" : "var(--v-text-faint)" }}>
                <div className="relative"><Icon size={20} />{id === "alertes" && highAlerts > 0 && <span className="absolute -top-1 -right-1.5 min-w-[1rem] h-4 px-0.5 rounded-full bg-red-500 text-xs font-bold text-white flex items-center justify-center">{highAlerts}</span>}</div>
                <span className="text-xs font-semibold leading-tight">{label}</span>
              </motion.button>
            );
          })}
          <motion.button whileTap={{ scale: 0.88 }} onClick={() => setSidebarOpen(true)} className="flex-1 flex flex-col items-center gap-1 py-2.5 min-h-[56px]" style={{ color: "var(--v-text-faint)" }}>
            <Menu size={20} /><span className="text-xs font-semibold leading-tight">Plus</span>
          </motion.button>
        </nav>
      </div>

      <ThemeSettingsModal
        open={themeModalOpen}
        onClose={() => setThemeModalOpen(false)}
        themeId={themeId}
        customColors={customColors}
        onThemeChange={handleThemeChange}
        onCustomChange={handleCustomChange}
      />

      <AppDetailDrawer
        drawerTarget={drawerTarget}
        fullPageTarget={fullPageTarget}
        view={view}
        ctx={detailCtx}
        onClose={closeDrawer}
        onOpenFullPage={openFullPage}
        onPropertyCredit={() => drawerTarget?.kind === "property" && setDrawerTarget({ ...drawerTarget, section: "credit" })}
      />
      <Toaster position="top-center" richColors closeButton />
    </div>
    </TooltipProvider>
  );
}
