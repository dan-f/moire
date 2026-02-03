import { clamp } from "../../lib/math";
import { NumberInput } from "../../ui-lib/NumberInput";
import * as ParamProps from "./ParamProps";
import { useParamVal } from "./hooks";

export function DiscreteParam(props: ParamProps.T) {
  const {
    param,
    enabled,
    label,
    range: [min, max] = ParamProps.defaultRange,
  } = props;
  const [val, set] = useParamVal(props);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const parsed = parseInt(e.target.value);
    const newVal = Number.isInteger(parsed) ? clamp(parsed, min, max) : min;
    set(newVal);
  }

  return (
    <NumberInput
      id={param}
      disabled={!enabled}
      value={val}
      label={label}
      min={min}
      max={max}
      onChange={handleChange}
    />
  );
}
