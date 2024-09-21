import { clamp } from "../../lib/math";
import * as ParamProps from "./ParamProps";
import { useParamVal } from "./hooks";

export function DiscreteParam(props: ParamProps.T) {
  const {
    range: [min, max],
  } = ParamProps.withDefaultRange(props);
  const { val, set } = useParamVal(props);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const parsed = parseInt(e.target.value);
    const newVal = Number.isInteger(parsed) ? clamp(parsed, min, max) : min;
    set(newVal);
  }

  return (
    <input
      type="number"
      value={val}
      min={min}
      max={max}
      onChange={handleChange}
    />
  );
}
