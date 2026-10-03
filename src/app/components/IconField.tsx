import {
  useRef,
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { inp, lbl } from "./layout";

/** Champ texte avec icône à gauche (style Vision). */
export function IconTextField({
  label,
  icon,
  className = "",
  ...p
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className={lbl}>{label}</label>
      <div className="relative w-full min-w-0">
        <span
          aria-hidden
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 vision-field-icon inline-flex"
        >
          {icon}
        </span>
        <input className={`${inp} pl-10`} {...p} />
      </div>
    </div>
  );
}

/** Champ nombre avec steppers Vision (comme GI). */
export function IconNumberField({
  label,
  className = "",
  value,
  onChange,
  step,
  min,
  max,
  ...p
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const emit = (next: number) => {
    if (!onChange) return;
    const str = String(next);
    onChange({
      target: { value: str, name: p.name, type: "number" },
      currentTarget: { value: str, name: p.name, type: "number" },
    } as ChangeEvent<HTMLInputElement>);
  };

  const stepNumber = (dir: 1 | -1) => {
    const s = Number(step ?? 1) || 1;
    const lo = min !== undefined && min !== "" ? Number(min) : Number.NEGATIVE_INFINITY;
    const hi = max !== undefined && max !== "" ? Number(max) : Number.POSITIVE_INFINITY;
    const cur = Number(value === "" || value === undefined ? inputRef.current?.value : value) || 0;
    emit(Math.min(hi, Math.max(lo, Math.round((cur + dir * s) * 1e6) / 1e6)));
  };

  return (
    <div className={className}>
      <label className={lbl}>{label}</label>
      <div className="relative w-full min-w-0">
        <input
          ref={inputRef}
          type="number"
          className={`${inp} vision-input-controlled pr-10`}
          value={value}
          onChange={onChange}
          step={step}
          min={min}
          max={max}
          {...p}
        />
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Augmenter"
            onClick={() => stepNumber(1)}
            className="vision-field-icon inline-flex items-center justify-center w-6 h-3.5 rounded"
          >
            <ChevronUp size={14} strokeWidth={2.25} />
          </button>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Diminuer"
            onClick={() => stepNumber(-1)}
            className="vision-field-icon inline-flex items-center justify-center w-6 h-3.5 rounded"
          >
            <ChevronDown size={14} strokeWidth={2.25} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function IconTextArea({
  label,
  icon,
  className = "",
  ...p
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  icon: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className={lbl}>{label}</label>
      <div className="relative w-full min-w-0">
        <span aria-hidden className="pointer-events-none absolute left-3.5 top-3.5 vision-field-icon inline-flex">
          {icon}
        </span>
        <textarea className={`${inp} pl-10 min-h-[80px]`} {...p} />
      </div>
    </div>
  );
}
