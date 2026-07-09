export interface VisionThemeVars {
  "--v-bg-1": string;
  "--v-bg-2": string;
  "--v-bg-3": string;
  "--v-glass-bg": string;
  "--v-glass-border": string;
  "--v-glass-strong": string;
  "--v-glass-border-strong": string;
  "--v-surface": string;
  "--v-surface-strong": string;
  "--v-border-subtle": string;
  "--v-text": string;
  "--v-text-muted": string;
  "--v-text-faint": string;
  "--v-accent": string;
  "--v-accent-2": string;
  "--v-accent-glow": string;
  "--v-accent-text": string;
  "--v-on-accent": string;
  "--v-positive": string;
  "--v-positive-text": string;
  "--v-negative": string;
  "--v-negative-text": string;
  "--v-warning": string;
  "--v-warning-text": string;
  "--v-violet": string;
  "--v-violet-text": string;
  "--v-info-text": string;
  "--v-input-bg": string;
  "--v-input-border": string;
  "--v-placeholder": string;
  "--v-tooltip-bg": string;
  "--v-drawer-from": string;
  "--v-drawer-to": string;
  "--v-sidebar-bg": string;
  "--v-sidebar-border": string;
  "--v-header-bg": string;
  "--v-header-border": string;
  "--v-nav-bg": string;
  "--v-nav-active-bg": string;
  "--v-blob-1": string;
  "--v-blob-2": string;
  "--v-blob-3": string;
  "--v-chart-grid": string;
  "--v-chart-axis": string;
  "--v-overlay": string;
  "--v-focus-ring": string;
}

export interface CustomThemeColors {
  bg1: string;
  bg2: string;
  bg3: string;
  accent: string;
  accent2: string;
  positive: string;
  negative: string;
  isLight: boolean;
}

export interface ThemePreset {
  id: string;
  name: string;
  swatch: [string, string, string];
  vars: VisionThemeVars;
}

const STORAGE_KEY = "vision-theme-id";
const CUSTOM_STORAGE_KEY = "vision-theme-custom";

/** Contrastes calibrés WCAG 2.1 AA sur fond sombre ~#060c1a */
function buildDarkTheme(
  bg1: string,
  bg2: string,
  bg3: string,
  accent: string,
  accent2: string,
  blob1: string,
  blob2: string,
  blob3: string,
): VisionThemeVars {
  return {
    "--v-bg-1": bg1,
    "--v-bg-2": bg2,
    "--v-bg-3": bg3,
    "--v-glass-bg": "rgba(255,255,255,0.09)",
    "--v-glass-border": "rgba(255,255,255,0.20)",
    "--v-glass-strong": "rgba(255,255,255,0.13)",
    "--v-glass-border-strong": "rgba(255,255,255,0.28)",
    "--v-surface": "rgba(255,255,255,0.07)",
    "--v-surface-strong": "rgba(255,255,255,0.11)",
    "--v-border-subtle": "rgba(255,255,255,0.12)",
    "--v-text": "#f1f5f9",
    "--v-text-muted": "#cbd5e1",
    "--v-text-faint": "#94a3b8",
    "--v-accent": accent,
    "--v-accent-2": accent2,
    "--v-accent-glow": `${accent}66`,
    "--v-accent-text": accent,
    "--v-on-accent": "#ffffff",
    "--v-positive": "#34d399",
    "--v-positive-text": "#6ee7b7",
    "--v-negative": "#f87171",
    "--v-negative-text": "#fca5a5",
    "--v-warning": "#fbbf24",
    "--v-warning-text": "#fcd34d",
    "--v-violet": "#a78bfa",
    "--v-violet-text": "#c4b5fd",
    "--v-info-text": "#93c5fd",
    "--v-input-bg": "#111d36",
    "--v-input-border": "rgba(255,255,255,0.38)",
    "--v-placeholder": "#94a3b8",
    "--v-tooltip-bg": "#0f172a",
    "--v-drawer-from": "#0a1020",
    "--v-drawer-to": "#0d0824",
    "--v-sidebar-bg": "rgba(255,255,255,0.06)",
    "--v-sidebar-border": "rgba(255,255,255,0.14)",
    "--v-header-bg": "rgba(255,255,255,0.05)",
    "--v-header-border": "rgba(255,255,255,0.12)",
    "--v-nav-bg": "rgba(6,12,26,0.96)",
    "--v-nav-active-bg": "rgba(255,255,255,0.14)",
    "--v-blob-1": blob1,
    "--v-blob-2": blob2,
    "--v-blob-3": blob3,
    "--v-chart-grid": "rgba(255,255,255,0.16)",
    "--v-chart-axis": "#cbd5e1",
    "--v-overlay": "rgba(0,0,0,0.60)",
    "--v-focus-ring": "rgba(96,165,250,0.55)",
  };
}

