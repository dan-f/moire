import { filter, map, pairwise, type Observable } from "rxjs";
import { clamp } from "../lib/math";
import { DragEvent } from "./Drag";
import { useSubscription } from "./hooks/observable";

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

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "100%",
        backgroundColor: "lightgray",
        border: "0.1rem solid black",
        transform: `scale(0.9) rotate(${valToTurn(val, range)}turn)`,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "0.1rem",
          backgroundColor: "black",
          height: "20%",
        }}
      />
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
