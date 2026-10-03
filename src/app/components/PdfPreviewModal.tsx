import { useEffect } from "react";
import { Download, X } from "lucide-react";
import { btnG, btnP } from "./layout";

export function PdfPreviewModal({
  url,
  title = "Aperçu PDF",
  onClose,
  onDownload,
}: {
  url: string;
  title?: string;
  onClose: () => void;
  onDownload: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[220] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "var(--v-overlay, rgba(0,0,0,0.65))" }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-4xl h-[92dvh] sm:h-[85vh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-[var(--v-glass-border)] overflow-hidden"
        style={{ background: "linear-gradient(160deg, var(--v-drawer-from), var(--v-drawer-to))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--v-border-subtle)] shrink-0">
          <p className="text-sm font-bold vision-text truncate">{title}</p>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={onDownload} className={btnP}>
              <Download size={14} /> Télécharger
            </button>
            <button type="button" onClick={onClose} className={btnG} aria-label="Fermer">
              <X size={14} />
            </button>
          </div>
        </div>
        <iframe
          title={title}
          src={url}
          className="flex-1 w-full min-h-0 bg-white"
        />
      </div>
    </div>
  );
}
