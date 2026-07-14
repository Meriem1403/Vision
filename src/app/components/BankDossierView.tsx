import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Building2, Send, Eye, Trash2, FileText, Euro, TrendingUp, Shield,
  Check, ChevronDown, Banknote,
} from "lucide-react";
import { api } from "@/lib/api";
import { pageWrap, G, lbl, inp, btnP, btnG, btnD } from "./layout";

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

const BANKS = [
  "Crédit Agricole", "BNP Paribas", "Société Générale", "LCL", "CIC",
  "Crédit Mutuel", "Banque Populaire", "BRED", "Caisse d'Épargne",
];

interface DossierPreview {
  synthese: {
    patrimoineBrut?: number;
    patrimoineNet?: number;
    detteTotale?: number;
    cashMensuelNet?: number;
    loyersAnnuels?: number;
    tauxEndettement?: number;
    rendementBrut?: number;
    repartitionBanques?: Array<{ banque: string; capitalRestant: number; mensualites: number }>;
    demande?: { montant: number; objet: string | null; ltvProjete: number | null };
  };
  entites: Array<{ shortName: string; type: string; valeurEstimee: number; dette: number }>;
  biens: Array<{ address: string; ville: string; valeurActuelle: number; loyer: number }>;
}

interface DossierItem {
  id: string;
  reference: string;
  title: string;
  targetBank: string;
  status: string;
  montantDemande?: number;
  sentAt?: string;
  createdAt: string;
}

interface BankDossierViewProps {
  entityOptions: Array<{ id: string; shortName: string }>;
}

