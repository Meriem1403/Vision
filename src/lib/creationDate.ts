const FR_MONTHS: Record<string, string> = {
  janv: "01", janvier: "01", fevr: "02", "févr": "02", fevrier: "02", "février": "02",
  mars: "03", avr: "04", avril: "04", mai: "05", juin: "06", juil: "07", juillet: "07",
  aout: "08", "août": "08", sept: "09", septembre: "09", oct: "10", octobre: "10",
  nov: "11", novembre: "11", dec: "12", "déc": "12", decembre: "12", "décembre": "12",
};

/** Normalise une date de création SCI vers YYYY-MM-DD pour l’input calendrier. */
export function creationToInputValue(creation: string): string {
  if (!creation?.trim()) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(creation)) return creation.slice(0, 10);
  if (/^\d{4}-\d{2}$/.test(creation)) return `${creation}-01`;
  const m = creation.trim().match(/^([A-Za-zÀ-ÿ.]+)\s+(\d{4})$/);
  if (!m) return "";
  const key = m[1].toLowerCase().replace(/\./g, "");
  const mm = FR_MONTHS[key];
  return mm ? `${m[2]}-${mm}-01` : "";
}

export function formatCreationDisplay(creation: string): string {
  if (!creation?.trim()) return "—";
  if (/^\d{4}-\d{2}-\d{2}/.test(creation)) {
    return new Date(`${creation.slice(0, 10)}T12:00:00`).toLocaleDateString("fr-FR", {
      day: "numeric", month: "short", year: "numeric",
    });
  }
  return creation;
}
