import { filter, map, pairwise, type Observable } from "rxjs";
import { clamp } from "../lib/math";
import { DragEvent } from "./Drag";
import { useSubscription } from "./hooks/observable";
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

  const deltaY$ = dragEvents$.pipe(
    pairwise(),
    filter(([a, _]) => a.type !== "DragEnd"),
    map(([a, b]) => b.y - a.y),
  );

  useSubscription(deltaY$, (y) => {
    if (!disabled) {
      setVal(calcNewVal(val, range, y));
    }
  });

  function handleKeyDown(e: React.KeyboardEvent) {
    const fullRange = range[1] - range[0];
    const onePct = fullRange / 100;
    const tenPct = fullRange / 10;

    let delta: number;
    switch (e.key) {
      case "ArrowUp":
        delta = onePct;
        break;
      case "ArrowDown":
        delta = -onePct;
        break;
      case "PageUp":
        delta = tenPct;
        break;
      case "PageDown":
        delta = -tenPct;
        break;
      case "Home":
        delta = range[0] - val;
        break;
      case "End":
        delta = range[1] - val;
        break;
      default:
        return;
    }

    e.preventDefault();
    setVal(clamp(val + delta, range[0], range[1]));
  }

  return (
    <div
      tabIndex={0}
      role="slider"
      aria-valuemin={range[0]}
      aria-valuemax={range[1]}
      aria-valuenow={val}
      onKeyDown={handleKeyDown}
      className={style.ring}
      style={{
        width: size,
        height: size,
        transform: `scale(0.9) rotate(${valToTurn(val, range)}turn)`,
      }}
    >
      <div className={style.notch} />
    </div>
  );
}

const PixelScale = 1 / 75;

function normalize(x: number, range: [min: number, max: number]): number {
  const [min, max] = range;
  return (x - min) / (max - min);
}

function denormalize(x: number, range: [min: number, max: number]): number {
  const [min, max] = range;
  return (max - min) * x + min;
}

function calcNewVal(
  val: number,
  range: [min: number, max: number],
  pixelDelta: number,
): number {
  const normalized = clamp(
    normalize(val, range) - pixelDelta * PixelScale,
    0,
    1,
  );
  return denormalize(normalized, range);
}

function valToTurn(x: number, range: [min: number, max: number]): number {
  return (normalize(x, range) - 0.5) * 0.75;
}
