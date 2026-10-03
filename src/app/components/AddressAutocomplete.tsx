import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Loader2, MapPin } from "lucide-react";
import { searchBanAddresses, type BanSearchKind, type BanSuggestion } from "@/lib/banAddress";
import { inp, lbl } from "./layout";

export interface AddressValue {
  address: string;
  cp: string;
  ville: string;
}

type Field = "address" | "cp" | "ville";

function kindFor(field: Field): BanSearchKind {
  if (field === "ville") return "city";
  if (field === "cp") return "postcode";
  return "address";
}

export function AddressAutocomplete({
  value,
  onChange,
  className = "",
}: {
  value: AddressValue;
  onChange: (next: AddressValue) => void;
  className?: string;
}) {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const cpRef = useRef<HTMLInputElement>(null);
  const villeRef = useRef<HTMLInputElement>(null);
  const [activeField, setActiveField] = useState<Field | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<BanSuggestion[]>([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [menuBox, setMenuBox] = useState<{ top: number; left: number; width: number } | null>(null);
  const skipSearch = useRef(false);

  const searchQuery =
    activeField === "cp" ? value.cp
      : activeField === "ville" ? value.ville
        : value.address;

  const updateMenuBox = () => {
    const el =
      activeField === "cp" ? cpRef.current
        : activeField === "ville" ? villeRef.current
          : addressRef.current;
    if (!el) {
      setMenuBox(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setMenuBox({
      top: r.bottom + 6,
      left: r.left,
      width: Math.max(r.width, activeField === "address" ? r.width : 280),
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updateMenuBox();
    const onScrollOrResize = () => updateMenuBox();
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open, activeField, searchQuery, suggestions.length]);

  useEffect(() => {
    if (skipSearch.current) {
      skipSearch.current = false;
      return;
    }
    if (!activeField) return;

    const q = searchQuery.trim();
    if (!q) {
      setSuggestions([]);
      setLoading(false);
      setOpen(false);
      return;
    }

    const ctrl = new AbortController();
    const t = window.setTimeout(async () => {
      setLoading(true);
      try {
        const hits = await searchBanAddresses(q, {
          signal: ctrl.signal,
          kind: kindFor(activeField),
          limit: 8,
          cp: value.cp,
          ville: value.ville,
        });
        if (!ctrl.signal.aborted) {
          setSuggestions(hits);
          setOpen(hits.length > 0);
          setActiveIdx(-1);
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setSuggestions([]);
          setOpen(false);
        }
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 80);

    return () => {
      window.clearTimeout(t);
      ctrl.abort();
    };
  }, [searchQuery, activeField, value.cp, value.ville]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t)) return;
      if (document.getElementById(`${listId}-list`)?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [listId]);

  const pick = (s: BanSuggestion) => {
    // Département (1 chiffre CP) → garder le préfixe et enchaîner les communes
    if (s.type === "department") {
      skipSearch.current = false;
      setActiveField("cp");
      onChange({ ...value, cp: s.cp });
      return;
    }

    skipSearch.current = true;
    setSuggestions([]);
    setOpen(false);

    if (activeField === "ville" || activeField === "cp" || s.type === "municipality") {
      onChange({
        address: value.address,
        cp: s.cp || value.cp,
        ville: s.ville || s.label,
      });
      return;
    }

    onChange({
      address: s.address || value.address,
      cp: s.cp || value.cp,
      ville: s.ville || value.ville,
    });
  };

  const onKeyNav = (e: KeyboardEvent) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      pick(suggestions[activeIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const suggestionTitle = (s: BanSuggestion) => {
    if (s.type === "department") return s.label;
    if (s.type === "municipality") return s.ville || s.label;
    return s.address || s.label;
  };

  const suggestionSub = (s: BanSuggestion) => {
    if (s.type === "department") return "Département";
    if (s.type === "municipality") return [s.cp, s.ville].filter(Boolean).join(" ");
    return [s.cp, s.ville].filter(Boolean).join(" ");
  };

  const menu =
    open && suggestions.length > 0 && menuBox
      ? createPortal(
          <ul
            id={`${listId}-list`}
            role="listbox"
            className="fixed z-[200] max-h-64 overflow-y-auto rounded-xl border border-[var(--v-glass-border)] shadow-2xl py-1"
            style={{
              top: menuBox.top,
              left: menuBox.left,
              width: menuBox.width,
              background: "var(--v-tooltip-bg, #141824)",
              color: "var(--v-text, #fff)",
            }}
          >
            {suggestions.map((s, i) => (
              <li key={s.id} role="option" aria-selected={i === activeIdx}>
                <button
                  type="button"
                  className={`w-full text-left px-3.5 py-2.5 text-sm transition-colors ${
                    i === activeIdx ? "vision-nav-active" : "hover:vision-surface vision-text"
                  }`}
                  onMouseEnter={() => setActiveIdx(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(s);
                  }}
                >
                  <span className="font-medium vision-text block leading-snug">{suggestionTitle(s)}</span>
                  {suggestionSub(s) && (
                    <span className="text-xs vision-text-muted">{suggestionSub(s)}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div className={`space-y-3 ${className}`} ref={wrapRef}>
      <div className="relative min-w-0">
        <label className={lbl} htmlFor={`${listId}-address`}>Adresse</label>
        <div className="relative">
          <MapPin
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 vision-text-muted"
            aria-hidden
          />
          <input
            ref={addressRef}
            id={`${listId}-address`}
            type="text"
            autoComplete="off"
            role="combobox"
            aria-expanded={open && activeField === "address"}
            aria-controls={`${listId}-list`}
            aria-autocomplete="list"
            className={`${inp} pl-10 ${loading && activeField === "address" ? "pr-10" : ""}`}
            placeholder="Ex. 22 rue Séry"
            value={value.address}
            onChange={(e) => {
              setActiveField("address");
              onChange({ ...value, address: e.target.value });
            }}
            onFocus={() => {
              setActiveField("address");
              if (suggestions.length > 0) setOpen(true);
            }}
            onKeyDown={onKeyNav}
          />
          {loading && activeField === "address" && (
            <Loader2 size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin vision-text-muted" aria-hidden />
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="min-w-0 relative">
          <label className={lbl} htmlFor={`${listId}-cp`}>Code postal</label>
          <div className="relative">
            <input
              ref={cpRef}
              id={`${listId}-cp`}
              className={`${inp} ${loading && activeField === "cp" ? "pr-10" : ""}`}
              placeholder="75001"
              inputMode="numeric"
              autoComplete="off"
              value={value.cp}
              onChange={(e) => {
                setActiveField("cp");
                onChange({ ...value, cp: e.target.value });
              }}
              onFocus={() => setActiveField("cp")}
              onKeyDown={onKeyNav}
            />
            {loading && activeField === "cp" && (
              <Loader2 size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin vision-text-muted" aria-hidden />
            )}
          </div>
        </div>
        <div className="col-span-2 min-w-0 relative">
          <label className={lbl} htmlFor={`${listId}-ville`}>Ville</label>
          <div className="relative">
            <input
              ref={villeRef}
              id={`${listId}-ville`}
              className={`${inp} ${loading && activeField === "ville" ? "pr-10" : ""}`}
              placeholder="Paris"
              autoComplete="off"
              value={value.ville}
              onChange={(e) => {
                setActiveField("ville");
                onChange({ ...value, ville: e.target.value });
              }}
              onFocus={() => setActiveField("ville")}
              onKeyDown={onKeyNav}
            />
            {loading && activeField === "ville" && (
              <Loader2 size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin vision-text-muted" aria-hidden />
            )}
          </div>
        </div>
      </div>

      {menu}
    </div>
  );
}
