import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";

const btnG = "inline-flex items-center gap-2 vision-surface hover:vision-surface-strong vision-text-muted hover:vision-text border border-[var(--v-glass-border)] rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-150";

export function DetailDrawer({ open, title, subtitle, onClose, actions, children }: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/55 backdrop-blur-sm z-[60] lg:bg-black/40"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed top-0 right-0 h-full w-full min-w-0 z-[70] flex flex-col overflow-hidden sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl 2xl:max-w-3xl"
            style={{ background: "linear-gradient(160deg, var(--v-drawer-from) 0%, var(--v-drawer-to) 100%)", borderLeft: "1px solid var(--v-sidebar-border)" }}
          >
            <div className="px-4 sm:px-6 py-4 flex items-start justify-between gap-3 border-b border-[var(--v-border-subtle)] flex-shrink-0">
              <div className="min-w-0 flex-1">
                <p className="text-base sm:text-lg font-bold break-words vision-text">{title}</p>
                {subtitle && <p className="text-xs sm:text-sm vision-text-muted mt-0.5 break-words">{subtitle}</p>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {actions}
                <button onClick={onClose} className={btnG} aria-label="Fermer"><X size={14} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 space-y-4 md:space-y-5">{children}</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
