import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Building2, Euro, TrendingUp, Shield, FileText, Eye, CreditCard,
} from "lucide-react";
import { api } from "@/lib/api";
import type { AuthUser } from "@/lib/auth";
import { pageWrap, G, lbl, btnG } from "./layout";

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

interface DossierItem {
  id: string;
  reference: string;
  title: string;
  targetBank: string;
  status: string;
  montantDemande?: number;
  objet?: string;
  sentAt?: string;
  viewedAt?: string;
  createdAt: string;
  createdByName?: string;
}

interface DossierPayload {
  synthese: {
    patrimoineBrut?: number;
    patrimoineNet?: number;
    detteTotale?: number;
    cashMensuelNet?: number;
    loyersAnnuels?: number;
    tauxEndettement?: number;
    rendementBrut?: number;
    ratioDetteRevenus?: number;
    repartitionBanques?: Array<{ banque: string; nombreCredits: number; capitalRestant: number; mensualites: number }>;
    demande?: { montant: number; objet: string | null; ltvProjete: number | null; capaciteMensuelleEstimee?: number };
  };
  entites: Array<{ shortName: string; name: string; type: string; valeurEstimee: number; dette: number; loyersAnnuels: number }>;
  biens: Array<{
    address: string;
    ville: string;
    type: string;
    valeurActuelle: number;
    loyer: number;
    cashMensuel: number;
    credit?: { banque: string; capitalRestant: number; mensualite: number; taux: number } | null;
  }>;
}

interface BankPortalViewProps {
  user: AuthUser;
  loans: Array<{ banque: string; capitalRestant: number; mensualite: number; propertyAddress?: string }>;
}

