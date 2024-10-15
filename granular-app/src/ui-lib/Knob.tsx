import { createRef, useEffect } from "react";
import { filter, map, merge, pairwise, type Observable } from "rxjs";
import {
  useObservableCallback,
  useSubscription,
} from "../app/hooks/observable";
import { clamp } from "../lib/math";
import { DragEvent } from "./Drag";
import style from "./Knob.module.css";

interface KnobProps {
  size: string;
  val: number;
  range: [min: number, max: number];
  setVal(val: number): void;
  dragEvents$: Observable<DragEvent.T>;
  disabled?: boolean;
}

export function Knob(props: KnobProps) {
  const { size, val, range, setVal, dragEvents$, disabled = false } = props;

  const [wheel$, handleWheel] =
    useObservableCallback<React.WheelEvent<HTMLDivElement>>();
  const [key$, handleKeyDown] = useObservableCallback<React.KeyboardEvent>();

  const ringRef = createRef<HTMLDivElement>();
  const notchRef = createRef<HTMLDivElement>();

  function set(val: number) {
    if (!disabled) {
      setVal(val);
    }
  }

  const dragDelta$ = dragEvents$.pipe(
    pairwise(),
    filter(([a, _]) => a.type !== "DragEnd"),
    map(([a, b]) => b.y - a.y),
    map((pixelDelta) => pixelDeltaToValDelta(range, pixelDelta)),
  );

  const wheelDelta$ = wheel$.pipe(
    map((e) => wheelDeltaToValDelta(range, e.deltaY)),
  );

  const keyDelta$ = key$.pipe(
    map((e) => keyEventToValDelta(range, e)),
    filter((n) => typeof n !== "undefined"),
  );

  useSubscription(merge(dragDelta$, wheelDelta$, keyDelta$), (delta) => {
    set(clamp(val + delta, range[0], range[1]));
  });

  usePreventWheelScrolling(notchRef, ringRef);

  return (
    <div
      ref={ringRef}
      tabIndex={disabled ? -1 : 0}
      role="slider"
      aria-disabled={disabled}
      aria-valuemin={range[0]}
      aria-valuemax={range[1]}
      aria-valuenow={val}
      onKeyDown={handleKeyDown}
      onWheel={handleWheel}
      className={style.ring}
      style={{
        width: size,
        height: size,
        transform: `rotate(${valToTurn(val, range)}turn)`,
      }}
    >
      <div ref={notchRef} className={style.notch} />
    </div>
  );
}

function usePreventWheelScrolling(...refs: React.RefObject<Element>[]) {
  useEffect(() => {
    function handleWheel(e: Event) {
      if (refs.some((ref) => ref.current === e.target)) {
        e.preventDefault();
      }
    }

    document.addEventListener("wheel", handleWheel, { passive: false });
    return () => document.removeEventListener("wheel", handleWheel);
  }, [refs]);
}

function pixelDeltaToValDelta(
  range: [min: number, max: number],
  delta: number,
): number {
  return (-delta / 75) * (range[1] - range[0]);
}

function wheelDeltaToValDelta(
  range: [min: number, max: number],
  delta: number,
): number {
  return (-delta / 1000) * (range[1] - range[0]);
}

function keyEventToValDelta(
  range: [min: number, max: number],
  e: React.KeyboardEvent<Element>,
): number | undefined {
  const fullRange = range[1] - range[0];
  const onePct = fullRange / 100;
  const tenPct = fullRange / 10;

  const tbl: Record<string, number> = {
    ArrowUp: onePct,
    ArrowDown: -onePct,
    PageUp: tenPct,
    PageDown: -tenPct,
    Home: Number.NEGATIVE_INFINITY,
    End: Number.POSITIVE_INFINITY,
  };

  if (e.key in tbl) {
    e.preventDefault();
    return tbl[e.key];
  }
}

function valToTurn(x: number, range: [min: number, max: number]): number {
  return (normalize(x, range) - 0.5) * 0.75;
}

function normalize(x: number, range: [min: number, max: number]): number {
  const [min, max] = range;
  return (x - min) / (max - min);
}
