import { useState } from "react";
import { clamp } from "../../lib/math";
import { NumberInput } from "../../ui-lib/NumberInput";
import { useBehaviorSubjectState } from "../hooks/observable";
import { useParam } from "./hooks";
import { type ParamProps } from "./ParamProps";

export function DiscreteParam(props: ParamProps) {
  const { paramKey, enabled } = props;
  const [[val$, setVal], paramDef] = useParam(props);
  const [min, max] = paramDef.value.range;
  const val = useBehaviorSubjectState(val$);
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
      label={paramDef.display?.name}
      min={min}
      max={max}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
}
