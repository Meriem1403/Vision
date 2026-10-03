import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import {
  Send, Eye, Trash2, FileText, Check, Banknote, Tag, MessageSquare, Download, Save,
} from "lucide-react";
import { api } from "@/lib/api";
import type { AuthUser } from "@/lib/auth";
import { getStoredToken } from "@/lib/auth";
import { listBankOptions, resolveBankName } from "@/lib/banks";
import { buildDossierPdfBlob, downloadBlob, slugFilename } from "@/lib/dossierPdf";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { createDossier, deleteDossier, fetchDossier, fetchDossiers, sendDossier } from "@/lib/supabaseRepo";
import { BanqueField } from "./BanqueField";
import { IconNumberField, IconTextArea, IconTextField } from "./IconField";
import { PdfPreviewModal } from "./PdfPreviewModal";
import { pageWrap, G, lbl, btnP, btnG, btnD } from "./layout";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Brouillon",
  SENT: "Partagé banque",
  VIEWED: "Consulté",
  EXPIRED: "Expiré",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

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
  const existingBanks = useMemo(
    () => properties.map((p) => p.credit?.banque).filter((b): b is string => Boolean(b)),
    [properties],
  );
  const bankOptions = useMemo(() => listBankOptions(existingBanks), [existingBanks]);
  const [title, setTitle] = useState("Demande de financement immobilier");
  const [targetBank, setTargetBank] = useState(() => listBankOptions(
    properties.map((p) => p.credit?.banque).filter((b): b is string => Boolean(b)),
  )[0] ?? "");
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
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState("dossier-bancaire.pdf");
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

  useEffect(() => {
    setSelectedEntities(entityOptions.map((e) => e.id));
  }, [entityOptions]);

  useEffect(() => {
    if (!targetBank && bankOptions[0]) setTargetBank(bankOptions[0]);
  }, [bankOptions, targetBank]);

  const loadDossiers = async () => {
    try {
      if (useSb) setDossiers(await fetchDossiers());
      else setDossiers(await api.getDossiers());
    } catch {
      setDossiers([]);
    }
  };

  useEffect(() => { loadDossiers(); }, [useSb]);

  useEffect(() => () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
  }, [pdfUrl]);

  const opts = useMemo(() => ({
    includePatrimoine, includeEndettement, includeCashFlow, montantDemande: montant, objet,
  }), [includePatrimoine, includeEndettement, includeCashFlow, montant, objet]);

  const handlePreview = () => {
    setPreview(buildPayload(properties, scis, selectedEntities, opts));
  };

  const openPdfPreview = (payload: ReturnType<typeof buildPayload>, meta?: { title?: string; targetBank?: string; message?: string; montant?: number; objet?: string }) => {
    const blob = buildDossierPdfBlob({
      title: meta?.title ?? title,
      targetBank: meta?.targetBank ?? targetBank,
      message: meta?.message ?? message,
      montantDemande: meta?.montant ?? montant,
      objet: meta?.objet ?? objet,
      payload,
    });
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    const url = URL.createObjectURL(blob);
    setPdfBlob(blob);
    setPdfUrl(url);
    setPdfName(slugFilename(meta?.title ?? title));
  };

  const handlePdfPreview = () => {
    const payload = buildPayload(properties, scis, selectedEntities, opts);
    setPreview(payload);
    openPdfPreview(payload);
  };

  const closePdf = () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);
    setPdfBlob(null);
  };

  const downloadPdf = () => {
    if (!pdfBlob) return;
    downloadBlob(pdfBlob, pdfName);
  };

  const ensureAuthReady = async (): Promise<"supabase" | "api"> => {
    if (useSb && supabase) {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        throw new Error("Session expirée. Reconnectez-vous pour enregistrer un dossier.");
      }
      return "supabase";
    }
    if (!getStoredToken()) {
      throw new Error("Authentification requise. Reconnectez-vous (mode API) pour enregistrer un dossier.");
    }
    return "api";
  };

  const handleCreate = async (sendNow: boolean) => {
    const bank = resolveBankName(targetBank, existingBanks).trim();
    if (!title.trim()) {
      toast.error("Indiquez un titre de dossier.");
      return;
    }
    if (!bank) {
      toast.error("Choisissez une banque destinataire.");
      return;
    }
    if (selectedEntities.length === 0) {
      toast.error("Sélectionnez au moins une entité à inclure.");
      return;
    }

    setLoading(true);
    try {
      const mode = await ensureAuthReady();
      const payload = buildPayload(properties, scis, selectedEntities, opts);
      if (mode === "supabase") {
        await createDossier({
          title: title.trim(),
          targetBank: bank,
          message,
          montantDemande: montant > 0 ? montant : undefined,
          objet,
          entitySlugs: selectedEntities,
          includePatrimoine,
          includeEndettement,
          includeCashFlow,
          anonymizeTenants,
          payload,
          sendNow,
          createdBy: user.id,
        });
      } else {
        await api.createDossier({
          title: title.trim(),
          targetBank: bank,
          message,
          montantDemande: montant > 0 ? montant : undefined,
          objet,
          entitySlugs: selectedEntities,
          includePatrimoine,
          includeEndettement,
          includeCashFlow,
          anonymizeTenants,
          sendNow,
        });
      }
      setTargetBank(bank);
      setPreview(payload);
      await loadDossiers();
      toast.success(
        sendNow
          ? `Dossier partagé avec ${bank}. Visible dans le portail banque.`
          : "Brouillon enregistré. Vous pourrez le partager plus tard.",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Enregistrement du dossier impossible.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendExisting = async (id: string) => {
    try {
      if (useSb) await sendDossier(id);
      else await api.sendDossier(id);
      await loadDossiers();
      toast.success("Dossier partagé avec la banque.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Envoi impossible.");
    }
  };

  const handleDeleteExisting = async (id: string) => {
    try {
      if (useSb) await deleteDossier(id);
      else await api.deleteDossier(id);
      if (selectedDossier && String(selectedDossier.id) === id) setSelectedDossier(null);
      await loadDossiers();
      toast.success("Dossier supprimé.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Suppression impossible.");
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
              Compilez le patrimoine pour une banque. Le PDF se télécharge localement ; brouillon / partage sont enregistrés dans Vision.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <IconTextField
              label="Titre du dossier"
              icon={<FileText size={16} strokeWidth={2} />}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <BanqueField
              label="Banque destinataire"
              value={targetBank}
              onChange={setTargetBank}
              existingBanks={existingBanks}
            />
            <div className="grid grid-cols-2 gap-3">
              <IconNumberField
                label="Montant demandé (€)"
                value={montant || ""}
                step={1000}
                min={0}
                onChange={(e) => setMontant(+e.target.value)}
              />
              <IconTextField
                label="Objet"
                icon={<Tag size={16} strokeWidth={2} />}
                value={objet}
                onChange={(e) => setObjet(e.target.value)}
              />
            </div>
            <IconTextArea
              label="Message"
              icon={<MessageSquare size={16} strokeWidth={2} />}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
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
            <div className="space-y-2 pt-2">
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={handlePreview} className={btnG}><Eye size={14} /> Aperçu chiffres</button>
                <button type="button" onClick={handlePdfPreview} className={btnG}><FileText size={14} /> Aperçu PDF</button>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleCreate(false)}
                  disabled={loading}
                  className={btnG}
                  title="Enregistre le dossier pour vous uniquement (non visible par la banque)"
                >
                  <Save size={14} /> {loading ? "…" : "Enregistrer brouillon"}
                </button>
                <button
                  type="button"
                  onClick={() => handleCreate(true)}
                  disabled={loading}
                  className={btnP}
                  title="Rend le dossier visible pour le compte banque correspondant"
                >
                  <Send size={14} /> {loading ? "…" : "Partager avec la banque"}
                </button>
              </div>
              <p className="text-xs vision-text-muted leading-relaxed">
                <strong className="vision-text">Brouillon</strong> : sauvegarde privée, modifiable plus tard.
                {" "}
                <strong className="vision-text">Partager</strong> : le compte banque ({targetBank || "…"}) peut le consulter dans son espace — ce n’est pas un e-mail.
              </p>
            </div>
          </div>
        </div>
      </div>

      {preview && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`${G} p-5`}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <p className={`${lbl} mb-0`}>Aperçu</p>
            <button type="button" onClick={handlePdfPreview} className={btnP}>
              <Download size={14} /> Voir / télécharger PDF
            </button>
          </div>
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
                  <span className="text-xs font-bold" style={{ color: statusColor(status) }}>
                    {STATUS_LABEL[status] ?? status}
                  </span>
                  <button type="button" onClick={() => viewDossier(id)} className={btnG} title="Voir"><Eye size={12} /></button>
                  {status === "DRAFT" && (
                    <button type="button" onClick={() => handleSendExisting(id)} className={btnP} title="Partager avec la banque">
                      <Send size={12} />
                    </button>
                  )}
                  <button type="button" onClick={() => handleDeleteExisting(id)} className={btnD} title="Supprimer"><Trash2 size={12} /></button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedDossier && (
        <div className={`${G} p-5`}>
          <div className="flex flex-wrap justify-between gap-2 mb-4">
            <p className="font-bold vision-text">{String(selectedDossier.title)}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={btnP}
                onClick={() => {
                  const payload = selectedDossier.payload as ReturnType<typeof buildPayload>;
                  if (!payload?.synthese) return;
                  openPdfPreview(payload, {
                    title: String(selectedDossier.title ?? title),
                    targetBank: String(selectedDossier.target_bank ?? selectedDossier.targetBank ?? targetBank),
                    message: String(selectedDossier.message ?? ""),
                    montant: Number(selectedDossier.montant_demande ?? selectedDossier.montantDemande ?? montant),
                    objet: String(selectedDossier.objet ?? objet),
                  });
                }}
              >
                <FileText size={14} /> PDF
              </button>
              <button type="button" onClick={() => setSelectedDossier(null)} className={btnG}>Fermer</button>
            </div>
          </div>
          <pre className="text-xs vision-text-muted overflow-auto max-h-96 vision-surface rounded-xl p-4">
            {JSON.stringify(selectedDossier.payload, null, 2)}
          </pre>
        </div>
      )}

      {pdfUrl && (
        <PdfPreviewModal
          url={pdfUrl}
          title="Aperçu de la demande PDF"
          onClose={closePdf}
          onDownload={downloadPdf}
        />
      )}
    </div>
  );
}
