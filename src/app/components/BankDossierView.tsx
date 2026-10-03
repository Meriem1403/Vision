import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Building2, Send, Eye, Trash2, FileText, Check, ChevronDown, Banknote,
} from "lucide-react";
import { api } from "@/lib/api";
import type { AuthUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import { createDossier, deleteDossier, fetchDossier, fetchDossiers, sendDossier } from "@/lib/supabaseRepo";
import { pageWrap, G, lbl, inp, btnP, btnG, btnD } from "./layout";

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

const BANKS = [
  "Crédit Agricole", "BNP Paribas", "Société Générale", "LCL", "CIC",
  "Crédit Mutuel", "Banque Populaire", "BRED", "Caisse d'Épargne",
];

interface SciOpt { id: string; shortName: string; valeurEstimee?: number }
interface PropOpt {
  id: string;
  sciId: string;
  address: string;
  ville: string;
  type: string;
  valeurActuelle: number;
  loyer: number;
  taxeFonciere: number;
  assurance: number;
  credit?: { banque: string; capitalRestant: number; mensualite: number; assuranceMensuelle?: number; montantInitial: number; taux: number };
}

interface BankDossierViewProps {
  user: AuthUser;
  entityOptions: SciOpt[];
  properties: PropOpt[];
  scis: SciOpt[];
}

function buildPayload(
  properties: PropOpt[],
  scis: SciOpt[],
  entitySlugs: string[],
  opts: {
    includePatrimoine: boolean;
    includeEndettement: boolean;
    includeCashFlow: boolean;
    montantDemande?: number;
    objet?: string;
  },
) {
  const ents = scis.filter((s) => entitySlugs.includes(s.id));
  const props = properties.filter((p) => entitySlugs.includes(p.sciId));
  const totalValeur = ents.reduce((s, e) => s + (e.valeurEstimee ?? 0), 0);
  const totalDette = props.reduce((s, p) => s + (p.credit?.capitalRestant ?? 0), 0);
  const totalLoyers = props.reduce((s, p) => s + p.loyer * 12, 0);
  const totalMens = props.reduce((s, p) => s + (p.credit?.mensualite ?? 0) + (p.credit?.assuranceMensuelle ?? 0), 0);
  const cash = props.reduce((s, p) => s + Math.round(p.loyer - (p.credit?.mensualite ?? 0) - p.taxeFonciere / 12 - p.assurance / 12), 0);

  const byBank: Record<string, { count: number; crd: number; mensualites: number }> = {};
  for (const p of props) {
    if (!p.credit) continue;
    const b = p.credit.banque;
    if (!byBank[b]) byBank[b] = { count: 0, crd: 0, mensualites: 0 };
    byBank[b].count += 1;
    byBank[b].crd += p.credit.capitalRestant;
    byBank[b].mensualites += p.credit.mensualite + (p.credit.assuranceMensuelle ?? 0);
  }

  return {
    synthese: {
      dateGeneration: new Date().toISOString(),
      nombreEntites: ents.length,
      nombreBiens: props.length,
      ...(opts.includePatrimoine && {
        patrimoineBrut: totalValeur,
        patrimoineNet: totalValeur - totalDette,
        tauxEndettement: totalValeur > 0 ? Math.round((totalDette / totalValeur) * 1000) / 10 : 0,
        rendementBrut: totalValeur > 0 ? Math.round((totalLoyers / totalValeur) * 10000) / 100 : 0,
        rendementNet: totalValeur > 0
          ? Math.round(((totalLoyers - props.reduce((s, p) => s + (p.taxeFonciere || 0) + (p.assurance || 0), 0)) / totalValeur) * 10000) / 100
          : 0,
      }),
      ...(opts.includeEndettement && {
        detteTotale: totalDette,
        mensualitesTotales: Math.round(totalMens * 100) / 100,
        repartitionBanques: Object.entries(byBank).map(([banque, v]) => ({
          banque,
          nombreCredits: v.count,
          capitalRestant: v.crd,
          mensualites: Math.round(v.mensualites * 100) / 100,
        })),
      }),
      ...(opts.includeCashFlow && {
        loyersAnnuels: totalLoyers,
        cashMensuelNet: cash,
      }),
      ...(opts.montantDemande != null && {
        demande: {
          montant: opts.montantDemande,
          objet: opts.objet ?? null,
          ltvProjete: totalValeur > 0 ? Math.round(((totalDette + opts.montantDemande) / totalValeur) * 1000) / 10 : null,
        },
      }),
    },
    entites: ents.map((e) => ({
      slug: e.id,
      shortName: e.shortName,
      valeurEstimee: e.valeurEstimee ?? 0,
      dette: props.filter((p) => p.sciId === e.id).reduce((s, p) => s + (p.credit?.capitalRestant ?? 0), 0),
    })),
    biens: props.map((p) => ({
      address: p.address,
      ville: p.ville,
      type: p.type,
      valeurActuelle: p.valeurActuelle,
      loyer: p.loyer,
      cashMensuel: Math.round(p.loyer - (p.credit?.mensualite ?? 0) - p.taxeFonciere / 12 - p.assurance / 12),
      credit: p.credit
        ? { banque: p.credit.banque, capitalRestant: p.credit.capitalRestant, mensualite: p.credit.mensualite, taux: p.credit.taux }
        : null,
    })),
  };
}

export function BankDossierView({ user, entityOptions, properties, scis }: BankDossierViewProps) {
  const useSb = isSupabaseConfigured();
  const [title, setTitle] = useState("Demande de financement immobilier");
  const [targetBank, setTargetBank] = useState(BANKS[0]);
  const [montant, setMontant] = useState(250000);
  const [objet, setObjet] = useState("Acquisition / renégociation de crédit");
  const [message, setMessage] = useState("");
  const [selectedEntities, setSelectedEntities] = useState<string[]>(entityOptions.map((e) => e.id));
  const [includePatrimoine, setIncludePatrimoine] = useState(true);
  const [includeEndettement, setIncludeEndettement] = useState(true);
  const [includeCashFlow, setIncludeCashFlow] = useState(true);
  const [anonymizeTenants, setAnonymizeTenants] = useState(true);
  const [preview, setPreview] = useState<ReturnType<typeof buildPayload> | null>(null);
  const [dossiers, setDossiers] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDossier, setSelectedDossier] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    setSelectedEntities(entityOptions.map((e) => e.id));
  }, [entityOptions]);

  const loadDossiers = async () => {
    try {
      if (useSb) setDossiers(await fetchDossiers());
      else setDossiers(await api.getDossiers());
    } catch {
      setDossiers([]);
    }
  };

  useEffect(() => { loadDossiers(); }, [useSb]);

  const opts = useMemo(() => ({
    includePatrimoine, includeEndettement, includeCashFlow, montantDemande: montant, objet,
  }), [includePatrimoine, includeEndettement, includeCashFlow, montant, objet]);

  const handlePreview = () => {
    setPreview(buildPayload(properties, scis, selectedEntities, opts));
  };

  const handleCreate = async (sendNow: boolean) => {
    setLoading(true);
    try {
      const payload = buildPayload(properties, scis, selectedEntities, opts);
      if (useSb) {
        await createDossier({
          title, targetBank, message, montantDemande: montant, objet,
          entitySlugs: selectedEntities, includePatrimoine, includeEndettement, includeCashFlow,
          anonymizeTenants, payload, sendNow, createdBy: user.id,
        });
      } else {
        await api.createDossier({
          title, targetBank, message, montantDemande: montant, objet,
          entitySlugs: selectedEntities, includePatrimoine, includeEndettement, includeCashFlow,
          anonymizeTenants, sendNow,
        });
      }
      setPreview(null);
      await loadDossiers();
    } finally {
      setLoading(false);
    }
  };

  const toggleEntity = (id: string) => {
    setSelectedEntities((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const viewDossier = async (id: string) => {
    const d = useSb ? await fetchDossier(id) : await api.getDossier(id);
    setSelectedDossier(d as Record<string, unknown>);
  };

  const statusOf = (d: Record<string, unknown>) => String(d.status ?? "");
  const statusColor = (s: string) =>
    ({ DRAFT: "var(--v-text-muted)", SENT: "var(--v-info-text)", VIEWED: "var(--v-positive-text)", EXPIRED: "var(--v-negative-text)" }[s] ?? "var(--v-text-muted)");

  return (
    <div className={`${pageWrap} space-y-5`}>
      <div className={`${G} p-5`}>
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center vision-accent-bg">
            <Banknote size={20} className="vision-accent-text" />
          </div>
          <div>
            <h2 className="text-base font-bold vision-text">Dossier de négociation bancaire</h2>
            <p className="text-sm vision-text-muted mt-0.5">
              Compilez le patrimoine réel (Excel / Supabase) pour présenter votre situation à une banque.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <label className={lbl}>Titre du dossier</label>
              <input className={inp} value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Banque destinataire</label>
              <div className="relative">
                <select className={inp} value={targetBank} onChange={(e) => setTargetBank(e.target.value)}>
                  {BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 vision-text-muted w-4 h-4" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Montant demandé (€)</label>
                <input type="number" className={inp} value={montant} onChange={(e) => setMontant(+e.target.value)} />
              </div>
              <div>
                <label className={lbl}>Objet</label>
                <input className={inp} value={objet} onChange={(e) => setObjet(e.target.value)} />
              </div>
            </div>
            <div>
              <label className={lbl}>Message</label>
              <textarea className={`${inp} min-h-[80px]`} value={message} onChange={(e) => setMessage(e.target.value)} />
            </div>
          </div>

          <div className="space-y-3">
            <p className={lbl}>Entités à inclure</p>
            <div className="flex flex-wrap gap-2">
              {entityOptions.map((e) => (
                <button key={e.id} type="button" onClick={() => toggleEntity(e.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${selectedEntities.includes(e.id) ? "vision-nav-active" : "vision-surface vision-text-muted"}`}>
                  {selectedEntities.includes(e.id) && <Check size={10} className="inline mr-1" />}
                  {e.shortName}
                </button>
              ))}
            </div>
            <p className={lbl}>Contenu</p>
            {[
              { label: "Synthèse patrimoniale", val: includePatrimoine, set: setIncludePatrimoine },
              { label: "Endettement & banques", val: includeEndettement, set: setIncludeEndettement },
              { label: "Cash-flow", val: includeCashFlow, set: setIncludeCashFlow },
              { label: "Anonymiser locataires", val: anonymizeTenants, set: setAnonymizeTenants },
            ].map((opt) => (
              <label key={opt.label} className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={opt.val} onChange={(e) => opt.set(e.target.checked)} />
                <span className="text-sm vision-text">{opt.label}</span>
              </label>
            ))}
            <div className="flex flex-wrap gap-2 pt-2">
              <button type="button" onClick={handlePreview} className={btnG}><Eye size={14} /> Prévisualiser</button>
              <button type="button" onClick={() => handleCreate(false)} disabled={loading} className={btnG}><FileText size={14} /> Brouillon</button>
              <button type="button" onClick={() => handleCreate(true)} disabled={loading} className={btnP}><Send size={14} /> Envoyer</button>
            </div>
          </div>
        </div>
      </div>

      {preview && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`${G} p-5`}>
          <p className={`${lbl} mb-4`}>Aperçu</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {preview.synthese.patrimoineBrut != null && (
              <div className="vision-surface rounded-xl p-3"><p className="text-xs vision-text-muted">Patrimoine brut</p><p className="text-sm font-bold font-mono vision-info-text">{fmt(preview.synthese.patrimoineBrut)}</p></div>
            )}
            {preview.synthese.patrimoineNet != null && (
              <div className="vision-surface rounded-xl p-3"><p className="text-xs vision-text-muted">Net</p><p className="text-sm font-bold font-mono vision-positive-text">{fmt(preview.synthese.patrimoineNet)}</p></div>
            )}
            {preview.synthese.detteTotale != null && (
              <div className="vision-surface rounded-xl p-3"><p className="text-xs vision-text-muted">Dette</p><p className="text-sm font-bold font-mono vision-negative-text">{fmt(preview.synthese.detteTotale)}</p></div>
            )}
            {preview.synthese.cashMensuelNet != null && (
              <div className="vision-surface rounded-xl p-3"><p className="text-xs vision-text-muted">Cash/mois</p><p className="text-sm font-bold font-mono">{fmt(preview.synthese.cashMensuelNet)}</p></div>
            )}
            {preview.synthese.rendementBrut != null && (
              <div className="vision-surface rounded-xl p-3"><p className="text-xs vision-text-muted">Rdt brut</p><p className="text-sm font-bold font-mono text-amber-300">{preview.synthese.rendementBrut} %</p></div>
            )}
            {preview.synthese.rendementNet != null && (
              <div className="vision-surface rounded-xl p-3"><p className="text-xs vision-text-muted">Rdt net</p><p className="text-sm font-bold font-mono vision-positive-text">{preview.synthese.rendementNet} %</p></div>
            )}
          </div>
        </motion.div>
      )}

      <div className={`${G} p-5`}>
        <p className={`${lbl} mb-4`}>Dossiers</p>
        {dossiers.length === 0 ? (
          <p className="text-sm vision-text-muted">Aucun dossier.</p>
        ) : (
          <div className="space-y-2">
            {dossiers.map((d) => {
              const id = String(d.id);
              const status = statusOf(d);
              return (
                <div key={id} className="flex flex-wrap items-center gap-3 p-3 rounded-xl vision-surface border border-[var(--v-border-subtle)]">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold vision-text">{String(d.title)}</p>
                    <p className="text-xs vision-text-muted">{String(d.reference)} · {String(d.target_bank ?? d.targetBank)}</p>
                  </div>
                  <span className="text-xs font-bold" style={{ color: statusColor(status) }}>{status}</span>
                  <button type="button" onClick={() => viewDossier(id)} className={btnG}><Eye size={12} /></button>
                  {status === "DRAFT" && (
                    <button type="button" onClick={() => (useSb ? sendDossier(id) : api.sendDossier(id)).then(loadDossiers)} className={btnP}><Send size={12} /></button>
                  )}
                  <button type="button" onClick={() => (useSb ? deleteDossier(id) : api.deleteDossier(id)).then(loadDossiers)} className={btnD}><Trash2 size={12} /></button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedDossier && (
        <div className={`${G} p-5`}>
          <div className="flex justify-between mb-4">
            <p className="font-bold vision-text">{String(selectedDossier.title)}</p>
            <button type="button" onClick={() => setSelectedDossier(null)} className={btnG}>Fermer</button>
          </div>
          <pre className="text-xs vision-text-muted overflow-auto max-h-96 vision-surface rounded-xl p-4">
            {JSON.stringify(selectedDossier.payload, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