function buildLightTheme(
  bg1: string,
  bg2: string,
  bg3: string,
  accent: string,
  accent2: string,
): VisionThemeVars {
  return {
    "--v-bg-1": bg1,
    "--v-bg-2": bg2,
    "--v-bg-3": bg3,
    "--v-glass-bg": "rgba(255,255,255,0.88)",
    "--v-glass-border": "rgba(15,23,42,0.14)",
    "--v-glass-strong": "rgba(255,255,255,0.96)",
    "--v-glass-border-strong": "rgba(15,23,42,0.20)",
    "--v-surface": "rgba(15,23,42,0.04)",
    "--v-surface-strong": "rgba(15,23,42,0.07)",
    "--v-border-subtle": "rgba(15,23,42,0.10)",
    "--v-text": "#0f172a",
    "--v-text-muted": "#475569",
    "--v-text-faint": "#64748b",
    "--v-accent": accent,
    "--v-accent-2": accent2,
    "--v-accent-glow": `${accent}40`,
    "--v-accent-text": accent2,
    "--v-on-accent": "#ffffff",
    "--v-positive": "#059669",
    "--v-positive-text": "#047857",
    "--v-negative": "#dc2626",
    "--v-negative-text": "#b91c1c",
    "--v-warning": "#d97706",
    "--v-warning-text": "#b45309",
    "--v-violet": "#7c3aed",
    "--v-violet-text": "#6d28d9",
    "--v-info-text": "#1d4ed8",
    "--v-input-bg": "#ffffff",
    "--v-input-border": "rgba(15,23,42,0.22)",
    "--v-placeholder": "#64748b",
    "--v-tooltip-bg": "#ffffff",
    "--v-drawer-from": "#f8fafc",
    "--v-drawer-to": "#f1f5f9",
    "--v-sidebar-bg": "rgba(255,255,255,0.92)",
    "--v-sidebar-border": "rgba(15,23,42,0.12)",
    "--v-header-bg": "rgba(255,255,255,0.88)",
    "--v-header-border": "rgba(15,23,42,0.12)",
    "--v-nav-bg": "rgba(255,255,255,0.96)",
    "--v-nav-active-bg": "rgba(37,99,235,0.14)",
    "--v-blob-1": "rgba(37,99,235,0.08)",
    "--v-blob-2": "rgba(124,58,237,0.06)",
    "--v-blob-3": "rgba(6,182,212,0.05)",
    "--v-chart-grid": "rgba(15,23,42,0.12)",
    "--v-chart-axis": "#475569",
    "--v-overlay": "rgba(15,23,42,0.45)",
    "--v-focus-ring": "rgba(37,99,235,0.45)",
  };
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "midnight",
    name: "Minuit",
    swatch: ["#060c1a", "#2563eb", "#0c0826"],
    vars: buildDarkTheme("#060c1a", "#0c0826", "#060f20", "#60a5fa", "#2563eb", "rgba(37,99,235,0.11)", "rgba(124,58,237,0.09)", "rgba(6,182,212,0.07)"),
  },
  {
    id: "ocean",
    name: "Océan",
    swatch: ["#041824", "#06b6d4", "#082a35"],
    vars: buildDarkTheme("#041824", "#082a35", "#051f2a", "#22d3ee", "#0891b2", "rgba(6,182,212,0.14)", "rgba(14,165,233,0.1)", "rgba(45,212,191,0.08)"),
  },
  {
    id: "emerald",
    name: "Émeraude",
    swatch: ["#041a12", "#10b981", "#062318"],
    vars: buildDarkTheme("#041a12", "#062318", "#051510", "#34d399", "#059669", "rgba(16,185,129,0.12)", "rgba(52,211,153,0.09)", "rgba(6,182,212,0.06)"),
  },
  {
    id: "amethyst",
    name: "Améthyste",
    swatch: ["#12061f", "#a855f7", "#1a0a2e"],
    vars: buildDarkTheme("#12061f", "#1a0a2e", "#0f0818", "#c084fc", "#9333ea", "rgba(168,85,247,0.13)", "rgba(124,58,237,0.1)", "rgba(236,72,153,0.07)"),
  },
  {
    id: "sunset",
    name: "Sunset",
    swatch: ["#1a0a08", "#f97316", "#2d1208"],
    vars: buildDarkTheme("#1a0a08", "#2d1208", "#150806", "#fb923c", "#ea580c", "rgba(249,115,22,0.12)", "rgba(251,191,36,0.09)", "rgba(244,63,94,0.07)"),
  },
  {
    id: "aube",
    name: "Aube (clair)",
    swatch: ["#f0f4f8", "#2563eb", "#e2e8f0"],
    vars: buildLightTheme("#eef2f7", "#e8edf5", "#f5f7fb", "#2563eb", "#1d4ed8"),
  },
];

