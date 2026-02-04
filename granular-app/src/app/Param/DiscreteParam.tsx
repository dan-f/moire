import { useState } from "react";
import { clamp } from "../../lib/math";
import { NumberInput } from "../../ui-lib/NumberInput";
import * as ParamProps from "./ParamProps";
import { useParam } from "./hooks";

export function DiscreteParam(props: ParamProps.T) {
  const { paramKey, enabled, label } = props;
  const [[val, setVal], [min, max]] = useParam(props);
  const [input, setInput] = useState<string>(`${val}`);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const rawInput = e.target.value.trim();
    setInput(rawInput);
    const parsed = parseInt(rawInput);
    if (Number.isInteger(parsed)) {
      const clamped = clamp(parsed, min, max);
      setVal(clamped);
      // Subtlety - we only want to update to the clamped input when we're using
      // the increment/decrement buttons. Otherwise, when the user is entering
      // text directly into the input box, we only want to correct the input
      // after the field is blurred.
      if (e.target !== document.activeElement) {
        setInput(`${clamped}`);
      }
    }
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    const parsed = parseInt(e.target.value.trim());
    if (parsed !== val) {
      setInput(`${val}`);
    }
  }

  return (
    <NumberInput
      id={paramKey}
      disabled={!enabled}
      value={input}
      label={label}
      min={min}
      max={max}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
}
