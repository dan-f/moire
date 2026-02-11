import { createRef, useEffect } from "react";
import {
  BehaviorSubject,
  filter,
  map,
  merge,
  Observable,
  pairwise,
} from "rxjs";
import {
  useBehaviorSubjectState,
  useSubject,
  useSubscription,
} from "../app/hooks/observable";
import { clamp } from "../lib/math";
import { DragEvent, DragTarget } from "./Drag";
import style from "./Knob.module.css";

interface KnobProps {
  val$: BehaviorSubject<number>;
  setVal(val: number): void;
  range: [min: number, max: number];
  id: string;
  size: string;
  label: string;
  disabled?: boolean;
}

export function Knob(props: KnobProps) {
  const { val$, setVal, range, id, size, label, disabled } = props;

  const renderBarrel = (dragEvent$: Observable<DragEvent.DragEvent>) => {
    return (
      <Barrel
        dragEvent$={dragEvent$}
        val$={val$}
        setVal={setVal}
        range={range}
        id={id}
        size={size}
        disabled={disabled}
      />
    );
  };

  return (
    <div className={style.container}>
      <DragTarget id={id} render={renderBarrel}></DragTarget>
      <label className={style.label} id={id}>
        {label}
      </label>
    </div>
  );
}

interface BarrelProps {
  dragEvent$: Observable<DragEvent.DragEvent>;
  val$: BehaviorSubject<number>;
  setVal: (val: number) => void;
  range: [min: number, max: number];
  id: string;
  size: string;
  disabled?: boolean;
}

function Barrel(props: BarrelProps) {
  const { dragEvent$, val$, setVal, range, id, size, disabled } = props;

  const val = useBehaviorSubjectState(val$);
  const wheel$ = useSubject<React.WheelEvent<HTMLDivElement>>();
  const key$ = useSubject<React.KeyboardEvent>();
  const ringRef = createRef<HTMLDivElement>();
  const notchRef = createRef<HTMLDivElement>();

  const dragDelta$ = dragEvent$.pipe(
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
    setVal(clamp(val$.value + delta, range[0], range[1]));
  });

  usePreventWheelScrolling(notchRef, ringRef);

  return (
    <div className={style["barrel-container"]}>
      <div
        className={style.barrel}
        ref={ringRef}
        tabIndex={disabled ? -1 : 0}
        role="slider"
        aria-disabled={disabled}
        aria-valuemin={range[0]}
        aria-valuemax={range[1]}
        aria-valuenow={val}
        aria-labelledby={id}
        onKeyDown={key$.next}
        onWheel={wheel$.next}
        // onFocus={() => setTooltipActive(true)}
        // onBlur={() => setTooltipActive(false)}
        // onMouseOver={() => setTooltipActive(true)}
        // onMouseLeave={() => setTooltipActive(false)}
        style={{
          width: size,
          height: size,
          transform: `rotate(${valToTurn(val, range)}turn)`,
        }}
      >
        <div ref={notchRef} className={style.notch} />
      </div>
      {/* {!disabled && <div className={style.tooltip}>{val.toFixed(2)}</div>} */}
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
