/** Conteneur pleine largeur pour toutes les pages */
export const pageWrap = "w-full min-w-0 max-w-none";

/** Espace de fin de page pour éviter tout recouvrement par la navigation */
export const pageEndSpacer = "h-2 sm:h-4 shrink-0";

/** Carte glass morphism — suit le thème actif */
export const G = "vision-glass backdrop-blur-xl rounded-2xl w-full min-w-0";
export const GE = "vision-glass-strong backdrop-blur-2xl rounded-2xl shadow-xl shadow-black/20 w-full min-w-0";

export const lbl = "block text-[10px] sm:text-xs font-bold vision-text-muted uppercase tracking-widest mb-2";

export const inp =
  "w-full min-h-[44px] sm:min-h-[42px] vision-input border rounded-xl px-4 py-3 text-sm sm:text-base placeholder:text-[var(--v-placeholder)] focus:outline-none focus:border-[var(--v-accent)] focus:ring-2 focus:ring-[var(--v-focus-ring)] transition-all duration-200";

export const selectCls =
  "appearance-none w-full min-w-0 min-h-[44px] vision-select border rounded-xl pl-4 pr-11 py-3 text-sm sm:text-base font-medium cursor-pointer focus:outline-none focus:border-[var(--v-accent)] focus:ring-2 focus:ring-[var(--v-focus-ring)] hover:opacity-90 transition-all";

export const btnP =
  "inline-flex items-center gap-2 border rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-150 bg-[color-mix(in_srgb,var(--v-accent-2)_88%,transparent)] hover:bg-[var(--v-accent)] border-[color-mix(in_srgb,var(--v-accent)_35%,transparent)] text-[var(--v-on-accent)]";

export const btnG =
  "inline-flex items-center gap-2 vision-glass hover:opacity-90 vision-text-muted hover:vision-text border rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-150";

export const btnD =
  "inline-flex items-center gap-2 bg-red-600/25 hover:bg-red-600/40 vision-negative-text border border-red-500/35 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150";

export const btnS =
  "inline-flex items-center gap-2 bg-emerald-600/85 hover:bg-emerald-500/90 text-[var(--v-on-accent)] border border-emerald-500/40 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-150";

export const surface = "vision-surface rounded-xl";
export const surfaceStrong = "vision-surface-strong rounded-xl";
export const kpiLabel = "vision-kpi-label mb-1";
export const tableHead = "vision-table-head";

/** Barre d'actions des pages complètes */
export const fullPageToolbar = "flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 w-full min-w-0";

/** Bouton page complète — zone tactile 44px, pleine largeur sur mobile */
export const fullPageBtn =
  "inline-flex items-center justify-center gap-2 min-h-[44px] w-full sm:w-auto min-w-0 vision-glass hover:opacity-90 vision-text-muted hover:vision-text border rounded-xl px-4 py-2.5 text-sm font-medium transition-all";

/** Carte principale page complète */
export const fullPageCard =
  "vision-glass backdrop-blur-xl rounded-2xl p-4 sm:p-6 md:p-8 w-full min-w-0 overflow-hidden";

/** Grille KPI pages complètes */
export const metricsGridPage = "grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 w-full min-w-0";

/** Tableau scrollable horizontal (mobile) */
export const tableScroll = "w-full min-w-0 overflow-x-auto overscroll-x-contain touch-pan-x rounded-lg";

/** Carte liste mobile (pages complètes) */
export const mobileDetailCard =
  "w-full min-w-0 text-left p-3 sm:p-4 rounded-xl vision-glass hover:opacity-95 active:scale-[0.99] transition-all";

/** Formulaires création / édition — pleine largeur, grille sur grand écran */
export const formWrap = "w-full min-w-0 max-w-none space-y-4 md:space-y-5";

/** Grille de champs dans un formulaire */
export const formGrid = "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4";

/** Grille KPI / métriques */
export const metricsGrid = "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 sm:gap-3";

/** Grille cartes liste */
export const cardsGrid = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4 md:gap-5 w-full";
