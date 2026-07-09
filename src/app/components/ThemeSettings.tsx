import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Palette, RotateCcw, X, ChevronDown, ChevronUp } from "lucide-react";
import {
  THEME_PRESETS,
  type CustomThemeColors,
  DEFAULT_CUSTOM,
  customToVars,
  applyVisionTheme,
  saveCustomColors,
} from "@/lib/visionTheme";

const G = "vision-glass backdrop-blur-xl border rounded-2xl";
const lbl = "block text-xs sm:text-sm font-bold vision-text-muted uppercase tracking-widest mb-2";

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block min-w-0">
      <span className={lbl}>{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 min-h-[44px] rounded-lg border border-[var(--v-glass-border)] cursor-pointer bg-transparent flex-shrink-0"
          aria-label={label}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-w-0 min-h-[44px] vision-input border rounded-xl px-3 text-xs font-mono"
        />
      </div>
    </label>
  );
}

export function ThemeSettings({
  themeId,
  customColors,
  onThemeChange,
  onCustomChange,
}: {
  themeId: string;
  customColors: CustomThemeColors;
  onThemeChange: (id: string) => void;
  onCustomChange: (c: CustomThemeColors) => void;
}) {
  const [open, setOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(themeId === "custom");

  const selectPreset = (id: string) => {
    onThemeChange(id);
    setCustomOpen(id === "custom");
  };

  const updateCustom = (patch: Partial<CustomThemeColors>) => {
    const next = { ...customColors, ...patch };
    onCustomChange(next);
    saveCustomColors(next);
    applyVisionTheme("custom", customToVars(next), { isLight: next.isLight });
    onThemeChange("custom");
  };

  const resetCustom = () => {
    onCustomChange(DEFAULT_CUSTOM);
    saveCustomColors(DEFAULT_CUSTOM);
    if (themeId === "custom") applyVisionTheme("custom", customToVars(DEFAULT_CUSTOM), { isLight: DEFAULT_CUSTOM.isLight });
  };

  return (
    <div className="px-3 pb-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2.5 min-h-[44px] rounded-xl vision-glass hover:opacity-90 transition-opacity vision-text-muted text-xs font-semibold"
      >
        <Palette size={14} style={{ color: "var(--v-accent)" }} />
        <span className="flex-1 text-left">Thèmes & couleurs</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className={`${G} mt-2 p-3 space-y-3`}>
              <p className={lbl}>Thèmes prédéfinis</p>
              <div className="grid grid-cols-2 gap-2">
                {THEME_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => selectPreset(preset.id)}
                    className={`rounded-xl p-2 min-h-[52px] border text-left transition-all ${themeId === preset.id ? "ring-2 ring-[var(--v-accent)] border-[var(--v-accent)]" : "border-[var(--v-glass-border)] hover:border-[var(--v-accent)]"}`}
                    title={preset.name}
                  >
                    <div className="flex gap-1 mb-1.5">
                      {preset.swatch.map((c, i) => (
                        <span key={i} className="h-3 flex-1 rounded-sm" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    <span className="text-xs font-semibold vision-text">{preset.name}</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => selectPreset("custom")}
                  className={`rounded-xl p-2 min-h-[52px] border text-left col-span-2 transition-all ${themeId === "custom" ? "ring-2 ring-[var(--v-accent)]" : "border-[var(--v-glass-border)]"}`}
                >
                  <div className="flex gap-1 mb-1.5">
                    {[customColors.bg1, customColors.accent, customColors.accent2].map((c, i) => (
                      <span key={i} className="h-3 flex-1 rounded-sm border border-[var(--v-glass-border)]" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <span className="text-xs font-semibold vision-text">Personnalisé</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setCustomOpen((o) => !o)}
                className="w-full text-left text-xs font-semibold vision-text-muted flex items-center justify-between py-1"
              >
                Personnaliser les couleurs
                {customOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              <AnimatePresence>
                {customOpen && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3 pt-1 border-t border-[var(--v-glass-border)]">
                    <label className="flex items-center gap-2 min-h-[44px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={customColors.isLight}
                        onChange={(e) => updateCustom({ isLight: e.target.checked })}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-xs vision-text-muted">Thème clair</span>
                    </label>
                    <div className="grid grid-cols-1 gap-3">
                      <ColorField label="Fond 1" value={customColors.bg1} onChange={(bg1) => updateCustom({ bg1 })} />
                      <ColorField label="Fond 2" value={customColors.bg2} onChange={(bg2) => updateCustom({ bg2 })} />
                      <ColorField label="Fond 3" value={customColors.bg3} onChange={(bg3) => updateCustom({ bg3 })} />
                      <ColorField label="Couleur d'accent" value={customColors.accent} onChange={(accent) => updateCustom({ accent })} />
                      <ColorField label="Accent secondaire" value={customColors.accent2} onChange={(accent2) => updateCustom({ accent2 })} />
                      <ColorField label="Positif (gains)" value={customColors.positive} onChange={(positive) => updateCustom({ positive })} />
                      <ColorField label="Négatif (pertes)" value={customColors.negative} onChange={(negative) => updateCustom({ negative })} />
                    </div>
                    <button
                      type="button"
                      onClick={resetCustom}
                      className="w-full flex items-center justify-center gap-2 min-h-[44px] rounded-xl border border-[var(--v-glass-border)] vision-text-muted text-xs font-medium hover:opacity-80"
                    >
                      <RotateCcw size={16} />
                      Réinitialiser le personnalisé
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ThemeSettingsModal({
  open,
  onClose,
  themeId,
  customColors,
  onThemeChange,
  onCustomChange,
}: {
  open: boolean;
  onClose: () => void;
  themeId: string;
  customColors: CustomThemeColors;
  onThemeChange: (id: string) => void;
  onCustomChange: (c: CustomThemeColors) => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: "var(--v-overlay)" }} onClick={onClose}>
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        className="w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-[var(--v-glass-border)] p-4 sm:p-5"
        style={{ background: "linear-gradient(160deg, var(--v-drawer-from), var(--v-drawer-to))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="text-base font-bold vision-text flex items-center gap-2"><Palette size={18} style={{ color: "var(--v-accent)" }} /> Apparence</p>
          <button type="button" onClick={onClose} className="w-9 h-9 rounded-xl vision-glass flex items-center justify-center vision-text-muted" aria-label="Fermer"><X size={16} /></button>
        </div>
        <ThemeSettings themeId={themeId} customColors={customColors} onThemeChange={onThemeChange} onCustomChange={onCustomChange} />
      </motion.div>
    </div>
  );
}
