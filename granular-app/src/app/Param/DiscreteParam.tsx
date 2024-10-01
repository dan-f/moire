import { clamp } from "../../lib/math";
import { NumberInput } from "../../ui-lib/NumberInput";
import * as ParamProps from "./ParamProps";
import { useParamVal } from "./hooks";

export function DiscreteParam(props: ParamProps.T) {
  const {
    enabled,
    range: [min, max],
  } = ParamProps.withDefaultRange(props);
  const { val, set } = useParamVal(props);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const parsed = parseInt(e.target.value);
    const newVal = Number.isInteger(parsed) ? clamp(parsed, min, max) : min;
    set(newVal);
  }

  return (
    <NumberInput
      disabled={!enabled}
      value={val}
      min={min}
      max={max}
      onChange={handleChange}
    />
  );
}
