import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from "react";

type Emit = (next: number) => void;

type StepperOpts = {
  dir: 1 | -1;
  step?: number | string;
  min?: number | string;
  max?: number | string;
  getValue: () => number;
  emit: Emit;
};

/**
 * Handlers pointer pour steppers numériques :
 * 1 pas au press, puis répétition tant que le doigt/souris reste enfoncé.
 */
export function useNumberStepperHandlers(opts: StepperOpts) {
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const delayRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const repeatRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const liveRef = useRef(0);

  const clear = useCallback(() => {
    if (delayRef.current !== undefined) clearTimeout(delayRef.current);
    if (repeatRef.current !== undefined) clearInterval(repeatRef.current);
    delayRef.current = undefined;
    repeatRef.current = undefined;
  }, []);

  const stepOnce = useCallback(() => {
    const o = optsRef.current;
    const s = Number(o.step ?? 1) || 1;
    const lo = o.min !== undefined && o.min !== "" ? Number(o.min) : Number.NEGATIVE_INFINITY;
    const hi = o.max !== undefined && o.max !== "" ? Number(o.max) : Number.POSITIVE_INFINITY;
    liveRef.current = Math.min(
      hi,
      Math.max(lo, Math.round((liveRef.current + o.dir * s) * 1e6) / 1e6),
    );
    o.emit(liveRef.current);
  }, []);

  const stop = useCallback((e?: ReactPointerEvent<HTMLButtonElement>) => {
    if (e) {
      try {
        e.currentTarget.releasePointerCapture?.(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    clear();
  }, [clear]);

  const start = useCallback((e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    clear();
    liveRef.current = optsRef.current.getValue();
    stepOnce();
    delayRef.current = setTimeout(() => {
      repeatRef.current = setInterval(stepOnce, 55);
    }, 380);
  }, [clear, stepOnce]);

  return {
    onPointerDown: start,
    onPointerUp: stop,
    onPointerCancel: stop,
    onContextMenu: (e: { preventDefault: () => void }) => e.preventDefault(),
  };
}
