import { useEffect } from "react";
import { BehaviorSubject } from "rxjs";
import { ParamDef } from "../../lib/param";
import { useSynth } from "../AppContext";
import { useLogger } from "../hooks/logging";
import { useBehaviorSubject } from "../hooks/observable";
import { type ParamProps } from "./ParamProps";

export function useParam(
  props: Pick<ParamProps, "paramKey" | "enabled">,
): [[BehaviorSubject<ParamVal>, SetParamVal], ParamDef] {
  const { paramKey, enabled } = props;
  const synth = useSynth();
  const log = useLogger(useParam.name);
  const param = synth.getParam(paramKey);
  useEffect(() => {
    if (!param) {
      log.warn(
        `Called with unknown param key "${paramKey}". Returning dummy value`,
      );
    }
  }, [log, param, paramKey]);
  const manualTarget = param?.module.manualTarget;
  const val$ = useBehaviorSubject(manualTarget?.value ?? 0);

  const set: SetParamVal = (valOrCb) => {
    if (!enabled || !manualTarget) {
      return;
    }
    const newVal =
      typeof valOrCb === "number" ? valOrCb : valOrCb(manualTarget.value);
    manualTarget.value = newVal;
    val$.next(newVal);
  };

  return [
    [val$, set],
    param?.def ?? { key: "", value: { default: 0, range: [0, 1] } },
  ];
}

type ParamVal = number;

type SetParamVal = (valOrCb: ParamVal | ((val: ParamVal) => ParamVal)) => void;
