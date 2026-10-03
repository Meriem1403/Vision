/**
 * Import d’un tableau d’amortissement bancaire (PDF TAM).
 * Extraction 100 % navigateur — le PDF n’est jamais envoyé ni stocké.
 */

import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  addMonths,
  computeMonthlyPaymentExact,
  finFromDebutDuree,
  getCrdAtDate,
  round2,
  toISODate,
} from "@/lib/loanCalculator";
import { resolveBankName } from "@/lib/banks";

GlobalWorkerOptions.workerSrc = pdfWorker;

export interface TamScheduleRow {
  date: Date;
  capitalDu: number;
  capitalAmorti: number;
  interets: number;
  assurance: number;
  echeance: number;
}

export interface TamImportResult {
  banque: string;
  montantInitial: number;
  taux: number;
  duree: number;
  debut: string;
  finCredit: string;
  assuranceMensuelle: number;
  mensualite: number;
  capitalRestant: number;
  /** Nombre d’échéances lues dans le PDF (souvent le reste à courir). */
  echeancesLues: number;
  warnings: string[];
  sourceLabel: string;
}

function parseFrNumber(raw: string): number | null {
  const cleaned = raw
    .replace(/\u00a0/g, " ")
    .replace(/[^\d,.\s-]/g, "")
    .trim();
  if (!cleaned) return null;
  // 68 000,00 ou 68000,00 ou 25 242.46
  const normalized = cleaned.replace(/\s/g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function parseFrDate(raw: string): Date | null {
  const m = raw.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const y = Number(m[3]);
  const dt = new Date(y, mo, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function detectBanque(text: string, existingBanks: string[] = []): string {
  const upper = text.toUpperCase();
  const rules: Array<{ re: RegExp; name: string }> = [
    { re: /CREDIT\s*MUTUEL|Caisse de Crédit Mutuel/i, name: "Crédit Mutuel" },
    { re: /CREDIT\s*AGRICOLE|CRÉDIT\s*AGRICOLE/i, name: "Crédit Agricole" },
    { re: /BNP\s*PARIBAS|\bBNP\b/i, name: "BNP Paribas" },
    { re: /\bLCL\b|CREDIT\s*LYONNAIS/i, name: "LCL" },
    { re: /\bCIC\b/i, name: "CIC" },
    { re: /SOCIETE\s*GENERALE|SOCIÉTÉ\s*GÉNÉRALE/i, name: "Société Générale" },
    { re: /BANQUE\s*POPULAIRE/i, name: "Banque Populaire" },
    { re: /\bBRED\b/i, name: "BRED" },
    { re: /CAISSE\s*D['’]EPARGNE|CAISSE\s*D['’]ÉPARGNE/i, name: "Caisse d'Épargne" },
    { re: /BANQUE\s*POSTALE/i, name: "La Banque Postale" },
  ];
  for (const r of rules) {
    if (r.re.test(upper) || r.re.test(text)) return resolveBankName(r.name, existingBanks);
  }
  return "";
}

function extractLabeledAmount(text: string, patterns: RegExp[]): number | null {
  for (const re of patterns) {
    const m = text.match(re);
    if (!m?.[1]) continue;
    const n = parseFrNumber(m[1]);
    if (n != null) return n;
  }
  return null;
}

function extractScheduleRows(text: string): TamScheduleRow[] {
  const rows: TamScheduleRow[] = [];
  // date + 5 montants (capital dû, capital amorti, intérêts, assurance, échéance)
  const re =
    /(\d{2}[/.-]\d{2}[/.-]\d{4})\s+([\d\s]+[.,]\d{2})\s+([\d\s]+[.,]\d{2})\s+([\d\s]+[.,]\d{2})\s+([\d\s]+[.,]\d{2})\s+([\d\s]+[.,]\d{2})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const date = parseFrDate(m[1]!);
    const capitalDu = parseFrNumber(m[2]!);
    const capitalAmorti = parseFrNumber(m[3]!);
    const interets = parseFrNumber(m[4]!);
    const assurance = parseFrNumber(m[5]!);
    const echeance = parseFrNumber(m[6]!);
    if (!date || capitalDu == null || capitalAmorti == null || interets == null || assurance == null || echeance == null) {
      continue;
    }
    // Ignorer la ligne "Total prévisionnel" (pas de date valide déjà filtrée)
    rows.push({ date, capitalDu, capitalAmorti, interets, assurance, echeance });
  }
  // Dédupliquer par date
  const byKey = new Map<string, TamScheduleRow>();
  for (const r of rows) byKey.set(toISODate(r.date), r);
  return [...byKey.values()].sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** Durée totale qui reproduit au mieux la mensualité hors assurance. */
export function inferDureeFromMensualite(capital: number, taux: number, mensTarget: number): number {
  if (capital <= 0 || mensTarget <= 0) return 0;
  if (taux <= 0) return Math.max(1, Math.round(capital / mensTarget));
  let best = { n: 0, d: Infinity };
  for (let n = 12; n <= 480; n++) {
    const m = round2(computeMonthlyPaymentExact(capital, taux, n));
    const d = Math.abs(m - mensTarget);
    if (d < best.d) best = { n, d };
    if (d < 0.005) return n;
  }
  return best.n;
}

/** Cherche une date de début telle que le CRD calculé ≈ encours banque. */
function inferDebut(opts: {
  montantInitial: number;
  taux: number;
  duree: number;
  encours: number;
  firstEcheance: Date;
  remaining: number;
}): { debut: string; crd: number; err: number } {
  const firstMonth = new Date(opts.firstEcheance.getFullYear(), opts.firstEcheance.getMonth(), 1);
  const baseElapsed = Math.max(0, opts.duree - opts.remaining);
  let best = { debut: toISODate(addMonths(firstMonth, -baseElapsed)), crd: 0, err: Infinity };

  // Fenêtre large : remboursements anticipés / décalages de date d’échéance
  for (let delta = -36; delta <= 36; delta++) {
    const debutDate = addMonths(firstMonth, -(baseElapsed + delta));
    const debut = toISODate(debutDate);
    const crd = getCrdAtDate(
      {
        montantInitial: opts.montantInitial,
        tauxAnnuel: opts.taux,
        dureeMois: opts.duree,
        dateDebut: debut,
      },
      firstMonth,
    );
    const err = Math.abs(crd - opts.encours);
    if (err < best.err) best = { debut, crd, err };
    if (err < 0.02) break;
  }
  return best;
}

/**
 * Prêt remanié / restructuré : la mensualité ne correspond plus au capital initial.
 * On ancre alors le calcul sur l’encours + le reste à courir (cohérent avec le TAM à venir).
 */
function inferRemainingLoan(opts: {
  encours: number;
  taux: number;
  mensualite: number;
  firstEcheance: Date;
  scheduleLen: number;
}): { montantInitial: number; duree: number; debut: string; mensErr: number } {
  const firstMonth = new Date(opts.firstEcheance.getFullYear(), opts.firstEcheance.getMonth(), 1);
  const fromMens = inferDureeFromMensualite(opts.encours, opts.taux, opts.mensualite);
  // Préférer la durée du PDF si elle reproduit la mensualité aussi bien
  const candidates = [opts.scheduleLen, fromMens].filter((n) => n > 0);
  let best = { n: fromMens || opts.scheduleLen, d: Infinity };
  for (const n of candidates) {
    const m = round2(computeMonthlyPaymentExact(opts.encours, opts.taux, n));
    const d = Math.abs(m - opts.mensualite);
    if (d < best.d) best = { n, d };
  }
  // Affiner autour du meilleur candidat
  for (let n = Math.max(1, best.n - 6); n <= best.n + 6; n++) {
    const m = round2(computeMonthlyPaymentExact(opts.encours, opts.taux, n));
    const d = Math.abs(m - opts.mensualite);
    if (d < best.d) best = { n, d };
  }
  return {
    montantInitial: round2(opts.encours),
    duree: best.n,
    debut: toISODate(firstMonth),
    mensErr: best.d,
  };
}

export async function extractPdfText(file: File | ArrayBuffer): Promise<string> {
  const data = file instanceof File ? new Uint8Array(await file.arrayBuffer()) : new Uint8Array(file);
  const doc = await getDocument({ data, useSystemFonts: true }).promise;
  const parts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((it) => ("str" in it ? String(it.str) : ""))
      .filter(Boolean)
      .join(" ");
    parts.push(pageText);
  }
  await doc.destroy();
  return parts.join("\n");
}

export function parseTamText(text: string, existingBanks: string[] = []): TamImportResult {
  const warnings: string[] = [];
  const compact = text.replace(/\s+/g, " ");

  const montantInitial = extractLabeledAmount(compact, [
    /Cr[ée]dit accord[ée]\s*:\s*([\d\s]+[.,]\d{2})\s*EUR/i,
    /Capital emprunt[ée]\s*:\s*([\d\s]+[.,]\d{2})/i,
    /Montant (?:du )?pr[êe]t\s*:\s*([\d\s]+[.,]\d{2})/i,
    /Capital initial\s*:\s*([\d\s]+[.,]\d{2})/i,
  ]);

  const encours = extractLabeledAmount(compact, [
    /Encours[^:]*:\s*([\d\s]+[.,]\d{2})\s*EUR/i,
    /Capital restant[^:]*:\s*([\d\s]+[.,]\d{2})/i,
    /CRD[^:]*:\s*([\d\s]+[.,]\d{2})/i,
  ]);

  const taux = extractLabeledAmount(compact, [
    /Taux fixe[^:]*:\s*([\d\s]+[.,]\d+)\s*%/i,
    /Taux[^:]*:\s*([\d\s]+[.,]\d+)\s*%/i,
    /TAEG[^:]*:\s*([\d\s]+[.,]\d+)\s*%/i,
  ]);

  const schedule = extractScheduleRows(text);
  if (schedule.length === 0) {
    throw new Error("Aucune échéance trouvée dans le PDF. Vérifiez qu’il s’agit d’un tableau d’amortissement.");
  }

  const first = schedule[0]!;
  const last = schedule[schedule.length - 1]!;
  const assuranceMensuelle = round2(
    schedule.slice(0, Math.min(6, schedule.length)).reduce((s, r) => s + r.assurance, 0) /
      Math.min(6, schedule.length),
  );
  const echeanceTotale = round2(
    schedule.slice(0, Math.min(6, schedule.length)).reduce((s, r) => s + r.echeance, 0) /
      Math.min(6, schedule.length),
  );
  const mensualite = round2(Math.max(0, echeanceTotale - assuranceMensuelle));

  if (montantInitial == null || montantInitial <= 0) {
    throw new Error("Montant du crédit introuvable dans le PDF (ex. « Crédit accordé »).");
  }
  if (taux == null || taux < 0) {
    throw new Error("Taux introuvable dans le PDF.");
  }

  const encoursRef = encours ?? first.capitalDu;
  let duree = inferDureeFromMensualite(montantInitial, taux, mensualite);
  if (!duree) throw new Error("Impossible d’inférer la durée à partir de la mensualité.");

  const remaining = schedule.length;
  const mensFromCapital = round2(computeMonthlyPaymentExact(montantInitial, taux, duree));
  const mensMismatch = Math.abs(mensFromCapital - mensualite);

  let debut = "";
  let montantOut = round2(montantInitial);
  let remodeled = false;

  // Si la mensualité ne peut pas provenir du capital initial (prêt remanié),
  // ou si le CRD ne colle pas → ancrage sur encours + reste à courir.
  if (mensMismatch > 1) {
    remodeled = true;
  } else {
    const inferred = inferDebut({
      montantInitial,
      taux,
      duree,
      encours: encoursRef,
      firstEcheance: first.date,
      remaining: Math.min(remaining, duree),
    });
    debut = inferred.debut;
    if (inferred.err > 500) {
      // Gros écart → prêt remanié / capital initial non exploitable
      remodeled = true;
      warnings.push(
        `Écart CRD ${round2(inferred.err).toLocaleString("fr-FR")} € — bascule sur encours / reste à courir.`,
      );
    } else if (inferred.err > 1) {
      warnings.push(
        `Écart CRD ${round2(inferred.err).toLocaleString("fr-FR")} € entre le PDF et le calcul (toléré).`,
      );
    }
  }

  if (remodeled) {
    const rem = inferRemainingLoan({
      encours: encoursRef,
      taux,
      mensualite,
      firstEcheance: first.date,
      scheduleLen: remaining,
    });
    warnings.push(
      `Prêt remanié : crédit accordé ${round2(montantInitial).toLocaleString("fr-FR")} € — paramètres ancrés sur l’encours (${round2(encoursRef).toLocaleString("fr-FR")} €) et ${rem.duree} mois restants.`,
    );
    montantOut = rem.montantInitial;
    duree = rem.duree;
    debut = rem.debut;
  }

  if (remaining > duree && !remodeled) {
    warnings.push("Le PDF semble contenir plus d’échéances que la durée inférée — vérifiez les champs.");
  }

  const banque = detectBanque(text, existingBanks);
  if (!banque) warnings.push("Banque non détectée — à renseigner manuellement.");

  // Fin = début + durée (pas la dernière ligne du PDF partiel, sinon durée/mensualité faussées)
  const finCredit = finFromDebutDuree(debut, duree) ?? toISODate(new Date(last.date.getFullYear(), last.date.getMonth(), 1));

  const lastPdfMonth = toISODate(new Date(last.date.getFullYear(), last.date.getMonth(), 1));
  if (finCredit.slice(0, 7) !== lastPdfMonth.slice(0, 7)) {
    warnings.push(
      `Dernière échéance du PDF ${last.date.toLocaleDateString("fr-FR")} · fin calculée ${new Date(finCredit).toLocaleDateString("fr-FR")} (cohérente avec la mensualité banque).`,
    );
  }

  // Source label court
  let sourceLabel = "TAM banque";
  if (/GECTAM|MODULIMMO|CREDIT MUTUEL/i.test(text)) sourceLabel = "TAM Crédit Mutuel";

  return {
    banque,
    montantInitial: montantOut,
    taux: round2(taux * 100) / 100,
    duree,
    debut,
    finCredit,
    assuranceMensuelle,
    mensualite,
    capitalRestant: round2(encoursRef),
    echeancesLues: schedule.length,
    warnings,
    sourceLabel,
  };
}

/** Lit un PDF TAM et renvoie les champs crédit à appliquer au formulaire. */
export async function importTamPdf(
  file: File,
  existingBanks: string[] = [],
): Promise<TamImportResult> {
  if (!file.type.includes("pdf") && !file.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("Fichier invalide : choisissez un PDF.");
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error("PDF trop volumineux (max 12 Mo).");
  }
  const text = await extractPdfText(file);
  if (!text.trim()) {
    throw new Error("PDF sans texte extractible (scan image). Fournissez un TAM texte / natif.");
  }
  return parseTamText(text, existingBanks);
}
