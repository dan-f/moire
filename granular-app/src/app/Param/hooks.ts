import { useState } from "react";
import { useSynth } from "../AppContext";
import * as ParamProps from "./ParamProps";

export function useParam(
  props: Pick<ParamProps.T, "paramKey" | "enabled">,
): [[ParamVal, SetParamVal], range: [min: number, max: number]] {
  const { paramKey, enabled } = props;
  const synth = useSynth();
  const param = synth.getParam(paramKey);
  const [val, setVal] = useState(param.value);

  const set: SetParamVal = (valOrCb) => {
    if (!enabled) {
      return;
    }
    const newVal = typeof valOrCb === "number" ? valOrCb : valOrCb(param.value);
    param.setValueAtTime(newVal, 0);
    setVal(newVal);
  };

  return [
    [val, set],
    [param.minValue, param.maxValue],
  ];
}

type ParamVal = number;

type SetParamVal = (valOrCb: ParamVal | ((val: ParamVal) => ParamVal)) => void;
