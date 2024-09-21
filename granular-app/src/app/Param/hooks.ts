import { useState } from "react";
import { useSynth } from "../AppContext";
import * as ParamProps from "./ParamProps";

export function useParamVal(props: ParamProps.T): {
  val: number;
  set: (val: number) => void;
} {
  const {
    param,
    range: [min],
  } = ParamProps.withDefaultRange(props);
  const synth = useSynth();
  const [val, setVal] = useState(get);

  function get(): number {
    return synth.getParamVal(param) ?? min;
  }

  function set(val: number) {
    setVal(val);
    synth.setParam(param, val);
  }

  return { val, set };
}