export const DEFAULT_CUSTOM: CustomThemeColors = {
  bg1: "#060c1a",
  bg2: "#0c0826",
  bg3: "#060f20",
  accent: "#60a5fa",
  accent2: "#2563eb",
  positive: "#34d399",
  negative: "#f87171",
  isLight: false,
};

export function customToVars(c: CustomThemeColors): VisionThemeVars {
  if (c.isLight) {
    return {
      ...buildLightTheme(c.bg1, c.bg2, c.bg3, c.accent, c.accent2),
      "--v-positive": c.positive,
      "--v-positive-text": c.positive,
      "--v-negative": c.negative,
      "--v-negative-text": c.negative,
    };
  }
  return {
    ...buildDarkTheme(c.bg1, c.bg2, c.bg3, c.accent, c.accent2, `${c.accent}1c`, `${c.accent2}17`, "rgba(6,182,212,0.07)"),
    "--v-positive": c.positive,
    "--v-positive-text": c.positive,
    "--v-negative": c.negative,
    "--v-negative-text": c.negative,
  };
}

export function applyVisionTheme(themeId: string, vars: VisionThemeVars, options?: { isLight?: boolean }) {
  const root = document.documentElement;
  root.setAttribute("data-vision-theme", themeId);
  const isLight = options?.isLight ?? themeId === "aube";
  if (isLight) root.setAttribute("data-vision-light", "true");
  else root.removeAttribute("data-vision-light");
  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  localStorage.setItem(STORAGE_KEY, themeId);
}

export function loadThemeId(): string {
  return localStorage.getItem(STORAGE_KEY) ?? "midnight";
}

export function loadCustomColors(): CustomThemeColors {
  try {
    const raw = localStorage.getItem(CUSTOM_STORAGE_KEY);
    if (!raw) return DEFAULT_CUSTOM;
    return { ...DEFAULT_CUSTOM, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CUSTOM;
  }
}

export function saveCustomColors(colors: CustomThemeColors) {
  localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(colors));
}

export function getPresetVars(themeId: string): VisionThemeVars | null {
  return THEME_PRESETS.find((t) => t.id === themeId)?.vars ?? null;
}
