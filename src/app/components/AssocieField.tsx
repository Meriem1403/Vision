import { useMemo, useState } from "react";
import { ChevronDown, UserRound } from "lucide-react";
import {
  ASSOCIE_OTHER_VALUE,
  listAssocieOptions,
  resolveAssocieName,
  sameAssocieName,
} from "@/lib/associates";
import { inp, lbl, selectCls } from "./layout";

export function AssocieField({
  value,
  onChange,
  existingNames = [],
  excludeNames = [],
  className = "",
  label,
  placeholder = "Choisir un associé…",
}: {
  value: string;
  onChange: (name: string) => void;
  /** Noms déjà présents sur le patrimoine */
  existingNames?: string[];
  /** Noms déjà choisis sur d’autres lignes de ce formulaire */
  excludeNames?: string[];
  className?: string;
  label?: string;
  placeholder?: string;
}) {
  const allOptions = useMemo(() => listAssocieOptions(existingNames), [existingNames]);
  const resolvedValue = value ? resolveAssocieName(value, existingNames) : "";
  const isKnown = Boolean(resolvedValue && allOptions.includes(resolvedValue));

  const options = useMemo(() => {
    return allOptions.filter(
      (n) => !excludeNames.some((ex) => sameAssocieName(ex, n) && !sameAssocieName(ex, resolvedValue)),
    );
  }, [allOptions, excludeNames, resolvedValue]);

  const [customMode, setCustomMode] = useState(() => Boolean(value && !isKnown));
  const [customDraft, setCustomDraft] = useState(() => (value && !isKnown ? value : ""));

  const selectValue = customMode ? ASSOCIE_OTHER_VALUE : isKnown ? resolvedValue : "";

  return (
    <div className={`min-w-0 space-y-2 ${className}`}>
      {label ? <label className={lbl}>{label}</label> : null}
      <div className="relative w-full">
        <span
          aria-hidden
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 vision-field-icon inline-flex z-[1]"
        >
          <UserRound size={16} strokeWidth={2} />
        </span>
        <select
          className={`${selectCls} pl-10`}
          value={selectValue}
          onChange={(e) => {
            const v = e.target.value;
            if (v === ASSOCIE_OTHER_VALUE) {
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
            {placeholder}
          </option>
          {options.map((n) => (
            <option key={n} value={n} className="vision-input vision-text">
              {n}
            </option>
          ))}
          <option value={ASSOCIE_OTHER_VALUE} className="vision-input vision-text">
            Nouvel associé…
          </option>
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 vision-field-icon"
          aria-hidden
        />
      </div>

      {customMode && (
        <div>
          <input
            type="text"
            className={`${inp} pl-4`}
            placeholder="Prénom Nom"
            value={customDraft}
            onChange={(e) => {
              setCustomDraft(e.target.value);
              onChange(e.target.value);
            }}
            onBlur={(e) => {
              const resolved = resolveAssocieName(e.target.value, existingNames);
              setCustomDraft(resolved);
              onChange(resolved);
              if (resolved && allOptions.includes(resolved)) {
                setCustomMode(false);
              }
            }}
            autoFocus
          />
          <p className="text-xs vision-text-muted mt-1.5">
            Si le nom existe déjà (casse différente), il sera fusionné automatiquement.
          </p>
        </div>
      )}
    </div>
  );
}
