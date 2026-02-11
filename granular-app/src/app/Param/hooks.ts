import { BehaviorSubject } from "rxjs";
import { useSynth } from "../AppContext";
import { useBehaviorSubject } from "../hooks/observable";
import { type ParamProps } from "./ParamProps";

export function useParam(
  props: Pick<ParamProps, "paramKey" | "enabled" | "range">,
): [
  [BehaviorSubject<ParamVal>, SetParamVal],
  range: [min: number, max: number],
] {
  const { paramKey, enabled, range } = props;
  const synth = useSynth();
  const param = synth.getParam(paramKey);
  const val$ = useBehaviorSubject(param.value);

  const set: SetParamVal = (valOrCb) => {
    if (!enabled) {
      return;
    }
    const newVal = typeof valOrCb === "number" ? valOrCb : valOrCb(param.value);
    param.setValueAtTime(newVal, 0);
    val$.next(newVal);
  };

  return [[val$, set], range ?? [param.minValue, param.maxValue]];
}

type ParamVal = number;

type SetParamVal = (valOrCb: ParamVal | ((val: ParamVal) => ParamVal)) => void;
