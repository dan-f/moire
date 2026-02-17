import { BehaviorSubject } from "rxjs";
import { ParamDef } from "../../lib/param";
import { useSynth } from "../AppContext";
import { useBehaviorSubject } from "../hooks/observable";
import { type ParamProps } from "./ParamProps";

export function useParam(
  props: Pick<ParamProps, "paramKey" | "enabled">,
): [[BehaviorSubject<ParamVal>, SetParamVal], ParamDef] {
  const { paramKey, enabled } = props;
  const synth = useSynth();
  const param = synth.getParam(paramKey);
  const val$ = useBehaviorSubject(param.manual.value);

  const set: SetParamVal = (valOrCb) => {
    if (!enabled) {
      return;
    }
    const newVal =
      typeof valOrCb === "number" ? valOrCb : valOrCb(param.manual.value);
    param.manual.setValueAtTime(newVal, 0);
    val$.next(newVal);
  };

  return [[val$, set], param.def];
}

type ParamVal = number;

type SetParamVal = (valOrCb: ParamVal | ((val: ParamVal) => ParamVal)) => void;
