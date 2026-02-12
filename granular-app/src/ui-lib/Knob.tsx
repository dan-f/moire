import { createRef, useEffect } from "react";
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  concat,
  distinctUntilChanged,
  filter,
  map,
  merge,
  Observable,
  of,
  pairwise,
  timeout,
} from "rxjs";
import {
  useBehaviorSubject,
  useBehaviorSubjectState,
  useObservableState,
  useSubject,
  useSubscription,
} from "../app/hooks/observable";
import { clamp } from "../lib/math";
import { DragEvent, DragTarget } from "./Drag";
import style from "./Knob.module.css";
import { classes } from "./css";
import { decimal, ValueFormatter } from "./format";

interface KnobProps {
  val$: BehaviorSubject<number>;
  setVal(val: number): void;
  range: [min: number, max: number];
  id: string;
  size: string;
  label: string;
  formatValue?: ValueFormatter;
  disabled?: boolean;
}

export function Knob(props: KnobProps) {
  const { val$, setVal, range, id, size, label, formatValue, disabled } = props;

  return (
    <div className={style.container}>
      <DragTarget
        id={id}
        render={(dragEvent$, dragFocus$) => {
          return (
            <BarrelContainer
              dragEvent$={dragEvent$}
              dragFocus$={dragFocus$}
              val$={val$}
              setVal={setVal}
              range={range}
              id={id}
              size={size}
              formatValue={formatValue}
              disabled={disabled}
            />
          );
        }}
        enabled={!disabled}
      ></DragTarget>
      <label className={style.label} id={id}>
        {label}
      </label>
    </div>
  );
}

interface BarrelContainerProps {
  dragEvent$: Observable<DragEvent.DragEvent>;
  dragFocus$: Observable<"current" | "other" | null>;
  val$: BehaviorSubject<number>;
  setVal: (val: number) => void;
  range: [min: number, max: number];
  id: string;
  size: string;
  formatValue?: ValueFormatter;
  disabled?: boolean;
}

function BarrelContainer(props: BarrelContainerProps) {
  const {
    dragEvent$,
    dragFocus$,
    val$,
    setVal,
    range,
    id,
    size,
    formatValue,
    disabled,
  } = props;

  const wheel$ = useSubject<React.WheelEvent>();
  const key$ = useSubject<React.KeyboardEvent>();
  const ringRef = createRef<HTMLDivElement>();
  const notchRef = createRef<HTMLDivElement>();

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!disabled) {
      key$.next(event);
    }
  };

  const handleWheel = (event: React.WheelEvent) => {
    if (!disabled) {
      wheel$.next(event);
    }
  };

  usePreventWheelScrolling(notchRef, ringRef);

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

  const isDragging$ = concat(
    of(false),
    dragEvent$.pipe(map((e) => e.type !== DragEvent.EventType.DragEnd)),
  );

  const isScrolling$ = concat(
    of(false),
    wheel$.pipe(
      map(() => true),
      timeout(350),
      catchError((_err, caught) => concat(of(false), caught)),
    ),
  );

  const isFocusing$ = useBehaviorSubject(false);
  const handleFocus = () => {
    isFocusing$.next(true);
  };
  const handleBlur = () => {
    isFocusing$.next(false);
  };

  const isHovering$ = useBehaviorSubject(false);
  const handleMouseEnter = () => {
    isHovering$.next(true);
  };
  const handleMouseLeave = () => {
    isHovering$.next(false);
  };

  const isHoveringOrFocusing$ = combineLatest([
    isHovering$,
    isFocusing$,
    dragFocus$,
  ]).pipe(
    map(
      ([hovering, focusing, dragFocus]) =>
        !disabled && (hovering || focusing) && dragFocus === null,
    ),
    distinctUntilChanged(),
  );

  const isInteracting$ = combineLatest([
    isDragging$,
    isScrolling$,
    isHoveringOrFocusing$,
  ]).pipe(
    map(
      ([dragging, scrolling, hoverOrFocus]) =>
        dragging || scrolling || hoverOrFocus,
    ),
    distinctUntilChanged(),
  );

  return (
    <Barrel
      val$={val$}
      range={range}
      id={id}
      size={size}
      formatValue={formatValue}
      tooltip$={isInteracting$}
      disabled={disabled}
      onKeyDown={handleKeyDown}
      onWheel={handleWheel}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    />
  );
}

interface BarrelProps {
  val$: BehaviorSubject<number>;
  range: [min: number, max: number];
  id: string;
  size: string;
  formatValue?: ValueFormatter;
  tooltip$: Observable<boolean>;
  disabled?: boolean;
  onKeyDown: React.KeyboardEventHandler;
  onWheel: React.WheelEventHandler;
  onFocus: React.FocusEventHandler;
  onBlur: React.FocusEventHandler;
  onMouseEnter: React.MouseEventHandler;
  onMouseLeave: React.MouseEventHandler;
}

function Barrel(props: BarrelProps) {
  const {
    val$,
    range,
    id,
    size,
    formatValue = decimal,
    tooltip$,
    disabled,
    onKeyDown,
    onWheel,
    onFocus,
    onBlur,
    onMouseEnter,
    onMouseLeave,
  } = props;

  const val = useBehaviorSubjectState(val$);
  const tooltip = useObservableState(tooltip$, false);
  const ringRef = createRef<HTMLDivElement>();
  const notchRef = createRef<HTMLDivElement>();

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
        onKeyDown={onKeyDown}
        onWheel={onWheel}
        onFocus={onFocus}
        onBlur={onBlur}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={{
          width: size,
          height: size,
          transform: `rotate(${valToTurn(val, range)}turn)`,
        }}
      >
        <div ref={notchRef} className={style.notch} />
      </div>
      <div className={classes(style.tooltip, !tooltip && style.hidden)}>
        {formatValue(val)}
      </div>
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
