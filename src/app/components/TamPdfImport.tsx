import { useRef, useState } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { TamImportResult } from "@/lib/tamPdfImport";
import { btnG } from "@/app/components/layout";

export function TamPdfImportButton({
  existingBanks = [],
  onImported,
  className = "",
}: {
  existingBanks?: string[];
  onImported: (result: TamImportResult) => void;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const run = async (file: File | undefined) => {
    if (!file || busy) return;
    setBusy(true);
    try {
      const { importTamPdf } = await import("@/lib/tamPdfImport");
      const result = await importTamPdf(file, existingBanks);
      onImported(result);
      toast.success(`TAM importé · ${result.echeancesLues} échéances lues (PDF non stocké)`);
      for (const w of result.warnings) toast.message(w);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import PDF impossible.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => void run(e.target.files?.[0])}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className={`${btnG} w-full sm:w-auto justify-center disabled:opacity-50`}
        title="Extraire montant, taux, dates et assurance — le PDF n’est pas enregistré"
      >
        {busy ? <Loader2 size={14} className="animate-spin shrink-0" /> : <FileUp size={14} className="shrink-0" />}
        <span className="whitespace-nowrap">{busy ? "Lecture du PDF…" : "Importer un TAM (PDF)"}</span>
      </button>
      <p className="text-xs vision-text-muted mt-2 leading-relaxed">
        Déposez le tableau d’amortissement banque. On extrait uniquement les champs utiles pour recalculer
        le crédit — <span className="vision-text-muted font-medium">le PDF n’est jamais stocké</span>.
      </p>
    </div>
  );
}
