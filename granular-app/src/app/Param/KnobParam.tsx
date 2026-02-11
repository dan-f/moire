import { Knob } from "../../ui-lib/Knob";
import { type ParamProps } from "./ParamProps";
import { useParam } from "./hooks";

export function KnobParam(props: ParamProps) {
  const { enabled, paramKey, label } = props;
  const [[val$, set], range] = useParam(props);

  return (
    <Knob
      val$={val$}
      setVal={set}
      range={range}
      id={paramKey}
      size="2rem"
      label={label}
      disabled={!enabled}
    />
  );
}