export function BankDossierView({ entityOptions }: BankDossierViewProps) {
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
  const [preview, setPreview] = useState<DossierPreview | null>(null);
  const [dossiers, setDossiers] = useState<DossierItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDossier, setSelectedDossier] = useState<Record<string, unknown> | null>(null);

  const loadDossiers = () => api.getDossiers().then((d) => setDossiers(d as DossierItem[])).catch(() => {});

  useEffect(() => { loadDossiers(); }, []);

  const buildPayload = useMemo(() => ({
    entitySlugs: selectedEntities,
    includePatrimoine,
    includeEndettement,
    includeCashFlow,
    anonymizeTenants,
    montantDemande: montant,
    objet,
  }), [selectedEntities, includePatrimoine, includeEndettement, includeCashFlow, anonymizeTenants, montant, objet]);

  const handlePreview = async () => {
    setLoading(true);
    try {
      const data = await api.previewDossier(buildPayload);
      setPreview(data as DossierPreview);
    } catch {
      setPreview(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (sendNow: boolean) => {
    setLoading(true);
    try {
      await api.createDossier({
        title,
        targetBank,
        message,
        ...buildPayload,
        sendNow,
      });
      setPreview(null);
      loadDossiers();
    } finally {
      setLoading(false);
    }
  };

  const toggleEntity = (id: string) => {
    setSelectedEntities((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const viewDossier = async (id: string) => {
    const d = await api.getDossier(id);
    setSelectedDossier(d);
  };

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
              Compilez automatiquement votre patrimoine, endettement et cash-flow pour présenter votre situation à une banque.
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
              <label className={lbl}>Message accompagnement</label>
              <textarea className={`${inp} min-h-[80px]`} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Contexte de la demande, projet envisagé…" />
            </div>
          </div>

          <div className="space-y-3">
            <p className={lbl}>Entités à inclure</p>
            <div className="flex flex-wrap gap-2">
              {entityOptions.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => toggleEntity(e.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${selectedEntities.includes(e.id) ? "vision-nav-active" : "vision-surface vision-text-muted"}`}
                >
                  {selectedEntities.includes(e.id) && <Check size={10} className="inline mr-1" />}
                  {e.shortName}
                </button>
              ))}
            </div>

            <p className={lbl}>Contenu du dossier</p>
            {[
              { key: "patrimoine", label: "Synthèse patrimoniale", val: includePatrimoine, set: setIncludePatrimoine },
              { key: "dette", label: "Endettement & répartition banques", val: includeEndettement, set: setIncludeEndettement },
              { key: "cash", label: "Cash-flow & capacité de remboursement", val: includeCashFlow, set: setIncludeCashFlow },
              { key: "anon", label: "Anonymiser les locataires", val: anonymizeTenants, set: setAnonymizeTenants },
            ].map((opt) => (
              <label key={opt.key} className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={opt.val} onChange={(e) => opt.set(e.target.checked)} className="rounded" />
                <span className="text-sm vision-text">{opt.label}</span>
              </label>
            ))}

            <div className="flex flex-wrap gap-2 pt-2">
              <button type="button" onClick={handlePreview} disabled={loading} className={btnG}>
                <Eye size={14} /> Prévisualiser
              </button>
              <button type="button" onClick={() => handleCreate(false)} disabled={loading} className={btnG}>
                <FileText size={14} /> Enregistrer brouillon
              </button>
              <button type="button" onClick={() => handleCreate(true)} disabled={loading} className={btnP}>
                <Send size={14} /> Envoyer à la banque
              </button>
            </div>
          </div>
        </div>
      </div>

      {preview && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`${G} p-5`}>
          <p className={`${lbl} mb-4`}>Aperçu du dossier</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {preview.synthese.patrimoineBrut != null && (
              <div className="vision-surface rounded-xl p-3">
                <p className="text-xs vision-text-muted">Patrimoine brut</p>
                <p className="text-sm font-bold font-mono vision-info-text">{fmt(preview.synthese.patrimoineBrut)}</p>
              </div>
            )}
            {preview.synthese.patrimoineNet != null && (
              <div className="vision-surface rounded-xl p-3">
                <p className="text-xs vision-text-muted">Patrimoine net</p>
                <p className="text-sm font-bold font-mono vision-positive-text">{fmt(preview.synthese.patrimoineNet)}</p>
              </div>
            )}
            {preview.synthese.detteTotale != null && (
              <div className="vision-surface rounded-xl p-3">
                <p className="text-xs vision-text-muted">Dette totale</p>
                <p className="text-sm font-bold font-mono vision-negative-text">{fmt(preview.synthese.detteTotale)}</p>
              </div>
            )}
            {preview.synthese.cashMensuelNet != null && (
              <div className="vision-surface rounded-xl p-3">
                <p className="text-xs vision-text-muted">Cash-flow mensuel</p>
                <p className="text-sm font-bold font-mono" style={{ color: preview.synthese.cashMensuelNet >= 0 ? "#34d399" : "#f87171" }}>
                  {preview.synthese.cashMensuelNet >= 0 ? "+" : ""}{fmt(preview.synthese.cashMensuelNet)}
                </p>
              </div>
            )}
          </div>

          {preview.synthese.repartitionBanques && (
            <div className="mb-4">
              <p className="text-xs vision-text-muted mb-2 flex items-center gap-1"><Building2 size={12} /> Répartition par banque</p>
              <div className="space-y-1.5">
                {preview.synthese.repartitionBanques.map((b) => (
                  <div key={b.banque} className="flex justify-between text-sm vision-surface rounded-lg px-3 py-2">
                    <span className="vision-text">{b.banque}</span>
                    <span className="font-mono vision-negative-text">{fmt(b.capitalRestant)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {preview.synthese.demande && (
            <div className="vision-surface rounded-xl p-4 border border-[var(--v-accent)]/20">
              <p className="text-xs vision-text-muted mb-1">Demande projetée</p>
              <p className="text-lg font-bold vision-text">{fmt(preview.synthese.demande.montant)}</p>
              {preview.synthese.demande.ltvProjete != null && (
                <p className="text-xs vision-text-muted mt-1">LTV projeté : {preview.synthese.demande.ltvProjete} %</p>
              )}
            </div>
          )}
        </motion.div>
      )}

      <div className={`${G} p-5`}>
        <p className={`${lbl} mb-4`}>Dossiers existants</p>
        {dossiers.length === 0 ? (
          <p className="text-sm vision-text-muted">Aucun dossier pour le moment.</p>
        ) : (
          <div className="space-y-2">
            {dossiers.map((d) => (
              <div key={d.id} className="flex flex-wrap items-center gap-3 p-3 rounded-xl vision-surface border border-[var(--v-border-subtle)]">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold vision-text">{d.title}</p>
                  <p className="text-xs vision-text-muted">{d.reference} · {d.targetBank} · {new Date(d.createdAt).toLocaleDateString("fr-FR")}</p>
                </div>
                <span className="text-xs font-bold px-2 py-1 rounded-lg" style={{ color: statusColor(d.status) }}>{d.status}</span>
                {d.montantDemande && <span className="text-xs font-mono vision-text">{fmt(d.montantDemande)}</span>}
                <button type="button" onClick={() => viewDossier(d.id)} className={btnG}><Eye size={12} /></button>
                {d.status === "DRAFT" && (
                  <button type="button" onClick={() => api.sendDossier(d.id).then(loadDossiers)} className={btnP}><Send size={12} /></button>
                )}
                <button type="button" onClick={() => api.deleteDossier(d.id).then(loadDossiers)} className={btnD}><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedDossier && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`${G} p-5`}>
          <div className="flex justify-between items-start mb-4">
            <p className="font-bold vision-text">{String(selectedDossier.title)}</p>
            <button type="button" onClick={() => setSelectedDossier(null)} className={btnG}>Fermer</button>
          </div>
          <pre className="text-xs vision-text-muted overflow-auto max-h-96 vision-surface rounded-xl p-4">
            {JSON.stringify(selectedDossier.payload, null, 2)}
          </pre>
        </motion.div>
      )}
    </div>
  );
}