export function BankPortalView({ user, loans }: BankPortalViewProps) {
  const [dossiers, setDossiers] = useState<DossierItem[]>([]);
  const [selected, setSelected] = useState<{ meta: DossierItem; payload: DossierPayload } | null>(null);

  useEffect(() => {
    api.getDossiers().then((d) => setDossiers(d as DossierItem[])).catch(() => {});
  }, []);

  const openDossier = async (d: DossierItem) => {
    const full = await api.getDossier(d.id);
    setSelected({ meta: d, payload: full.payload as DossierPayload });
  };

  const myLoansTotal = loans.reduce((s, l) => s + l.capitalRestant, 0);
  const myMensualites = loans.reduce((s, l) => s + l.mensualite, 0);

  return (
    <div className={`${pageWrap} space-y-5`}>
      <div className={`${G} p-5`} style={{ borderColor: "var(--v-accent)22" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center vision-accent-bg">
            <Building2 size={20} className="vision-accent-text" />
          </div>
          <div>
            <h2 className="text-base font-bold vision-text">Portail {user.bankName}</h2>
            <p className="text-sm vision-text-muted">Vue restreinte — vos crédits et dossiers reçus uniquement</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="vision-surface rounded-xl p-3">
            <p className="text-xs vision-text-muted flex items-center gap-1"><CreditCard size={11} /> Vos crédits</p>
            <p className="text-lg font-bold font-mono vision-negative-text mt-1">{fmt(myLoansTotal)}</p>
            <p className="text-xs vision-text-muted">{loans.length} prêt{loans.length > 1 ? "s" : ""}</p>
          </div>
          <div className="vision-surface rounded-xl p-3">
            <p className="text-xs vision-text-muted">Mensualités totales</p>
            <p className="text-lg font-bold font-mono vision-violet-text mt-1">{fmt(myMensualites)}</p>
          </div>
          <div className="vision-surface rounded-xl p-3">
            <p className="text-xs vision-text-muted flex items-center gap-1"><FileText size={11} /> Dossiers reçus</p>
            <p className="text-lg font-bold font-mono vision-info-text mt-1">{dossiers.length}</p>
          </div>
        </div>
      </div>

      {dossiers.length > 0 && (
        <div className={`${G} p-5`}>
          <p className={`${lbl} mb-4`}>Dossiers patrimoniaux reçus</p>
          <div className="space-y-2">
            {dossiers.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => openDossier(d)}
                className="w-full flex flex-wrap items-center gap-3 p-4 rounded-xl vision-surface border border-[var(--v-border-subtle)] hover:vision-surface-strong transition-colors text-left"
              >
                <FileText size={18} className="vision-accent-text flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold vision-text">{d.title}</p>
                  <p className="text-xs vision-text-muted">
                    {d.reference} · De {d.createdByName ?? "Johann Faraut"} · {d.sentAt ? new Date(d.sentAt).toLocaleDateString("fr-FR") : "—"}
                  </p>
                </div>
                {d.montantDemande && <span className="text-sm font-mono font-bold vision-text">{fmt(d.montantDemande)}</span>}
                <span className="text-xs font-bold" style={{ color: d.status === "VIEWED" ? "var(--v-positive-text)" : "var(--v-info-text)" }}>
                  {d.status === "VIEWED" ? "Consulté" : "Nouveau"}
                </span>
                <Eye size={14} className="vision-text-muted" />
              </button>
            ))}
          </div>
        </div>
      )}

      {selected && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className={`${G} p-5`}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-lg font-bold vision-text">{selected.meta.title}</p>
                <p className="text-sm vision-text-muted">{selected.meta.reference} · Demande de {selected.meta.createdByName}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className={btnG}>Fermer</button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {selected.payload.synthese.patrimoineBrut != null && (
                <div className="vision-surface rounded-xl p-3">
                  <p className="text-xs vision-text-muted flex items-center gap-1"><TrendingUp size={11} /> Patrimoine brut</p>
                  <p className="text-sm font-bold font-mono vision-info-text">{fmt(selected.payload.synthese.patrimoineBrut)}</p>
                </div>
              )}
              {selected.payload.synthese.patrimoineNet != null && (
                <div className="vision-surface rounded-xl p-3">
                  <p className="text-xs vision-text-muted">Patrimoine net</p>
                  <p className="text-sm font-bold font-mono vision-positive-text">{fmt(selected.payload.synthese.patrimoineNet)}</p>
                </div>
              )}
              {selected.payload.synthese.detteTotale != null && (
                <div className="vision-surface rounded-xl p-3">
                  <p className="text-xs vision-text-muted flex items-center gap-1"><Euro size={11} /> Endettement</p>
                  <p className="text-sm font-bold font-mono vision-negative-text">{fmt(selected.payload.synthese.detteTotale)}</p>
                </div>
              )}
              {selected.payload.synthese.cashMensuelNet != null && (
                <div className="vision-surface rounded-xl p-3">
                  <p className="text-xs vision-text-muted">Cash-flow mensuel</p>
                  <p className="text-sm font-bold font-mono" style={{ color: selected.payload.synthese.cashMensuelNet >= 0 ? "#34d399" : "#f87171" }}>
                    {selected.payload.synthese.cashMensuelNet >= 0 ? "+" : ""}{fmt(selected.payload.synthese.cashMensuelNet)}
                  </p>
                </div>
              )}
            </div>

            {selected.payload.synthese.demande && (
              <div className="vision-surface rounded-xl p-4 mb-5 border border-[var(--v-accent)]/25">
                <p className="text-xs vision-text-muted mb-1 flex items-center gap-1"><Shield size={11} /> Demande de financement</p>
                <p className="text-xl font-bold vision-text">{fmt(selected.payload.synthese.demande.montant)}</p>
                {selected.payload.synthese.demande.objet && <p className="text-sm vision-text-muted mt-1">{selected.payload.synthese.demande.objet}</p>}
                <div className="flex flex-wrap gap-4 mt-2 text-xs vision-text-muted">
                  {selected.payload.synthese.demande.ltvProjete != null && <span>LTV projeté : {selected.payload.synthese.demande.ltvProjete} %</span>}
                  {selected.payload.synthese.tauxEndettement != null && <span>Endettement actuel : {selected.payload.synthese.tauxEndettement} %</span>}
                  {selected.payload.synthese.rendementBrut != null && <span>Rendement brut : {selected.payload.synthese.rendementBrut} %</span>}
                </div>
              </div>
            )}

            {selected.payload.synthese.repartitionBanques && (
              <div className="mb-5">
                <p className={`${lbl} mb-2`}>Répartition de l'endettement</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--v-border-subtle)]">
                        {["Banque", "Crédits", "Capital restant", "Mensualités"].map((h) => (
                          <th key={h} className="text-left py-2 px-3 text-xs vision-text-muted font-bold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selected.payload.synthese.repartitionBanques.map((b) => (
                        <tr key={b.banque} className={`border-b border-[var(--v-border-subtle)] ${b.banque === user.bankName ? "vision-nav-active" : ""}`}>
                          <td className="py-2 px-3 vision-text font-medium">{b.banque}</td>
                          <td className="py-2 px-3 font-mono vision-text-muted">{b.nombreCredits}</td>
                          <td className="py-2 px-3 font-mono vision-negative-text">{fmt(b.capitalRestant)}</td>
                          <td className="py-2 px-3 font-mono vision-violet-text">{fmt(b.mensualites)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <p className={`${lbl} mb-2`}>Portefeuille immobilier ({selected.payload.biens.length} biens)</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {selected.payload.biens.map((b, i) => (
                <div key={i} className="flex flex-wrap justify-between gap-2 p-3 rounded-xl vision-surface text-sm">
                  <div>
                    <p className="font-medium vision-text">{b.address}, {b.ville}</p>
                    <p className="text-xs vision-text-muted">{b.type} · Loyer {fmt(b.loyer)}/mois</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono vision-info-text">{fmt(b.valeurActuelle)}</p>
                    {b.credit && <p className="text-xs vision-text-muted">CRD {fmt(b.credit.capitalRestant)} · {b.credit.banque}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {loans.length > 0 && (
        <div className={`${G} p-5`}>
          <p className={`${lbl} mb-4`}>Vos crédits en cours</p>
          <div className="space-y-2">
            {loans.map((l, i) => (
              <div key={i} className="flex justify-between p-3 rounded-xl vision-surface text-sm">
                <span className="vision-text">{l.propertyAddress ?? "—"}</span>
                <div className="text-right">
                  <p className="font-mono vision-negative-text">{fmt(l.capitalRestant)}</p>
                  <p className="text-xs vision-text-muted">{fmt(l.mensualite)}/mois</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
