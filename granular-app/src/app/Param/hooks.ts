import { useState } from "react";
import { useSynth } from "../AppContext";
import * as ParamProps from "./ParamProps";

export function useParamVal(
  props: Pick<ParamProps.T, "param" | "range" | "enabled">,
): [ParamVal, SetParamVal] {
  const { param, range: [min] = ParamProps.defaultRange, enabled } = props;
  const synth = useSynth();
  const [val, setVal] = useState(get);

  function get(): number {
    return synth.getParamVal(param) ?? min;
  }

  const set: SetParamVal = (valOrCb) => {
    if (!enabled) {
      return;
    }
    const newVal = typeof valOrCb === "number" ? valOrCb : valOrCb(get());
    synth.setParam(param, newVal);
    setVal(newVal);
  };

  return [val, set];
}

type ParamVal = number;

type SetParamVal = (valOrCb: ParamVal | ((val: ParamVal) => ParamVal)) => void;
