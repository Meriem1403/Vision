import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  LayoutDashboard, Building2, Home, CreditCard, Users, FileText,
  TrendingUp, Bell, Plus, ArrowUpRight, ArrowDownRight, Pencil,
  Trash2, Check, X, ChevronLeft, Phone, Mail, MapPin, Calendar,
  Shield, Key, AlertTriangle, Euro, BarChart2, Menu, LayoutGrid,
  List,
} from "lucide-react";

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface Associe { name: string; parts: number }
interface Credit { banque: string; montantInitial: number; taux: number; duree: number; mensualite: number; debut: string; capitalRestant: number }
interface Property { id: string; sciId: string; address: string; ville: string; cp: string; type: string; surface: number; lots: number; prixAchat: number; travaux: number; fraisNotaire: number; valeurActuelle: number; loyer: number; taxeFonciere: number; assurance: number; credit?: Credit }
interface SCI { id: string; name: string; shortName: string; type: "IR" | "IS" | "RP"; creation: string; valeurEstimee: number; associes: Associe[]; color: string; gradient: string }
interface Tenant { id: string; propertyId: string; nom: string; initiales: string; tel: string; email: string; debutBail: string; finBail: string; debutTs: number; finTs: number; loyer: number; charges: number; statut: "En cours" | "Impayé" | "Terminé" }
interface AlertItem { id: string; type: "bail" | "credit" | "taxe" | "assurance" | "info"; title: string; detail: string; severity: "high" | "medium" | "low" }
type View = "dashboard" | "sci" | "biens" | "credits" | "location" | "comptabilite" | "patrimoine" | "alertes";
type CrudMode = "list" | "create" | "edit";

// ─── DATA ────────────────────────────────────────────────────────────────────

const SCIS_INIT: SCI[] = [
  { id: "beneduc", name: "SCI IR BENEDUC", shortName: "BENEDUC", type: "IR", creation: "Janv. 2017", valeurEstimee: 380000, color: "#60a5fa", gradient: "from-blue-500/20 to-transparent", associes: [{ name: "Johann Faraut", parts: 50 }, { name: "Alexandre Niel", parts: 50 }] },
  { id: "troika", name: "SCI IR TROIKA", shortName: "TROIKA", type: "IR", creation: "Juin 2017", valeurEstimee: 1265000, color: "#a78bfa", gradient: "from-violet-500/20 to-transparent", associes: [{ name: "Johann Faraut", parts: 50 }, { name: "Alexandre Niel", parts: 50 }] },
  { id: "lavista", name: "SCI IS LA VISTA", shortName: "LA VISTA", type: "IS", creation: "Mars 2020", valeurEstimee: 390000, color: "#22d3ee", gradient: "from-cyan-500/20 to-transparent", associes: [{ name: "Johann Faraut", parts: 60 }, { name: "Alexandre Niel", parts: 40 }] },
  { id: "rp", name: "Résidence Principale", shortName: "RP", type: "RP", creation: "Mai 2019", valeurEstimee: 630000, color: "#34d399", gradient: "from-emerald-500/20 to-transparent", associes: [{ name: "Johann Faraut", parts: 50 }, { name: "Alexandre Niel", parts: 50 }] },
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
const cashFlow = (p: Property) => Math.round(p.loyer - (p.credit?.mensualite ?? 0) - p.taxeFonciere / 12 - p.assurance / 12);
const finCredit = (c: Credit) => { const d = new Date(c.debut); d.setMonth(d.getMonth() + c.duree); return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }); };
const sciOf = (p: Property, scis: SCI[]) => scis.find((s) => s.id === p.sciId) ?? scis[0];
const leasePct = (t: Tenant) => { const now = Date.now(); if (now >= t.finTs) return 100; if (now <= t.debutTs) return 0; return Math.round(((now - t.debutTs) / (t.finTs - t.debutTs)) * 100); };

// ─── MOTION ──────────────────────────────────────────────────────────────────

const ease = [0.22, 1, 0.36, 1] as const;
const pageV = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.32, ease } }, exit: { opacity: 0, y: -10, transition: { duration: 0.18 } } };
const gridV = { hidden: {}, show: { transition: { staggerChildren: 0.055, delayChildren: 0.04 } } };
const itemV = { hidden: { opacity: 0, y: 18, scale: 0.97 }, show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.38, ease } } };
const rowV = { hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0, transition: { duration: 0.3, ease } } };
const slideV = { hidden: { opacity: 0, height: 0 }, show: { opacity: 1, height: "auto", transition: { duration: 0.28, ease } }, exit: { opacity: 0, height: 0, transition: { duration: 0.18 } } };

// ─── GLASS TOKENS ────────────────────────────────────────────────────────────

