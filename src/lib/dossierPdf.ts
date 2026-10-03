import { jsPDF } from "jspdf";
import autoTable, { type RowInput } from "jspdf-autotable";

/** Helvetica (jsPDF) ne gère pas bien les espaces fins Unicode du format fr-FR. */
function pdfSafe(s: string): string {
  return s
    .replace(/[\u202f\u00a0\u2007\u2009\u200a]/g, " ")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

const fmt = (n: number) =>
  pdfSafe(
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(n),
  );

const fmtPct = (n: number) =>
  pdfSafe(new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(n)) + " %";

const fmtDate = (iso?: string) =>
  pdfSafe(
    (iso ? new Date(iso) : new Date()).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }),
  );

export interface DossierPdfInput {
  title: string;
  targetBank: string;
  message?: string;
  montantDemande?: number;
  objet?: string;
  payload: {
    synthese: Record<string, unknown>;
    entites: Array<{ shortName: string; valeurEstimee: number; dette: number }>;
    biens: Array<{
      address: string;
      ville: string;
      type: string;
      valeurActuelle: number;
      loyer: number;
      cashMensuel: number;
      credit: { banque: string; capitalRestant: number; mensualite: number; taux: number } | null;
    }>;
  };
}

type DocX = jsPDF & { lastAutoTable?: { finalY: number } };

const MARGIN = 16;
const PAGE_W = 210;
const CONTENT_W = PAGE_W - MARGIN * 2;
const NAVY: [number, number, number] = [15, 23, 42];
const BLUE: [number, number, number] = [29, 78, 216];
const SLATE: [number, number, number] = [51, 65, 85];
const MUTED: [number, number, number] = [100, 116, 139];
const LINE: [number, number, number] = [226, 232, 240];
const CARD: [number, number, number] = [248, 250, 252];

function lastY(doc: DocX, fallback: number) {
  return doc.lastAutoTable?.finalY ?? fallback;
}

function ensureSpace(doc: DocX, y: number, need: number): number {
  if (y + need <= 270) return y;
  doc.addPage();
  return 22;
}

function sectionTitle(doc: DocX, text: string, y: number): number {
  y = ensureSpace(doc, y, 14);
  doc.setFillColor(...BLUE);
  doc.roundedRect(MARGIN, y - 4, 1.8, 8, 0.5, 0.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...NAVY);
  doc.text(pdfSafe(text), MARGIN + 6, y + 2);
  return y + 10;
}

function kpiCard(
  doc: DocX,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
  accent?: [number, number, number],
) {
  doc.setFillColor(...CARD);
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.25);
  doc.roundedRect(x, y, w, h, 2, 2, "FD");
  if (accent) {
    doc.setFillColor(...accent);
    doc.rect(x, y, w, 1.2, "F");
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(pdfSafe(label).toUpperCase(), x + 4, y + 7);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text(pdfSafe(value), x + 4, y + 15);
}

function drawFooter(doc: DocX) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, 282, PAGE_W - MARGIN, 282);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text("VISION  ·  Document confidentiel  ·  Généré localement (non stocké)", MARGIN, 287);
    doc.text(`${i} / ${pages}`, PAGE_W - MARGIN, 287, { align: "right" });
  }
}

