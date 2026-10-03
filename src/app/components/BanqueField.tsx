import { useMemo, useState } from "react";
import { ChevronDown, Landmark } from "lucide-react";
import { BANK_OTHER_VALUE, listBankOptions, resolveBankName } from "@/lib/banks";
import { inp, lbl, selectCls } from "./layout";

export function BanqueField({
  value,
  onChange,
  existingBanks = [],
  className = "",
  label = "Banque",
}: {
  value: string;
  onChange: (banque: string) => void;
  /** Banques déjà présentes sur d’autres crédits */
  existingBanks?: string[];
  className?: string;
  label?: string;
}) {
  const options = useMemo(() => listBankOptions(existingBanks), [existingBanks]);
  const resolvedValue = value ? resolveBankName(value, existingBanks) : "";
  const isKnown = Boolean(resolvedValue && options.includes(resolvedValue));

  const [customMode, setCustomMode] = useState(() => Boolean(value && !isKnown));
  const [customDraft, setCustomDraft] = useState(() => (value && !isKnown ? value : ""));

  const selectValue = customMode ? BANK_OTHER_VALUE : (isKnown ? resolvedValue : "");

  return (
    <div className={`min-w-0 space-y-3 ${className}`}>
      <div>
        <label className={lbl}>{label}</label>
        <div className="relative w-full">
          <span
            aria-hidden
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 vision-field-icon inline-flex z-[1]"
          >
            <Landmark size={16} strokeWidth={2} />
          </span>
          <select
            className={`${selectCls} pl-10`}
            value={selectValue}
            onChange={(e) => {
              const v = e.target.value;
              if (v === BANK_OTHER_VALUE) {
                setCustomMode(true);
                setCustomDraft("");
                onChange("");
                return;
              }
              setCustomMode(false);
              setCustomDraft("");
              onChange(v);
            }}
          >
            <option value="" className="vision-input vision-text">
              Choisir une banque…
            </option>
            {options.map((b) => (
              <option key={b} value={b} className="vision-input vision-text">
                {b}
              </option>
            ))}
            <option value={BANK_OTHER_VALUE} className="vision-input vision-text">
              Autre banque…
            </option>
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 vision-field-icon"
            aria-hidden
          />
        </div>
      </div>

      {customMode && (
        <div>
          <label className={lbl}>Nom de la banque</label>
          <div className="relative w-full">
            <span
              aria-hidden
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 vision-field-icon inline-flex"
            >
              <Landmark size={16} strokeWidth={2} />
            </span>
            <input
              type="text"
              className={`${inp} pl-10`}
              placeholder="Ex. Fortuneo, ING…"
              value={customDraft}
              onChange={(e) => {
                setCustomDraft(e.target.value);
                onChange(e.target.value);
              }}
              onBlur={(e) => {
                const resolved = resolveBankName(e.target.value, existingBanks);
                setCustomDraft(resolved);
                onChange(resolved);
                if (resolved && options.includes(resolved)) {
                  setCustomMode(false);
                }
              }}
              autoFocus
            />
          </div>
          <p className="text-xs vision-text-muted mt-1.5">
            Si le nom existe déjà (même avec une casse différente), il sera fusionné automatiquement.
          </p>
        </div>
      )}
    </div>
  );
}