const G = "bg-white/[0.07] backdrop-blur-xl border border-white/[0.11] rounded-2xl";
const GE = "bg-white/[0.1] backdrop-blur-2xl border border-white/[0.18] rounded-2xl shadow-xl shadow-black/20";
const inp = "w-full bg-white/[0.06] border border-white/[0.1] text-white placeholder:text-white/25 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400/60 focus:bg-white/[0.1] transition-all duration-200";
const lbl = "block text-[10px] font-bold text-white/35 uppercase tracking-widest mb-2";
const btnP = "inline-flex items-center gap-2 bg-blue-500/80 hover:bg-blue-400/90 text-white border border-blue-400/30 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-150";
const btnG = "inline-flex items-center gap-2 bg-white/[0.07] hover:bg-white/[0.13] text-white/65 hover:text-white border border-white/[0.1] rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-150";
const btnD = "inline-flex items-center gap-2 bg-red-500/18 hover:bg-red-500/38 text-red-300 border border-red-400/20 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150";
const btnS = "inline-flex items-center gap-2 bg-emerald-500/80 hover:bg-emerald-400/90 text-white border border-emerald-400/30 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-150";
const TT = { background: "rgba(8,14,30,0.95)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, color: "white", fontSize: 12 };

// ─── PRIMITIVES ───────────────────────────────────────────────────────────────

function GI({ label, className = "", ...p }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; className?: string }) {
  return <div className={className}>{label && <label className={lbl}>{label}</label>}<input className={inp} {...p} /></div>;
}
function GS({ label, options, className = "", ...p }: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; options: { value: string; label: string }[]; className?: string }) {
  return <div className={className}>{label && <label className={lbl}>{label}</label>}<select className={`${inp} cursor-pointer`} {...p}>{options.map((o) => <option key={o.value} value={o.value} className="bg-[#0d1630]">{o.label}</option>)}</select></div>;
}
function GSec({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className={`${G} p-5`}><p className={`${lbl} mb-4`}>{title}</p>{children}</div>;
}
function CashChip({ value }: { value: number }) {
  const pos = value >= 0;
  return <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${pos ? "bg-emerald-400/14 text-emerald-300 border border-emerald-400/20" : "bg-red-400/14 text-red-300 border border-red-400/20"}`}>{pos ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}{pos ? "+" : ""}{fmt(value)}</span>;
}
function SCIChip({ sci }: { sci: SCI }) {
  return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold border" style={{ color: sci.color, borderColor: `${sci.color}28`, backgroundColor: `${sci.color}14` }}><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sci.color }} />{sci.shortName}</span>;
}
function Ava({ initiales, color, size = 36 }: { initiales: string; color: string; size?: number }) {
  return <div className="rounded-xl flex items-center justify-center font-bold flex-shrink-0" style={{ width: size, height: size, backgroundColor: `${color}28`, border: `1px solid ${color}38`, color, fontSize: size * 0.33 }}>{initiales}</div>;
}
function Ring({ pct, color, size = 64 }: { pct: number; color: string; size?: number }) {
  const r = (size - 10) / 2; const c = 2 * Math.PI * r; const off = c * (1 - Math.min(pct, 100) / 100);
  return <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={7} /><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={7} strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.8s ease" }} /></svg>;
}
function GBar({ pct, color }: { pct: number; color: string }) {
  return <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden"><motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${Math.min(pct, 100)}%` }} transition={{ duration: 0.7, delay: 0.15, ease }} style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}55` }} /></div>;
}
function FormHdr({ title, onBack, onDelete, onSave, isEdit }: { title: string; onBack: () => void; onDelete?: () => void; onSave: () => void; isEdit: boolean }) {
  return (
    <div className={`${G} px-4 py-4 flex flex-wrap gap-3 items-center justify-between mb-6`}>
      <div className="flex items-center gap-3 min-w-0"><button onClick={onBack} className={btnG}><ChevronLeft size={14} /><span className="hidden sm:inline">Retour</span></button><p className="text-white font-semibold text-sm truncate">{title}</p></div>
      <div className="flex items-center gap-2">{isEdit && onDelete && <button onClick={onDelete} className={btnD}><Trash2 size={13} /><span className="hidden sm:inline">Supprimer</span></button>}<button onClick={onSave} className={btnS}><Check size={13} />{isEdit ? "Enregistrer" : "Créer"}</button></div>
    </div>
  );
}
function DelConfirm({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <motion.div variants={slideV} initial="hidden" animate="show" exit="exit" className="overflow-hidden">
      <div className="flex items-center gap-2 pt-3 mt-3 border-t border-white/[0.05]">
        <p className="text-xs text-red-300 flex-1">Confirmer la suppression ?</p>
        <button onClick={onConfirm} className="px-3 py-1.5 bg-red-500/80 hover:bg-red-400/80 text-white text-xs font-bold rounded-lg transition-colors"><Check size={11} /></button>
        <button onClick={onCancel} className="px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white/55 text-xs rounded-lg transition-colors"><X size={11} /></button>
      </div>
    </motion.div>
  );
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────

function DashboardView({ properties, scis }: { properties: Property[]; scis: SCI[] }) {
  const totalBrut = scis.reduce((s, x) => s + x.valeurEstimee, 0);
  const totalDette = properties.reduce((s, p) => s + (p.credit?.capitalRestant ?? 0), 0);
  const loyers = properties.reduce((s, p) => s + p.loyer * 12, 0);
  const cf = properties.reduce((s, p) => s + cashFlow(p), 0);
  const kpis = [
    { l: "Patrimoine brut", v: fmt(totalBrut), color: "#60a5fa", Icon: Building2 },
    { l: "Dette restante", v: fmt(totalDette), color: "#f87171", Icon: CreditCard },
    { l: "Patrimoine net", v: fmt(totalBrut - totalDette), color: "#34d399", Icon: TrendingUp },
    { l: "Loyers annuels", v: fmt(loyers), color: "#a78bfa", Icon: Euro },
    { l: "Cash-flow / mois", v: `${cf >= 0 ? "+" : ""}${fmt(cf)}`, color: "#34d399", Icon: ArrowUpRight },
    { l: "Rendement brut", v: `${(loyers / totalBrut * 100).toFixed(2)} %`, color: "#fbbf24", Icon: BarChart2 },
  ];
  return (
    <div className="space-y-5">
      <motion.div variants={gridV} initial="hidden" animate="show" className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {kpis.map((k) => (
          <motion.div key={k.l} variants={itemV} whileHover={{ y: -3, scale: 1.02 }} className={`${G} p-4 cursor-default`} style={{ borderColor: `${k.color}1e` }}>
            <div className="flex items-center justify-between mb-3"><p className="text-[9px] sm:text-[10px] font-semibold text-white/33 uppercase tracking-wider leading-tight">{k.l}</p><div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${k.color}1e` }}><k.Icon size={12} style={{ color: k.color }} /></div></div>
            <p className="text-base sm:text-lg font-bold truncate" style={{ color: k.color, fontFamily: "'JetBrains Mono',monospace" }}>{k.v}</p>
          </motion.div>
        ))}
      </motion.div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <motion.div variants={itemV} initial="hidden" animate="show" transition={{ delay: 0.12 }} className={`${G} p-5 lg:col-span-2`}>
          <p className={`${lbl} mb-4`}>Répartition par entité</p>
          <div style={{ height: 160 }}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={scis.map((s) => ({ name: s.shortName, value: s.valeurEstimee, color: s.color }))} dataKey="value" innerRadius={45} outerRadius={74} paddingAngle={3}>{scis.map((s, i) => <Cell key={i} fill={s.color} opacity={0.82} />)}</Pie><Tooltip formatter={(v: number) => [fmt(v), ""]} contentStyle={TT} /></PieChart></ResponsiveContainer></div>
          <div className="mt-4 space-y-2.5">{scis.map((s) => <div key={s.id} className="flex items-center gap-2.5"><span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} /><span className="text-xs text-white/52 flex-1 truncate">{s.shortName}</span><span className="text-xs font-semibold font-mono flex-shrink-0" style={{ color: s.color }}>{fmt(s.valeurEstimee)}</span></div>)}</div>
        </motion.div>
        <motion.div variants={itemV} initial="hidden" animate="show" transition={{ delay: 0.18 }} className={`${G} p-5 lg:col-span-3`}>
          <p className={`${lbl} mb-0.5`}>Évolution du patrimoine</p>
          <p className="text-[10px] text-white/25 mb-4">2017–2024 · milliers d&apos;euros</p>
          <ResponsiveContainer width="100%" height={188}>
            <AreaChart data={PATRIMOINE_DATA} margin={{ top: 5, right: 5, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#60a5fa" stopOpacity={0.22} /><stop offset="100%" stopColor="#60a5fa" stopOpacity={0} /></linearGradient>
                <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34d399" stopOpacity={0.22} /><stop offset="100%" stopColor="#34d399" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="an" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.28)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.28)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}k`} />
              <Tooltip formatter={(v: number) => [`${v} k€`, ""]} contentStyle={TT} />
              <Area type="monotone" dataKey="valeur" stroke="#60a5fa" strokeWidth={2} fill="url(#g1)" name="Valeur brute" />
              <Area type="monotone" dataKey="dette" stroke="#f87171" strokeWidth={1.5} fill="none" strokeDasharray="5 3" name="Dette" />
              <Area type="monotone" dataKey="net" stroke="#34d399" strokeWidth={2} fill="url(#g2)" name="Net" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
      <motion.div variants={gridV} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[...properties].sort((a, b) => cashFlow(b) - cashFlow(a)).slice(0, 4).map((p) => {
          const sci = sciOf(p, scis);
          return (
            <motion.div key={p.id} variants={itemV} whileHover={{ y: -4 }} className={`${G} p-4 overflow-hidden`} style={{ borderColor: `${sci.color}18` }}>
              <div className="h-0.5 w-10 rounded-full mb-4" style={{ backgroundColor: sci.color, boxShadow: `0 0 8px ${sci.color}` }} />
              <p className="text-sm font-bold text-white leading-tight">{p.address}</p>
              <p className="text-xs text-white/35 mt-0.5 mb-3">{p.ville} · {p.type}</p>
              <div className="flex items-center justify-between flex-wrap gap-2"><SCIChip sci={sci} /><CashChip value={cashFlow(p)} /></div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}

// ─── PROPERTY FORM ───────────────────────────────────────────────────────────

const PTYPES = ["T1", "T2", "T3", "T4", "Maison", "Immeuble", "Local commercial"];

function PropertyForm({ property, scis, onSave, onBack, onDelete }: { property: Property | null; scis: SCI[]; onSave: (p: Property) => void; onBack: () => void; onDelete?: () => void }) {
  const isEdit = !!property;
  const [f, setF] = useState<Property>(property ?? { id: uid(), sciId: scis[0]?.id ?? "", address: "", ville: "", cp: "", type: "T2", surface: 0, lots: 1, prixAchat: 0, travaux: 0, fraisNotaire: 0, valeurActuelle: 0, loyer: 0, taxeFonciere: 0, assurance: 0 });
  const [hasCredit, setHasCredit] = useState(!!property?.credit);
  const [cred, setCred] = useState<Credit>(property?.credit ?? { banque: "", montantInitial: 0, taux: 0, duree: 240, mensualite: 0, debut: "", capitalRestant: 0 });
  const upd = (k: keyof Property, v: string | number) => setF((p) => ({ ...p, [k]: v }));
  const updC = (k: keyof Credit, v: string | number) => setCred((c) => ({ ...c, [k]: v }));
  const sci = scis.find((s) => s.id === f.sciId);
  return (
    <motion.div variants={pageV} initial="hidden" animate="show" className="max-w-2xl mx-auto space-y-4">
      <FormHdr title={isEdit ? `Modifier · ${f.address}` : "Nouveau bien"} onBack={onBack} onDelete={onDelete} onSave={() => onSave({ ...f, credit: hasCredit ? cred : undefined })} isEdit={isEdit} />
      <GSec title="Entité propriétaire">
        <div className="grid grid-cols-2 gap-2">
          {scis.map((s) => (
            <motion.button key={s.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => upd("sciId", s.id)} className="flex items-center gap-3 p-3 rounded-xl border transition-all text-left" style={f.sciId === s.id ? { borderColor: s.color, backgroundColor: `${s.color}14` } : { borderColor: "rgba(255,255,255,0.07)", backgroundColor: "rgba(255,255,255,0.02)" }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: `${s.color}22`, color: s.color }}>{s.shortName.slice(0, 2)}</div>
              <div className="min-w-0"><p className="text-xs font-bold text-white truncate">{s.shortName}</p><p className="text-[10px] text-white/35">{s.type}</p></div>
            </motion.button>
          ))}
        </div>
      </GSec>
      <GSec title="Localisation">
        <div className="space-y-3">
          <GI label="Adresse" placeholder="14 Rue de la Paix" value={f.address} onChange={(e) => upd("address", e.target.value)} />
          <div className="grid grid-cols-3 gap-3"><GI label="Code postal" placeholder="75001" value={f.cp} onChange={(e) => upd("cp", e.target.value)} /><GI label="Ville" placeholder="Paris" className="col-span-2" value={f.ville} onChange={(e) => upd("ville", e.target.value)} /></div>
        </div>
      </GSec>
      <GSec title="Type & Caractéristiques">
        <div className="flex flex-wrap gap-2 mb-4">{PTYPES.map((t) => <motion.button key={t} whileTap={{ scale: 0.94 }} onClick={() => upd("type", t)} className="px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all" style={f.type === t ? { borderColor: sci?.color, backgroundColor: `${sci?.color}18`, color: sci?.color } : { borderColor: "rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.38)" }}>{t}</motion.button>)}</div>
        <div className="grid grid-cols-2 gap-3"><GI label="Surface (m²)" type="number" placeholder="65" value={f.surface || ""} onChange={(e) => upd("surface", +e.target.value)} /><GI label="Nombre de lots" type="number" placeholder="1" value={f.lots || ""} onChange={(e) => upd("lots", +e.target.value)} /></div>
      </GSec>
      <GSec title="Financier">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
        <label className="flex items-center gap-3 cursor-pointer mb-4">
          <div className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors duration-200 ${hasCredit ? "bg-blue-500/70" : "bg-white/10"}`} onClick={() => setHasCredit(!hasCredit)}>
            <motion.div animate={{ x: hasCredit ? 22 : 2 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} className="w-4 h-4 bg-white rounded-full absolute top-1 shadow" />
          </div>
          <span className="text-sm font-semibold text-white/75">Crédit immobilier</span>
        </label>
        <AnimatePresence>
          {hasCredit && (
            <motion.div variants={slideV} initial="hidden" animate="show" exit="exit" className="overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <GI label="Banque" value={cred.banque} onChange={(e) => updC("banque", e.target.value)} className="sm:col-span-2" />
                <GI label="Montant initial (€)" type="number" value={cred.montantInitial || ""} onChange={(e) => updC("montantInitial", +e.target.value)} />
                <GI label="Capital restant (€)" type="number" value={cred.capitalRestant || ""} onChange={(e) => updC("capitalRestant", +e.target.value)} />
                <GI label="Taux (%)" type="number" step="0.01" value={cred.taux || ""} onChange={(e) => updC("taux", +e.target.value)} />
                <GI label="Durée (mois)" type="number" value={cred.duree || ""} onChange={(e) => updC("duree", +e.target.value)} />
                <GI label="Mensualité (€)" type="number" value={cred.mensualite || ""} onChange={(e) => updC("mensualite", +e.target.value)} />
                <GI label="Date de début" type="date" value={cred.debut} onChange={(e) => updC("debut", e.target.value)} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── BIENS VIEW ──────────────────────────────────────────────────────────────

function BiensView({ properties, scis, onAdd, onUpdate, onDelete }: { properties: Property[]; scis: SCI[]; onAdd: (p: Property) => void; onUpdate: (p: Property) => void; onDelete: (id: string) => void }) {
  const [mode, setMode] = useState<CrudMode>("list");
  const [editing, setEditing] = useState<Property | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [filterSci, setFilterSci] = useState("all");
  const [display, setDisplay] = useState<"grid" | "table">("grid");
  if (mode !== "list") return <PropertyForm property={editing} scis={scis} onBack={() => { setMode("list"); setEditing(null); }} onSave={(p) => { mode === "create" ? onAdd(p) : onUpdate(p); setMode("list"); setEditing(null); }} onDelete={editing ? () => { onDelete(editing.id); setMode("list"); setEditing(null); } : undefined} />;
  const filtered = properties.filter((p) => filterSci === "all" || p.sciId === filterSci);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setFilterSci("all")} className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${filterSci === "all" ? "bg-white/14 text-white border-white/18" : "text-white/38 border-white/07 hover:bg-white/05"}`}>Tous ({properties.length})</button>
          {scis.map((s) => <button key={s.id} onClick={() => setFilterSci(s.id)} className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all" style={filterSci === s.id ? { backgroundColor: `${s.color}20`, color: s.color, borderColor: `${s.color}38` } : { color: "rgba(255,255,255,0.32)", borderColor: "rgba(255,255,255,0.07)" }}>{s.shortName}</button>)}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className={`${G} flex p-1`}>
            <button onClick={() => setDisplay("grid")} className={`p-2 rounded-xl transition-all ${display === "grid" ? "bg-white/14 text-white" : "text-white/32 hover:text-white/55"}`}><LayoutGrid size={14} /></button>
            <button onClick={() => setDisplay("table")} className={`p-2 rounded-xl transition-all ${display === "table" ? "bg-white/14 text-white" : "text-white/32 hover:text-white/55"}`}><List size={14} /></button>
          </div>
          <button onClick={() => { setEditing(null); setMode("create"); }} className={btnP}><Plus size={14} /><span className="hidden sm:inline">Nouveau bien</span></button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {display === "grid" ? (
          <motion.div key="grid" variants={gridV} initial="hidden" animate="show" exit={{ opacity: 0, transition: { duration: 0.15 } }} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((p) => {
              const sci = sciOf(p, scis);
              const cf = cashFlow(p);
              const pv = p.valeurActuelle - p.prixAchat - p.travaux - p.fraisNotaire;
              const cpct = p.credit ? Math.round(((p.credit.montantInitial - p.credit.capitalRestant) / p.credit.montantInitial) * 100) : 0;
              return (
                <motion.div key={p.id} variants={itemV} whileHover={{ y: -4 }} className={`${G} overflow-hidden`} style={{ borderColor: `${sci.color}18` }}>
                  <div className="h-0.5 w-full" style={{ backgroundColor: sci.color, opacity: 0.45 }} />
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-2 mb-4">
                      <div className="min-w-0"><p className="text-sm font-bold text-white leading-tight">{p.address}</p><div className="flex items-center gap-1 mt-0.5"><MapPin size={9} className="text-white/28" /><p className="text-[10px] text-white/33">{p.cp} {p.ville}</p></div></div>
                      <div className="flex items-center gap-1.5 flex-shrink-0"><SCIChip sci={sci} /><motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => { setEditing(p); setMode("edit"); }} className="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-white/[0.13] flex items-center justify-center text-white/38 hover:text-white transition-all"><Pencil size={11} /></motion.button></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {[{ l: "Type", v: `${p.type} · ${p.surface}m²` }, { l: "Valeur", v: fmt(p.valeurActuelle) }, { l: "Loyer/mois", v: p.loyer > 0 ? fmt(p.loyer) : "—" }, { l: "Plus-value", v: `${pv >= 0 ? "+" : ""}${fmt(pv)}`, col: pv >= 0 ? "#34d399" : "#f87171" }].map((m) => (
                        <div key={m.l} className="bg-white/[0.04] rounded-xl p-3"><p className="text-[9px] text-white/28 uppercase tracking-wider mb-1">{m.l}</p><p className="text-xs font-bold font-mono truncate" style={{ color: m.col ?? "rgba(255,255,255,0.88)" }}>{m.v}</p></div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mb-3"><CashChip value={cf} />{p.credit && <span className="text-[10px] text-white/28 font-mono">{fmt(p.credit.capitalRestant)}</span>}</div>
                    {p.credit && <div className="mb-4"><GBar pct={cpct} color={sci.color} /><p className="text-[9px] text-white/22 mt-1">{cpct}% remboursé · fin {finCredit(p.credit)}</p></div>}
                    <AnimatePresence>
                      {confirmDel === p.id
                        ? <DelConfirm onConfirm={() => { onDelete(p.id); setConfirmDel(null); }} onCancel={() => setConfirmDel(null)} />
                        : <motion.button whileHover={{ backgroundColor: "rgba(239,68,68,0.07)" }} onClick={() => setConfirmDel(p.id)} className="w-full mt-1 py-1.5 rounded-xl text-[10px] text-white/17 hover:text-red-400 border border-transparent hover:border-red-400/14 transition-all text-center">Supprimer ce bien</motion.button>}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div key="table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.15 } }} className={`${G} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-white/[0.06]">{["Adresse", "Entité", "Type", "Loyer/mois", "Cash-flow", "Plus-value", "Crédit restant", "Actions"].map((h) => <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-white/28 uppercase tracking-wider whitespace-nowrap">{h}</th>)}</tr></thead>
                <tbody>
                  {filtered.map((p, i) => {
                    const sci = sciOf(p, scis);
                    const cf = cashFlow(p);
                    const pv = p.valeurActuelle - p.prixAchat - p.travaux - p.fraisNotaire;
                    return (
                      <motion.tr key={p.id} variants={rowV} initial="hidden" animate="show" transition={{ delay: i * 0.04 }} className="border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors group">
                        <td className="px-4 py-3.5"><p className="text-sm text-white font-medium">{p.address}</p><p className="text-[10px] text-white/32">{p.ville}</p></td>
                        <td className="px-4 py-3.5"><SCIChip sci={sci} /></td>
                        <td className="px-4 py-3.5 text-xs text-white/55 whitespace-nowrap">{p.type} · {p.surface}m²</td>
                        <td className="px-4 py-3.5 text-xs font-mono text-white/75">{p.loyer > 0 ? fmt(p.loyer) : "—"}</td>
                        <td className="px-4 py-3.5"><CashChip value={cf} /></td>
                        <td className="px-4 py-3.5 text-xs font-mono font-bold" style={{ color: pv >= 0 ? "#34d399" : "#f87171" }}>{pv >= 0 ? "+" : ""}{fmt(pv)}</td>
                        <td className="px-4 py-3.5 text-xs font-mono text-white/45">{p.credit ? fmt(p.credit.capitalRestant) : "—"}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <motion.button whileHover={{ scale: 1.1 }} onClick={() => { setEditing(p); setMode("edit"); }} className="w-7 h-7 rounded-lg bg-white/[0.07] hover:bg-white/[0.14] flex items-center justify-center text-white/45 hover:text-white transition-all"><Pencil size={11} /></motion.button>
                            {confirmDel === p.id ? (
                              <div className="flex gap-1">
                                <button onClick={() => { onDelete(p.id); setConfirmDel(null); }} className="px-2 py-1 bg-red-500/80 text-white text-[10px] font-bold rounded-lg">Oui</button>
                                <button onClick={() => setConfirmDel(null)} className="px-2 py-1 bg-white/10 text-white/55 text-[10px] rounded-lg">Non</button>
                              </div>
                            ) : <motion.button whileHover={{ scale: 1.1 }} onClick={() => setConfirmDel(p.id)} className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/28 flex items-center justify-center text-red-400/55 hover:text-red-300 transition-all"><Trash2 size={11} /></motion.button>}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── SCI FORM & VIEW ─────────────────────────────────────────────────────────

function SCIForm({ sci, onSave, onBack, onDelete }: { sci: SCI | null; onSave: (s: SCI) => void; onBack: () => void; onDelete?: () => void }) {
  const isEdit = !!sci;
  const [f, setF] = useState<SCI>(sci ?? { id: uid(), name: "", shortName: "", type: "IR", creation: "", valeurEstimee: 0, associes: [{ name: "", parts: 50 }, { name: "", parts: 50 }], color: "#60a5fa", gradient: "from-blue-500/20 to-transparent" });
  const updF = (k: keyof SCI, v: string | number) => setF((s) => ({ ...s, [k]: v }));
  return (
    <motion.div variants={pageV} initial="hidden" animate="show" className="max-w-2xl mx-auto space-y-4">
      <FormHdr title={isEdit ? `Modifier · ${f.name}` : "Nouvelle SCI"} onBack={onBack} onDelete={onDelete} onSave={() => onSave(f)} isEdit={isEdit} />
      <GSec title="Identité">
        <div className="space-y-3">
          <GI label="Nom complet" placeholder="SCI IR DUPONT" value={f.name} onChange={(e) => updF("name", e.target.value)} />
          <div className="grid grid-cols-2 gap-3"><GI label="Nom court" placeholder="DUPONT" value={f.shortName} onChange={(e) => updF("shortName", e.target.value)} /><GI label="Date de création" placeholder="Janv. 2024" value={f.creation} onChange={(e) => updF("creation", e.target.value)} /></div>
          <div><label className={lbl}>Régime fiscal</label><div className="flex gap-2">{(["IR", "IS", "RP"] as const).map((t) => <motion.button key={t} whileTap={{ scale: 0.94 }} onClick={() => updF("type", t)} className="flex-1 py-2.5 rounded-xl border text-sm font-bold transition-all" style={f.type === t ? { backgroundColor: "rgba(96,165,250,0.18)", borderColor: "#60a5fa", color: "#60a5fa" } : { borderColor: "rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.33)" }}>{t}</motion.button>)}</div></div>
          <GI label="Valeur estimée (€)" type="number" value={f.valeurEstimee || ""} onChange={(e) => updF("valeurEstimee", +e.target.value)} />
        </div>
      </GSec>
      <GSec title="Associés">
        <div className="space-y-3">
          {f.associes.map((a, i) => (
            <div key={i} className="flex gap-3 items-end">
              <GI placeholder={`Associé ${i + 1}`} value={a.name} onChange={(e) => setF((s) => ({ ...s, associes: s.associes.map((x, j) => j === i ? { ...x, name: e.target.value } : x) }))} className="flex-1" />
              <div className="flex items-end gap-2"><GI type="number" placeholder="50" value={a.parts || ""} onChange={(e) => setF((s) => ({ ...s, associes: s.associes.map((x, j) => j === i ? { ...x, parts: +e.target.value } : x) }))} className="w-20" /><span className="text-white/38 text-sm pb-3">%</span></div>
            </div>
          ))}
          <button onClick={() => setF((s) => ({ ...s, associes: [...s.associes, { name: "", parts: 0 }] }))} className={btnG}><Plus size={13} />Associé</button>
        </div>
      </GSec>
    </motion.div>
  );
}

function SCIView({ scis, properties, onAdd, onUpdate, onDelete }: { scis: SCI[]; properties: Property[]; onAdd: (s: SCI) => void; onUpdate: (s: SCI) => void; onDelete: (id: string) => void }) {
  const [mode, setMode] = useState<CrudMode>("list");
  const [editing, setEditing] = useState<SCI | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  if (mode !== "list") return <SCIForm sci={editing} onBack={() => { setMode("list"); setEditing(null); }} onSave={(s) => { mode === "create" ? onAdd(s) : onUpdate(s); setMode("list"); setEditing(null); }} onDelete={editing ? () => { onDelete(editing.id); setMode("list"); setEditing(null); } : undefined} />;
  return (
    <div className="space-y-5">
      <div className="flex justify-end"><button onClick={() => { setEditing(null); setMode("create"); }} className={btnP}><Plus size={14} />Nouvelle SCI</button></div>
      <motion.div variants={gridV} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {scis.map((sci) => {
          const props = properties.filter((p) => p.sciId === sci.id);
          const cf = props.reduce((s, p) => s + cashFlow(p), 0);
          return (
            <motion.div key={sci.id} variants={itemV} whileHover={{ y: -2 }} className={`${G} overflow-hidden`} style={{ borderColor: `${sci.color}1e` }}>
              <div className={`p-5 bg-gradient-to-br ${sci.gradient}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3"><div className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold" style={{ backgroundColor: `${sci.color}25`, color: sci.color }}>{sci.shortName.slice(0, 2)}</div><div><p className="font-bold text-white">{sci.name}</p><p className="text-xs text-white/35">{sci.creation}</p></div></div>
                  <div className="flex items-center gap-1.5"><span className="px-2 py-0.5 rounded-lg text-[10px] font-bold border" style={{ color: sci.color, borderColor: `${sci.color}38`, backgroundColor: `${sci.color}14` }}>{sci.type}</span><motion.button whileHover={{ scale: 1.1 }} onClick={() => { setEditing(sci); setMode("edit"); }} className="w-8 h-8 rounded-lg bg-white/[0.07] hover:bg-white/[0.14] flex items-center justify-center text-white/42 hover:text-white transition-all"><Pencil size={13} /></motion.button></div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[{ l: "Valeur", v: fmt(sci.valeurEstimee) }, { l: "Loyers/mois", v: fmt(props.reduce((s, p) => s + p.loyer, 0)) }, { l: "Cash-flow", v: `${cf >= 0 ? "+" : ""}${fmt(cf)}` }].map((m) => (
                    <div key={m.l} className="bg-black/18 backdrop-blur rounded-xl p-3"><p className="text-[9px] text-white/35 mb-1">{m.l}</p><p className="text-xs font-bold font-mono text-white truncate">{m.v}</p></div>
                  ))}
                </div>
              </div>
              <div className="px-5 py-4 border-t border-white/[0.06]">
                <p className={`${lbl} mb-3`}>Associés</p>
                <div className="space-y-2.5">{sci.associes.map((a) => <div key={a.name} className="flex items-center gap-3"><Ava initiales={a.name.split(" ").map((n) => n[0]).join("")} color={sci.color} size={28} /><span className="text-xs text-white/58 flex-1 truncate">{a.name}</span><span className="text-sm font-bold font-mono flex-shrink-0" style={{ color: sci.color }}>{a.parts}%</span></div>)}</div>
              </div>
              {props.length > 0 && <div className="px-5 pb-4 border-t border-white/[0.05]"><p className={`${lbl} my-3`}>{props.length} bien{props.length > 1 ? "s" : ""}</p><div className="space-y-1.5">{props.map((p) => <motion.div key={p.id} whileHover={{ x: 3 }} className="flex items-center justify-between py-2 px-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors cursor-default"><div><p className="text-xs font-medium text-white/72">{p.address}</p><p className="text-[10px] text-white/28">{p.type} · {p.surface}m²</p></div><CashChip value={cashFlow(p)} /></motion.div>)}</div></div>}
              <AnimatePresence>
                {confirmDel === sci.id
                  ? <motion.div variants={slideV} initial="hidden" animate="show" exit="exit" className="px-5 pb-4 overflow-hidden"><div className="flex items-center gap-2 pt-3 border-t border-white/[0.05]"><p className="text-xs text-red-300 flex-1">Supprimer cette SCI ?</p><button onClick={() => { onDelete(sci.id); setConfirmDel(null); }} className="px-3 py-1.5 bg-red-500/80 text-white text-xs font-bold rounded-lg">Oui</button><button onClick={() => setConfirmDel(null)} className="px-3 py-1.5 bg-white/10 text-white/55 text-xs rounded-lg">Non</button></div></motion.div>
                  : <motion.button onClick={() => setConfirmDel(sci.id)} className="w-full py-2 text-[10px] text-white/17 hover:text-red-400 hover:bg-red-500/07 transition-all">Supprimer cette SCI</motion.button>}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}

// ─── CREDITS VIEW ────────────────────────────────────────────────────────────

type CreditEntry = Credit & { id: string; propertyId: string };

function CreditFormView({ credit, properties, onSave, onBack, onDelete }: { credit: CreditEntry | null; properties: Property[]; onSave: (c: CreditEntry) => void; onBack: () => void; onDelete?: () => void }) {
  const isEdit = !!credit;
  const [f, setF] = useState<CreditEntry>(credit ?? { id: uid(), propertyId: properties[0]?.id ?? "", banque: "", montantInitial: 0, taux: 0, duree: 240, mensualite: 0, debut: "", capitalRestant: 0 });
  const upd = (k: string, v: string | number) => setF((c) => ({ ...c, [k]: v }));
  return (
    <motion.div variants={pageV} initial="hidden" animate="show" className="max-w-2xl mx-auto space-y-4">
      <FormHdr title={isEdit ? `Modifier · ${f.banque}` : "Nouveau crédit"} onBack={onBack} onDelete={onDelete} onSave={() => onSave(f)} isEdit={isEdit} />
      <GSec title="Bien associé"><GS label="Bien" value={f.propertyId} onChange={(e) => upd("propertyId", e.target.value)} options={properties.map((p) => ({ value: p.id, label: `${p.address}, ${p.ville}` }))} /></GSec>
      <GSec title="Détails du prêt">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <GI label="Banque" value={f.banque} onChange={(e) => upd("banque", e.target.value)} className="sm:col-span-2" />
          <GI label="Montant initial (€)" type="number" value={f.montantInitial || ""} onChange={(e) => upd("montantInitial", +e.target.value)} />
          <GI label="Capital restant (€)" type="number" value={f.capitalRestant || ""} onChange={(e) => upd("capitalRestant", +e.target.value)} />
          <GI label="Taux (%)" type="number" step="0.01" value={f.taux || ""} onChange={(e) => upd("taux", +e.target.value)} />
          <GI label="Durée (mois)" type="number" value={f.duree || ""} onChange={(e) => upd("duree", +e.target.value)} />
          <GI label="Mensualité (€)" type="number" value={f.mensualite || ""} onChange={(e) => upd("mensualite", +e.target.value)} />
          <GI label="Date de début" type="date" value={f.debut} onChange={(e) => upd("debut", e.target.value)} />
        </div>
      </GSec>
    </motion.div>
  );
}

function CreditsView({ properties, scis, onUpdateProperty }: { properties: Property[]; scis: SCI[]; onUpdateProperty: (p: Property) => void }) {
  const allCredits: CreditEntry[] = properties.filter((p) => p.credit).map((p) => ({ ...p.credit!, id: `c_${p.id}`, propertyId: p.id }));
  const [mode, setMode] = useState<CrudMode>("list");
  const [editing, setEditing] = useState<CreditEntry | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const save = (c: CreditEntry) => { const prop = properties.find((p) => p.id === c.propertyId)!; onUpdateProperty({ ...prop, credit: { banque: c.banque, montantInitial: c.montantInitial, taux: c.taux, duree: c.duree, mensualite: c.mensualite, debut: c.debut, capitalRestant: c.capitalRestant } }); setMode("list"); setEditing(null); };
  const del = (c: CreditEntry) => { const prop = properties.find((p) => p.id === c.propertyId)!; onUpdateProperty({ ...prop, credit: undefined }); setConfirmDel(null); };
  if (mode !== "list") return <CreditFormView credit={editing} properties={properties} onBack={() => { setMode("list"); setEditing(null); }} onSave={save} onDelete={editing ? () => { del(editing); setMode("list"); setEditing(null); } : undefined} />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-3">
          {[{ l: "Capital total", v: fmt(allCredits.reduce((s, c) => s + c.capitalRestant, 0)), c: "#f87171" }, { l: "Mensualités/mois", v: fmt(allCredits.reduce((s, c) => s + c.mensualite, 0)), c: "#a78bfa" }].map((k) => (
            <div key={k.l} className={`${G} px-4 py-3`}><p className="text-[10px] text-white/33">{k.l}</p><p className="text-base font-bold font-mono mt-0.5" style={{ color: k.c }}>{k.v}</p></div>
          ))}
        </div>
        <button onClick={() => { setEditing(null); setMode("create"); }} className={`${btnP} ml-auto`}><Plus size={14} /><span className="hidden sm:inline">Nouveau crédit</span></button>
      </div>
      <motion.div variants={gridV} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {allCredits.map((c) => {
          const prop = properties.find((p) => p.id === c.propertyId)!;
          const sci = sciOf(prop, scis);
          const pct = Math.round(((c.montantInitial - c.capitalRestant) / c.montantInitial) * 100);
          return (
            <motion.div key={c.id} variants={itemV} whileHover={{ y: -3 }} className={`${G} p-5`} style={{ borderColor: `${sci.color}18` }}>
              <div className="flex items-start gap-4 mb-5">
                <div className="relative flex-shrink-0"><Ring pct={pct} color={sci.color} size={64} /><div className="absolute inset-0 flex items-center justify-center"><span className="text-xs font-bold" style={{ color: sci.color }}>{pct}%</span></div></div>
                <div className="flex-1 min-w-0 pt-1"><p className="text-sm font-bold text-white">{c.banque}</p><p className="text-xs text-white/33 truncate">{prop.address}, {prop.ville}</p><div className="mt-1"><SCIChip sci={sci} /></div></div>
                <motion.button whileHover={{ scale: 1.1 }} onClick={() => { setEditing(c); setMode("edit"); }} className="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-white/[0.13] flex items-center justify-center text-white/38 hover:text-white transition-all flex-shrink-0"><Pencil size={11} /></motion.button>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[{ l: "Capital restant", v: fmt(c.capitalRestant), col: "#f87171" }, { l: "Mensualité", v: fmt(c.mensualite) }, { l: "Taux", v: `${c.taux} %` }, { l: "Remboursé", v: fmt(c.montantInitial - c.capitalRestant), col: "#34d399" }].map((m) => (
                  <div key={m.l} className="bg-white/[0.04] rounded-xl p-3"><p className="text-[9px] text-white/28 uppercase tracking-wider mb-1">{m.l}</p><p className="text-xs font-bold font-mono" style={{ color: m.col ?? "rgba(255,255,255,0.85)" }}>{m.v}</p></div>
                ))}
              </div>
              <GBar pct={pct} color={sci.color} />
              <div className="flex items-center justify-between mt-1.5"><span className="text-[9px] text-white/22 font-mono">{fmt(c.montantInitial)}</span><span className="text-[9px] text-white/22 flex items-center gap-1"><Calendar size={8} />Fin {finCredit(c)}</span></div>
              <AnimatePresence>
                {confirmDel === c.id ? <DelConfirm onConfirm={() => del(c)} onCancel={() => setConfirmDel(null)} /> : <motion.button whileHover={{ backgroundColor: "rgba(239,68,68,0.07)" }} onClick={() => setConfirmDel(c.id)} className="w-full mt-3 py-1.5 rounded-xl text-[10px] text-white/15 hover:text-red-400 border border-transparent hover:border-red-400/14 transition-all">Supprimer</motion.button>}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}

// ─── TENANT FORM & VIEW ──────────────────────────────────────────────────────

function TenantForm({ tenant, properties, scis, onSave, onBack, onDelete }: { tenant: Tenant | null; properties: Property[]; scis: SCI[]; onSave: (t: Tenant) => void; onBack: () => void; onDelete?: () => void }) {
  const isEdit = !!tenant;
  const [f, setF] = useState<Tenant>(tenant ?? { id: uid(), propertyId: properties[0]?.id ?? "", nom: "", initiales: "", tel: "", email: "", debutBail: "", finBail: "", debutTs: 0, finTs: 0, loyer: 0, charges: 0, statut: "En cours" });
  const upd = (k: keyof Tenant, v: string | number) => setF((t) => ({ ...t, [k]: v }));
  return (
    <motion.div variants={pageV} initial="hidden" animate="show" className="max-w-2xl mx-auto space-y-4">
      <FormHdr title={isEdit ? `Modifier · ${f.nom}` : "Nouveau locataire"} onBack={onBack} onDelete={onDelete} onSave={() => onSave({ ...f, initiales: f.nom.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) })} isEdit={isEdit} />
      <GSec title="Bien loué"><GS label="Bien" value={f.propertyId} onChange={(e) => upd("propertyId", e.target.value)} options={properties.filter((p) => p.loyer > 0).map((p) => ({ value: p.id, label: `${p.address}, ${p.ville} (${sciOf(p, scis).shortName})` }))} /></GSec>
      <GSec title="Identité">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <GI label="Nom complet" placeholder="Sophie Martin" value={f.nom} onChange={(e) => upd("nom", e.target.value)} className="sm:col-span-2" />
          <GI label="Téléphone" value={f.tel} onChange={(e) => upd("tel", e.target.value)} />
          <GI label="Email" type="email" value={f.email} onChange={(e) => upd("email", e.target.value)} />
        </div>
      </GSec>
      <GSec title="Bail & Financier">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

function LocationView({ tenants, properties, scis, onAdd, onUpdate, onDelete }: { tenants: Tenant[]; properties: Property[]; scis: SCI[]; onAdd: (t: Tenant) => void; onUpdate: (t: Tenant) => void; onDelete: (id: string) => void }) {
  const [mode, setMode] = useState<CrudMode>("list");
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  if (mode !== "list") return <TenantForm tenant={editing} properties={properties} scis={scis} onBack={() => { setMode("list"); setEditing(null); }} onSave={(t) => { mode === "create" ? onAdd(t) : onUpdate(t); setMode("list"); setEditing(null); }} onDelete={editing ? () => { onDelete(editing.id); setMode("list"); setEditing(null); } : undefined} />;
  const statStyle: Record<Tenant["statut"], { bg: string; color: string }> = { "En cours": { bg: "rgba(52,211,153,0.13)", color: "#34d399" }, "Impayé": { bg: "rgba(248,113,113,0.13)", color: "#f87171" }, "Terminé": { bg: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)" } };
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-3">{[{ l: "Actifs", v: `${tenants.filter((t) => t.statut !== "Terminé").length}`, c: "#60a5fa" }, { l: "Loyers/mois", v: fmt(tenants.filter((t) => t.statut === "En cours").reduce((s, t) => s + t.loyer, 0)), c: "#34d399" }, { l: "Impayés", v: `${tenants.filter((t) => t.statut === "Impayé").length}`, c: "#f87171" }].map((k) => <div key={k.l} className={`${G} px-4 py-3`}><p className="text-[10px] text-white/33">{k.l}</p><p className="text-base font-bold font-mono mt-0.5" style={{ color: k.c }}>{k.v}</p></div>)}</div>
        <button onClick={() => { setEditing(null); setMode("create"); }} className={`${btnP} ml-auto`}><Plus size={14} /><span className="hidden sm:inline">Nouveau locataire</span></button>
      </div>
      <motion.div variants={gridV} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {tenants.map((t) => {
          const prop = properties.find((p) => p.id === t.propertyId)!;
          const sci = prop ? sciOf(prop, scis) : scis[0];
          const pct = leasePct(t);
          const ss = statStyle[t.statut];
          return (
            <motion.div key={t.id} variants={itemV} whileHover={{ y: -3 }} className={`${G} p-5`} style={{ borderColor: `${sci.color}18` }}>
              <div className="flex items-start gap-3 mb-4">
                <Ava initiales={t.initiales} color={sci.color} size={38} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2"><p className="text-sm font-bold text-white truncate">{t.nom}</p>
                    <div className="flex items-center gap-1 flex-shrink-0"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: ss.bg, color: ss.color }}>{t.statut}</span><motion.button whileHover={{ scale: 1.1 }} onClick={() => { setEditing(t); setMode("edit"); }} className="w-6 h-6 rounded-md bg-white/[0.06] hover:bg-white/[0.13] flex items-center justify-center text-white/35 hover:text-white transition-all"><Pencil size={10} /></motion.button></div>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5"><Phone size={9} className="text-white/24" /><p className="text-[10px] text-white/30">{t.tel}</p></div>
                  <div className="flex items-center gap-1"><Mail size={9} className="text-white/24" /><p className="text-[10px] text-white/30 truncate">{t.email}</p></div>
                </div>
              </div>
              {prop && <motion.div whileHover={{ x: 2 }} className="bg-white/[0.04] rounded-xl p-3 mb-3 flex items-center gap-2"><MapPin size={10} style={{ color: sci.color }} className="flex-shrink-0" /><div className="min-w-0"><p className="text-xs font-semibold text-white/72 truncate">{prop.address}</p><p className="text-[10px] text-white/30">{prop.ville} · {prop.type}</p></div></motion.div>}
              <div className="mb-3"><div className="flex justify-between mb-1.5"><span className="text-[9px] text-white/27">{t.debutBail}</span><span className="text-[9px] text-white/27">{t.finBail}</span></div><GBar pct={pct} color={sci.color} /><p className="text-[9px] text-white/22 mt-1">{pct < 100 ? `${100 - pct}% de bail restant` : "Bail terminé"}</p></div>
              <div className="flex items-center justify-between pt-3 border-t border-white/[0.05]">
                <div><p className="text-[9px] text-white/27">Loyer</p><p className="text-sm font-bold font-mono text-white">{fmt(t.loyer)}</p></div>
                {t.charges > 0 && <div><p className="text-[9px] text-white/27">Charges</p><p className="text-xs font-mono text-white/52">{fmt(t.charges)}</p></div>}
                <div><p className="text-[9px] text-white/27">Total</p><p className="text-sm font-bold font-mono" style={{ color: "#34d399" }}>{fmt(t.loyer + t.charges)}</p></div>
              </div>
              <AnimatePresence>
                {confirmDel === t.id ? <DelConfirm onConfirm={() => { onDelete(t.id); setConfirmDel(null); }} onCancel={() => setConfirmDel(null)} /> : <motion.button whileHover={{ backgroundColor: "rgba(239,68,68,0.07)" }} onClick={() => setConfirmDel(t.id)} className="w-full mt-3 py-1.5 rounded-xl text-[10px] text-white/15 hover:text-red-400 border border-transparent hover:border-red-400/14 transition-all">Supprimer</motion.button>}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}

// ─── COMPTABILITÉ ─────────────────────────────────────────────────────────────

function ComptabiliteView({ properties, scis }: { properties: Property[]; scis: SCI[] }) {
  const grandCF = properties.reduce((s, p) => s + cashFlow(p), 0);
  const barData = scis.map((sci) => { const props = properties.filter((p) => p.sciId === sci.id); return { name: sci.shortName, revenus: props.reduce((s, p) => s + p.loyer, 0), charges: props.reduce((s, p) => s + (p.credit?.mensualite ?? 0) + p.taxeFonciere / 12 + p.assurance / 12, 0), fill: sci.color }; });
  return (
    <div className="space-y-5">
      <motion.div variants={itemV} initial="hidden" animate="show" className={`${GE} p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4`} style={{ borderColor: grandCF >= 0 ? "rgba(52,211,153,0.2)" : "rgba(248,113,113,0.2)" }}>
        <div><p className={lbl}>Résultat net consolidé mensuel</p><p className="text-3xl sm:text-4xl font-bold" style={{ color: grandCF >= 0 ? "#34d399" : "#f87171", fontFamily: "'JetBrains Mono',monospace" }}>{grandCF >= 0 ? "+" : ""}{fmt(grandCF)}</p></div>
        <p className="text-white/18 text-sm font-mono">{fmt(grandCF * 12)} / an</p>
      </motion.div>
      <motion.div variants={itemV} initial="hidden" animate="show" transition={{ delay: 0.1 }} className={`${G} p-5`}>
        <p className={`${lbl} mb-4`}>Revenus vs Charges par entité</p>
        <ResponsiveContainer width="100%" height={210}>
          <BarChart data={barData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "rgba(255,255,255,0.32)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.28)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => [fmt(v), ""]} contentStyle={TT} />
            <Bar dataKey="revenus" name="Revenus" radius={[4, 4, 0, 0]}>{barData.map((d, i) => <Cell key={i} fill={d.fill} opacity={0.78} />)}</Bar>
            <Bar dataKey="charges" name="Charges" radius={[4, 4, 0, 0]}>{barData.map((d, i) => <Cell key={i} fill={d.fill} opacity={0.32} />)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
      <motion.div variants={gridV} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {scis.map((sci) => {
          const props = properties.filter((p) => p.sciId === sci.id);
          const loyers = props.reduce((s, p) => s + p.loyer, 0);
          const credits = props.reduce((s, p) => s + (p.credit?.mensualite ?? 0), 0);
          const taxes = props.reduce((s, p) => s + p.taxeFonciere / 12, 0);
          const assurances = props.reduce((s, p) => s + p.assurance / 12, 0);
          const res = loyers - credits - taxes - assurances;
          const maxV = Math.max(loyers, credits + taxes + assurances, 1);
          return (
            <motion.div key={sci.id} variants={itemV} whileHover={{ y: -2 }} className={`${G} overflow-hidden`}>
              <div className={`px-5 py-4 bg-gradient-to-r ${sci.gradient} flex items-center justify-between`}>
                <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold" style={{ backgroundColor: `${sci.color}25`, color: sci.color }}>{sci.shortName.slice(0, 2)}</div><p className="font-bold text-white text-sm">{sci.name}</p></div>
                <p className="text-xl font-bold font-mono" style={{ color: res >= 0 ? "#34d399" : "#f87171" }}>{res >= 0 ? "+" : ""}{fmt(res)}</p>
              </div>
              <div className="p-5 space-y-4">
                {[{ label: "Loyers", value: loyers, color: "#34d399", dir: "▲" }, { label: "Crédits", value: credits, color: "#f87171", dir: "▼" }, { label: "Taxe foncière", value: taxes, color: "#fbbf24", dir: "▼" }, { label: "Assurances", value: assurances, color: "#94a3b8", dir: "▼" }].map((row) => (
                  <div key={row.label}><div className="flex justify-between items-center mb-1.5"><p className="text-xs text-white/42">{row.label}</p><p className="text-xs font-bold font-mono" style={{ color: row.color }}>{row.dir} {fmt(row.value)}</p></div><GBar pct={(row.value / maxV) * 100} color={row.color} /></div>
                ))}
                <div className="pt-3 border-t border-white/[0.06] flex justify-between items-center"><span className="text-xs text-white/42">Résultat mensuel</span><span className="text-base font-bold font-mono" style={{ color: res >= 0 ? "#34d399" : "#f87171" }}>{res >= 0 ? "+" : ""}{fmt(res)}</span></div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}

// ─── PATRIMOINE ───────────────────────────────────────────────────────────────

function PatrimoineView({ properties, scis }: { properties: Property[]; scis: SCI[] }) {
  const items = properties.map((p) => { const cr = p.prixAchat + p.travaux + p.fraisNotaire; const pv = p.valeurActuelle - cr; return { p, cr, pv, pct: (pv / cr) * 100, sci: sciOf(p, scis) }; }).sort((a, b) => b.pv - a.pv);
  const totalPV = items.reduce((s, x) => s + x.pv, 0);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[{ l: "Coût de revient total", v: fmt(items.reduce((s, x) => s + x.cr, 0)), c: "rgba(255,255,255,0.65)" }, { l: "Valeur de marché", v: fmt(scis.reduce((s, x) => s + x.valeurEstimee, 0)), c: "#60a5fa" }, { l: "Plus-value latente", v: `+${fmt(totalPV)}`, c: "#34d399" }].map((k, i) => (
          <motion.div key={k.l} variants={itemV} initial="hidden" animate="show" transition={{ delay: i * 0.07 }} className={`${G} p-4`}><p className={lbl}>{k.l}</p><p className="text-xl font-bold font-mono" style={{ color: k.c }}>{k.v}</p></motion.div>
        ))}
      </div>
      <motion.div variants={itemV} initial="hidden" animate="show" transition={{ delay: 0.15 }} className={`${G} p-5`}>
        <p className={`${lbl} mb-4`}>Évolution 2017 – 2024 · k€</p>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={PATRIMOINE_DATA} margin={{ top: 5, right: 5, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="pv2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#60a5fa" stopOpacity={0.26} /><stop offset="100%" stopColor="#60a5fa" stopOpacity={0} /></linearGradient>
              <linearGradient id="pn2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34d399" stopOpacity={0.26} /><stop offset="100%" stopColor="#34d399" stopOpacity={0} /></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="an" tick={{ fontSize: 11, fill: "rgba(255,255,255,0.28)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "rgba(255,255,255,0.28)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}k`} />
            <Tooltip formatter={(v: number) => [`${v} k€`, ""]} contentStyle={TT} />
            <Area type="monotone" dataKey="valeur" stroke="#60a5fa" strokeWidth={2.5} fill="url(#pv2)" name="Valeur brute" />
            <Area type="monotone" dataKey="dette" stroke="#f87171" strokeWidth={1.5} fill="none" strokeDasharray="5 3" name="Dette" />
            <Area type="monotone" dataKey="net" stroke="#34d399" strokeWidth={2.5} fill="url(#pn2)" name="Net" />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Desktop table / mobile cards */}
      <motion.div variants={itemV} initial="hidden" animate="show" transition={{ delay: 0.2 }} className={`${G} overflow-hidden`}>
        <div className="px-5 py-4 border-b border-white/[0.06]"><p className={lbl}>Plus-values latentes par bien</p></div>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-white/[0.05]">{["Bien", "Entité", "Coût de revient", "Valeur actuelle", "Plus-value", "Gain %"].map((h) => <th key={h} className="text-left px-5 py-3 text-[10px] font-bold text-white/28 uppercase tracking-wider whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>
              {items.map(({ p, cr, pv, pct, sci }, i) => (
                <motion.tr key={p.id} variants={rowV} initial="hidden" animate="show" transition={{ delay: i * 0.04 }} className="border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors">
                  <td className="px-5 py-3.5"><p className="text-sm text-white font-medium">{p.address}</p><p className="text-[10px] text-white/30">{p.ville} · {p.type}</p></td>
                  <td className="px-5 py-3.5"><SCIChip sci={sci} /></td>
                  <td className="px-5 py-3.5 font-mono text-xs text-white/52">{fmt(cr)}</td>
                  <td className="px-5 py-3.5 font-mono text-xs font-semibold text-white/82">{fmt(p.valeurActuelle)}</td>
                  <td className="px-5 py-3.5 font-mono text-sm font-bold" style={{ color: pv >= 0 ? "#34d399" : "#f87171" }}>{pv >= 0 ? "+" : ""}{fmt(pv)}</td>
                  <td className="px-5 py-3.5 font-mono text-sm font-bold" style={{ color: pct >= 0 ? "#34d399" : "#f87171" }}>{pct >= 0 ? "+" : ""}{pct.toFixed(1)}%</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="md:hidden p-4 space-y-2">
          {items.map(({ p, pv, pct, sci }) => (
            <div key={p.id} className="flex items-center justify-between py-3 border-b border-white/[0.05] last:border-0">
              <div className="min-w-0 mr-3"><p className="text-xs font-medium text-white truncate">{p.address}</p><p className="text-[10px] text-white/33">{p.ville}</p><div className="mt-1"><SCIChip sci={sci} /></div></div>
              <div className="text-right flex-shrink-0"><p className="text-sm font-bold font-mono" style={{ color: pv >= 0 ? "#34d399" : "#f87171" }}>{pv >= 0 ? "+" : ""}{fmt(pv)}</p><p className="text-xs font-mono" style={{ color: pct >= 0 ? "#34d399" : "#f87171" }}>{pct >= 0 ? "+" : ""}{pct.toFixed(1)}%</p></div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ─── ALERTES — TIMELINE ───────────────────────────────────────────────────────

function AlertesView({ alerts, onDelete }: { alerts: AlertItem[]; onDelete: (id: string) => void }) {
  const iconMap = { bail: Key, credit: CreditCard, taxe: Calendar, assurance: Shield, info: AlertTriangle };
  const sevCfg = {
    high: { color: "#f87171", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.22)", label: "Urgent", dot: "#ef4444" },
    medium: { color: "#fbbf24", bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.18)", label: "Important", dot: "#f59e0b" },
    low: { color: "rgba(255,255,255,0.38)", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.09)", label: "Info", dot: "rgba(255,255,255,0.28)" },
  };
  const sorted = [...alerts].sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.severity] - { high: 0, medium: 1, low: 2 }[b.severity]));
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {(["high", "medium", "low"] as const).map((sev, i) => {
          const cfg = sevCfg[sev]; const cnt = alerts.filter((a) => a.severity === sev).length;
          return <motion.div key={sev} variants={itemV} initial="hidden" animate="show" transition={{ delay: i * 0.07 }} className={`${G} p-4`} style={{ borderColor: cfg.border }}><p className="text-[10px] text-white/33 mb-1">{cfg.label}s</p><p className="text-3xl font-bold" style={{ color: cfg.color, fontFamily: "'JetBrains Mono',monospace" }}>{cnt}</p></motion.div>;
        })}
      </div>
      <div className="relative">
        <div className="absolute left-5 top-2 bottom-2 w-px" style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.12), rgba(255,255,255,0.03))" }} />
        <div className="space-y-3 pl-12">
          {sorted.map((a, i) => {
            const cfg = sevCfg[a.severity]; const Icon = iconMap[a.type];
            return (
              <motion.div key={a.id} variants={rowV} initial="hidden" animate="show" transition={{ delay: i * 0.06 }} whileHover={{ x: 3 }}
                className="relative rounded-2xl p-4 backdrop-blur-xl border flex items-start gap-4" style={{ backgroundColor: cfg.bg, borderColor: cfg.border }}>
                <div className="absolute -left-[2.85rem] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 flex items-center justify-center" style={{ backgroundColor: cfg.dot, borderColor: "#060c1a" }}><div className="w-1.5 h-1.5 rounded-full bg-white/75" /></div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${cfg.color}18` }}><Icon size={16} style={{ color: cfg.color }} /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div><p className="text-sm font-bold text-white">{a.title}</p><p className="text-xs text-white/37 mt-0.5 leading-relaxed">{a.detail}</p></div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full" style={{ backgroundColor: `${cfg.color}18`, color: cfg.color }}>{cfg.label}</span>
                      <motion.button whileHover={{ scale: 1.1, rotate: 90 }} transition={{ duration: 0.18 }} onClick={() => onDelete(a.id)} className="w-7 h-7 rounded-xl bg-white/[0.06] hover:bg-red-500/28 flex items-center justify-center text-white/22 hover:text-red-300 transition-colors"><X size={13} /></motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
          {alerts.length === 0 && <div className="text-center py-14"><p className="text-white/22 text-sm">Aucune alerte active</p></div>}
        </div>
      </div>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────

const NAV = [
  { id: "dashboard" as View, label: "Dashboard", Icon: LayoutDashboard },
  { id: "sci" as View, label: "SCI", Icon: Building2 },
  { id: "biens" as View, label: "Biens", Icon: Home },
  { id: "credits" as View, label: "Crédits", Icon: CreditCard },
  { id: "location" as View, label: "Locataires", Icon: Users },
  { id: "comptabilite" as View, label: "Comptabilité", Icon: FileText },
  { id: "patrimoine" as View, label: "Patrimoine", Icon: TrendingUp },
  { id: "alertes" as View, label: "Alertes", Icon: Bell },
];
const PAGE_TITLES: Record<View, string> = { dashboard: "Vue d'ensemble", sci: "SCI & Entités", biens: "Biens immobiliers", credits: "Crédits & Emprunts", location: "Gestion locative", comptabilite: "Comptabilité", patrimoine: "Vision patrimoniale", alertes: "Alertes" };

export default function App() {
  const [view, setView] = useState<View>("dashboard");
  const [properties, setProperties] = useState<Property[]>(PROPS_INIT);
  const [scis, setScis] = useState<SCI[]>(SCIS_INIT);
  const [tenants, setTenants] = useState<Tenant[]>(TENANTS_INIT);
  const [alerts, setAlerts] = useState<AlertItem[]>(ALERTS_INIT);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const addProp = (p: Property) => setProperties((ps) => [...ps, p]);
  const updProp = (p: Property) => setProperties((ps) => ps.map((x) => x.id === p.id ? p : x));
  const delProp = (id: string) => setProperties((ps) => ps.filter((x) => x.id !== id));
  const addSCI = (s: SCI) => setScis((ss) => [...ss, s]);
  const updSCI = (s: SCI) => setScis((ss) => ss.map((x) => x.id === s.id ? s : x));
  const delSCI = (id: string) => setScis((ss) => ss.filter((x) => x.id !== id));
  const addTenant = (t: Tenant) => setTenants((ts) => [...ts, t]);
  const updTenant = (t: Tenant) => setTenants((ts) => ts.map((x) => x.id === t.id ? t : x));
  const delTenant = (id: string) => setTenants((ts) => ts.filter((x) => x.id !== id));
  const delAlert = (id: string) => setAlerts((as) => as.filter((x) => x.id !== id));

  const highAlerts = alerts.filter((a) => a.severity === "high").length;
  const handleNav = (v: View) => { setView(v); setSidebarOpen(false); };

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: "linear-gradient(135deg,#060c1a 0%,#0c0826 50%,#060f20 100%)" }}>
      {/* Blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-64 -left-64 w-[700px] h-[700px] rounded-full" style={{ background: "radial-gradient(circle,rgba(37,99,235,0.11) 0%,transparent 65%)" }} />
        <div className="absolute top-[35%] -right-48 w-[500px] h-[500px] rounded-full" style={{ background: "radial-gradient(circle,rgba(124,58,237,0.09) 0%,transparent 65%)" }} />
        <div className="absolute -bottom-48 left-[20%] w-[500px] h-[500px] rounded-full" style={{ background: "radial-gradient(circle,rgba(6,182,212,0.07) 0%,transparent 65%)" }} />
      </div>

      {/* Mobile backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/58 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full z-50 w-[218px] flex flex-col transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:z-auto ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ background: "rgba(255,255,255,0.04)", borderRight: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(24px)" }}>
        <div className="px-5 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg,#3b82f6,#2563eb)", boxShadow: "0 4px 14px rgba(37,99,235,0.38)" }}><Building2 size={15} className="text-white" /></div>
            <div><p className="text-white text-sm font-bold leading-none" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Patrimoine</p><p className="text-[10px] tracking-widest mt-0.5" style={{ color: "rgba(255,255,255,0.27)" }}>IMMOBILIER</p></div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden w-7 h-7 rounded-lg bg-white/[0.08] flex items-center justify-center text-white/48"><X size={13} /></button>
        </div>
        <nav className="flex-1 px-3 py-1 space-y-0.5 overflow-y-auto">
          {NAV.map(({ id, label, Icon }) => {
            const active = view === id;
            return (
              <motion.button key={id} onClick={() => handleNav(id)} whileHover={!active ? { x: 3 } : {}} whileTap={{ scale: 0.97 }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all duration-150"
                style={active ? { background: "rgba(255,255,255,0.12)", color: "white", border: "1px solid rgba(255,255,255,0.14)" } : { color: "rgba(255,255,255,0.37)", border: "1px solid transparent" }}>
                <Icon size={14} />
                <span className="text-xs font-semibold flex-1">{label}</span>
                <AnimatePresence>{id === "alertes" && highAlerts > 0 && <motion.span key="b" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center bg-red-500 text-white">{highAlerts}</motion.span>}</AnimatePresence>
              </motion.button>
            );
          })}
        </nav>
        <div className="px-4 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-3"><Ava initiales="JF" color="#60a5fa" size={32} /><div><p className="text-white text-xs font-semibold">Johann Faraut</p><p className="text-[10px]" style={{ color: "rgba(255,255,255,0.27)" }}>Gérant</p></div></div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        <header className="px-4 sm:px-6 py-3.5 flex items-center justify-between flex-shrink-0" style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(16px)" }}>
          <div className="flex items-center gap-3">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.94 }} onClick={() => setSidebarOpen(true)} className="lg:hidden w-9 h-9 rounded-xl bg-white/[0.07] flex items-center justify-center text-white/52 border border-white/[0.09] transition-colors"><Menu size={16} /></motion.button>
            <div>
              <h1 className="text-sm font-bold text-white" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{PAGE_TITLES[view]}</h1>
              <p className="text-[10px] mt-0.5 hidden sm:block" style={{ color: "rgba(255,255,255,0.27)" }}>{new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
            </div>
          </div>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.94 }} onClick={() => handleNav("alertes")} className="relative w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.42)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <Bell size={15} />
            <AnimatePresence>{highAlerts > 0 && <motion.span key="hb" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold text-white bg-red-500">{highAlerts}</motion.span>}</AnimatePresence>
          </motion.button>
        </header>

        {/* Mobile bottom nav */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 flex" style={{ background: "rgba(6,12,26,0.88)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          {NAV.slice(0, 5).map(({ id, label, Icon }) => {
            const active = view === id;
            return (
              <motion.button key={id} onClick={() => handleNav(id)} whileTap={{ scale: 0.88 }} className="flex-1 flex flex-col items-center gap-1 py-3 transition-colors" style={{ color: active ? "#60a5fa" : "rgba(255,255,255,0.3)" }}>
                <div className="relative"><Icon size={18} />{id === "alertes" && highAlerts > 0 && <span className="absolute -top-1 -right-1.5 w-3 h-3 rounded-full bg-red-500 text-[7px] font-bold text-white flex items-center justify-center">{highAlerts}</span>}</div>
                <span className="text-[9px] font-semibold">{label}</span>
              </motion.button>
            );
          })}
          <motion.button whileTap={{ scale: 0.88 }} onClick={() => setSidebarOpen(true)} className="flex-1 flex flex-col items-center gap-1 py-3" style={{ color: "rgba(255,255,255,0.3)" }}>
            <Menu size={18} /><span className="text-[9px] font-semibold">Plus</span>
          </motion.button>
        </div>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7 pb-20 lg:pb-6">
          <AnimatePresence mode="wait">
            <motion.div key={view} variants={pageV} initial="hidden" animate="show" exit="exit">
              {view === "dashboard" && <DashboardView properties={properties} scis={scis} />}
              {view === "sci" && <SCIView scis={scis} properties={properties} onAdd={addSCI} onUpdate={updSCI} onDelete={delSCI} />}
              {view === "biens" && <BiensView properties={properties} scis={scis} onAdd={addProp} onUpdate={updProp} onDelete={delProp} />}
              {view === "credits" && <CreditsView properties={properties} scis={scis} onUpdateProperty={updProp} />}
              {view === "location" && <LocationView tenants={tenants} properties={properties} scis={scis} onAdd={addTenant} onUpdate={updTenant} onDelete={delTenant} />}
              {view === "comptabilite" && <ComptabiliteView properties={properties} scis={scis} />}
              {view === "patrimoine" && <PatrimoineView properties={properties} scis={scis} />}
              {view === "alertes" && <AlertesView alerts={alerts} onDelete={delAlert} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
