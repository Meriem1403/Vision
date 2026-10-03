import { useCallback, useRef, useState, type DragEvent } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { TamImportResult } from "@/lib/tamPdfImport";

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
  const [dragOver, setDragOver] = useState(false);

  const run = useCallback(async (file: File | undefined) => {
    if (!file || busy) return;
    setBusy(true);
    setDragOver(false);
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
  }, [busy, existingBanks, onImported]);

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!busy) setDragOver(true);
  };

  const onDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    void run(file);
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
        onDragOver={onDragOver}
        onDragEnter={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`w-full rounded-xl border border-dashed px-4 py-4 text-left transition-all disabled:opacity-50 ${
          dragOver
            ? "border-[var(--v-accent)] bg-[color-mix(in_srgb,var(--v-accent)_12%,transparent)]"
            : "border-[var(--v-border-subtle)] vision-surface hover:border-[color-mix(in_srgb,var(--v-accent)_45%,transparent)]"
        }`}
        title="Glisser un PDF ou cliquer pour choisir — le fichier n’est pas enregistré"
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg vision-glass">
            {busy ? <Loader2 size={16} className="animate-spin vision-text-muted" /> : <FileUp size={16} className="vision-text-muted" />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold vision-text">
              {busy ? "Lecture du PDF…" : dragOver ? "Déposez le PDF ici" : "Importer un TAM (PDF)"}
            </p>
            <p className="text-xs vision-text-muted mt-1 leading-relaxed">
              Glissez-déposez ou cliquez pour choisir. Extraction locale uniquement —
              le PDF n’est jamais stocké.
            </p>
          </div>
        </div>
      </button>
    </div>
  );
}