export function buildDossierPdfBlob(input: DossierPdfInput): Blob {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true }) as DocX;
  const syn = input.payload.synthese;
  const date = fmtDate(typeof syn.dateGeneration === "string" ? syn.dateGeneration : undefined);
  const bank = pdfSafe(input.targetBank || "—");
  const title = pdfSafe(input.title || "Demande de financement immobilier");

  // ── En-tête ──────────────────────────────────────────────────────────────
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PAGE_W, 36, "F");
  doc.setFillColor(...BLUE);
  doc.rect(0, 36, PAGE_W, 1.5, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("VISION", MARGIN, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(191, 219, 254);
  doc.text("DOSSIER DE NEGOCIATION BANCAIRE", MARGIN + 16, 12);

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(title, MARGIN, 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text(`Banque destinataire : ${bank}`, MARGIN, 30);
  doc.text(date, PAGE_W - MARGIN, 30, { align: "right" });

  let y = 48;

  // ── Demande (carte mise en avant) ────────────────────────────────────────
  const ltv =
    syn.demande && typeof syn.demande === "object"
      ? (syn.demande as { ltvProjete?: number | null }).ltvProjete
      : null;

  doc.setFillColor(239, 246, 255);
  doc.setDrawColor(191, 219, 254);
  doc.setLineWidth(0.4);
  doc.roundedRect(MARGIN, y, CONTENT_W, 28, 2.5, 2.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...BLUE);
  doc.text("DEMANDE DE FINANCEMENT", MARGIN + 5, y + 7);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...NAVY);
  doc.text(
    input.montantDemande != null ? fmt(input.montantDemande) : "—",
    MARGIN + 5,
    y + 18,
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...SLATE);
  const rightX = MARGIN + CONTENT_W / 2 + 4;
  doc.text(`Objet : ${pdfSafe(input.objet || "—")}`, rightX, y + 12);
  if (ltv != null) doc.text(`LTV projeté : ${fmtPct(ltv)}`, rightX, y + 19);

  y += 36;

  if (input.message?.trim()) {
    y = ensureSpace(doc, y, 20);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...SLATE);
    const msg = doc.splitTextToSize(`« ${pdfSafe(input.message.trim())} »`, CONTENT_W);
    doc.text(msg, MARGIN, y);
    y += msg.length * 4.5 + 6;
  }

  // ── KPI cards ────────────────────────────────────────────────────────────
  y = sectionTitle(doc, "Synthèse patrimoniale", y);
  const cards: Array<{ label: string; value: string; accent?: [number, number, number] }> = [];
  if (typeof syn.patrimoineBrut === "number")
    cards.push({ label: "Patrimoine brut", value: fmt(syn.patrimoineBrut), accent: BLUE });
  if (typeof syn.patrimoineNet === "number")
    cards.push({ label: "Patrimoine net", value: fmt(syn.patrimoineNet), accent: [16, 185, 129] });
  if (typeof syn.detteTotale === "number")
    cards.push({ label: "Dette totale", value: fmt(syn.detteTotale), accent: [239, 68, 68] });
  if (typeof syn.tauxEndettement === "number")
    cards.push({ label: "Taux d'endettement", value: fmtPct(syn.tauxEndettement) });
  if (typeof syn.mensualitesTotales === "number")
    cards.push({ label: "Mensualités / mois", value: fmt(syn.mensualitesTotales) });
  if (typeof syn.cashMensuelNet === "number")
    cards.push({
      label: "Cash-flow / mois",
      value: fmt(syn.cashMensuelNet),
      accent: syn.cashMensuelNet >= 0 ? [16, 185, 129] : [239, 68, 68],
    });
  if (typeof syn.loyersAnnuels === "number")
    cards.push({ label: "Loyers annuels", value: fmt(syn.loyersAnnuels) });
  if (typeof syn.rendementBrut === "number")
    cards.push({ label: "Rendement brut", value: fmtPct(syn.rendementBrut) });
  if (typeof syn.rendementNet === "number")
    cards.push({ label: "Rendement net", value: fmtPct(syn.rendementNet) });
  cards.push({
    label: "Périmètre",
    value: `${syn.nombreEntites ?? 0} entités · ${syn.nombreBiens ?? 0} biens`,
  });

  const cols = 3;
  const gap = 3.5;
  const cardW = (CONTENT_W - gap * (cols - 1)) / cols;
  const cardH = 20;
  y = ensureSpace(doc, y, cardH + 4);

  cards.forEach((c, i) => {
    const col = i % cols;
    if (col === 0 && i > 0) {
      y += cardH + gap;
      y = ensureSpace(doc, y, cardH + 4);
    }
    const x = MARGIN + col * (cardW + gap);
    kpiCard(doc, x, y, cardW, cardH, c.label, c.value, c.accent);
  });
  y += cardH + 12;

  // ── Entités ──────────────────────────────────────────────────────────────
  if (input.payload.entites.length > 0) {
    y = sectionTitle(doc, "Entités", y);
    autoTable(doc, {
      startY: y,
      head: [["Entité", "Valeur estimée", "Dette", "Net"]],
      body: input.payload.entites.map((e) => [
        pdfSafe(e.shortName),
        fmt(e.valeurEstimee),
        fmt(e.dette),
        fmt(e.valeurEstimee - e.dette),
      ]) as RowInput[],
      theme: "plain",
      styles: {
        font: "helvetica",
        fontSize: 9,
        cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
        textColor: SLATE,
        lineColor: LINE,
        lineWidth: 0.2,
        valign: "middle",
      },
      headStyles: {
        fillColor: NAVY,
        textColor: 255,
        fontStyle: "bold",
        fontSize: 8.5,
      },
      alternateRowStyles: { fillColor: CARD },
      columnStyles: {
        0: { fontStyle: "bold", textColor: NAVY, cellWidth: 48 },
        1: { halign: "right" },
        2: { halign: "right" },
        3: { halign: "right", fontStyle: "bold" },
      },
      margin: { left: MARGIN, right: MARGIN },
    });
    y = lastY(doc, y) + 12;
  }

  // ── Biens (colonnes séparées, lisibles) ──────────────────────────────────
  if (input.payload.biens.length > 0) {
    y = sectionTitle(doc, "Biens immobiliers", y);
    autoTable(doc, {
      startY: y,
      head: [["Adresse", "Type", "Valeur", "Loyer", "Cash", "Banque", "CRD", "Mens."]],
      body: input.payload.biens.map((b) => [
        pdfSafe(`${b.address}\n${b.ville}`),
        pdfSafe(b.type),
        fmt(b.valeurActuelle),
        fmt(b.loyer),
        fmt(b.cashMensuel),
        b.credit ? pdfSafe(b.credit.banque) : "—",
        b.credit ? fmt(b.credit.capitalRestant) : "—",
        b.credit ? fmt(b.credit.mensualite) : "—",
      ]) as RowInput[],
      theme: "plain",
      styles: {
        font: "helvetica",
        fontSize: 7.5,
        cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
        textColor: SLATE,
        lineColor: LINE,
        lineWidth: 0.2,
        valign: "middle",
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: NAVY,
        textColor: 255,
        fontStyle: "bold",
        fontSize: 7.5,
        valign: "middle",
      },
      alternateRowStyles: { fillColor: CARD },
      columnStyles: {
        0: { cellWidth: 38, fontStyle: "bold", textColor: NAVY },
        1: { cellWidth: 18 },
        2: { halign: "right", cellWidth: 22 },
        3: { halign: "right", cellWidth: 18 },
        4: { halign: "right", cellWidth: 18 },
        5: { cellWidth: 28 },
        6: { halign: "right", cellWidth: 22 },
        7: { halign: "right", cellWidth: 18 },
      },
      margin: { left: MARGIN, right: MARGIN },
      didParseCell(data) {
        if (data.section === "body" && data.column.index === 4) {
          const raw = String(data.cell.raw ?? "");
          if (raw.includes("-")) data.cell.styles.textColor = [185, 28, 28];
        }
      },
    });
    y = lastY(doc, y) + 12;
  }

  // ── Banques ──────────────────────────────────────────────────────────────
  const banks = Array.isArray(syn.repartitionBanques)
    ? (syn.repartitionBanques as Array<{
        banque: string;
        nombreCredits: number;
        capitalRestant: number;
        mensualites: number;
      }>)
    : [];
  if (banks.length > 0) {
    y = sectionTitle(doc, "Répartition par banque", y);
    autoTable(doc, {
      startY: y,
      head: [["Banque", "Crédits", "Capital restant dû", "Mensualités"]],
      body: banks.map((b) => [
        pdfSafe(b.banque),
        String(b.nombreCredits),
        fmt(b.capitalRestant),
        fmt(b.mensualites),
      ]) as RowInput[],
      theme: "plain",
      styles: {
        font: "helvetica",
        fontSize: 9,
        cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
        textColor: SLATE,
        lineColor: LINE,
        lineWidth: 0.2,
        valign: "middle",
      },
      headStyles: {
        fillColor: NAVY,
        textColor: 255,
        fontStyle: "bold",
        fontSize: 8.5,
      },
      alternateRowStyles: { fillColor: CARD },
      columnStyles: {
        0: { fontStyle: "bold", textColor: NAVY },
        1: { halign: "center", cellWidth: 24 },
        2: { halign: "right" },
        3: { halign: "right" },
      },
      margin: { left: MARGIN, right: MARGIN },
    });
  }

  drawFooter(doc);
  return doc.output("blob");
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function slugFilename(title: string) {
  const base =
    title
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "dossier-bancaire";
  return `${base}-${new Date().toISOString().slice(0, 10)}.pdf`;
}
