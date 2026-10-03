/**
 * Parse tous les PDF TAM de private/amortissements/
 * Usage: npx vite-node scripts/parse_all_tams.ts
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { parseTamText } from "../src/lib/tamPdfImport";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(__dirname, "../private/amortissements");

async function extractText(filePath: string): Promise<string> {
  const data = new Uint8Array(fs.readFileSync(filePath));
  const doc = await getDocument({ data, useSystemFonts: true, disableWorker: true }).promise;
  const parts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    parts.push(
      content.items.map((it) => ("str" in it ? String(it.str) : "")).filter(Boolean).join(" "),
    );
  }
  await doc.destroy();
  return parts.join("\n");
}

const files = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".pdf")).sort();
const rows: Array<Record<string, unknown>> = [];

for (const file of files) {
  const full = path.join(dir, file);
  try {
    const text = await extractText(full);
    const r = parseTamText(text);
    const mensTot = Math.round((r.mensualite + r.assuranceMensuelle) * 100) / 100;
    rows.push({
      file,
      ok: true,
      banque: r.banque,
      montant: r.montantInitial,
      taux: r.taux,
      duree: r.duree,
      debut: r.debut,
      fin: r.finCredit,
      ass: r.assuranceMensuelle,
      mens: r.mensualite,
      mensTot,
      encours: r.capitalRestant,
      echeances: r.echeancesLues,
      warnings: r.warnings,
      source: r.sourceLabel,
    });
    console.log(`✓ ${file}`);
    console.log(
      `  ${r.banque || "?"} · ${r.montantInitial} € @ ${r.taux}% · ${r.duree} mois · ${r.debut} → ${r.finCredit}`,
    );
    console.log(
      `  mens ${r.mensualite} + ass ${r.assuranceMensuelle} = ${mensTot} · encours ${r.capitalRestant} · ${r.echeancesLues} éch.`,
    );
    if (r.warnings.length) console.log(`  ⚠ ${r.warnings.join(" | ")}`);
  } catch (e) {
    rows.push({ file, ok: false, error: e instanceof Error ? e.message : String(e) });
    console.log(`✗ ${file}: ${e instanceof Error ? e.message : e}`);
  }
  console.log("");
}

const out = path.resolve(__dirname, "../private/amortissements/_parsed.json");
fs.writeFileSync(out, JSON.stringify(rows, null, 2));
console.log(`→ ${out}`);
