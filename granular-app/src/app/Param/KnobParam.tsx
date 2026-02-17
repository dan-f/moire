import { Knob } from "../../ui-lib/Knob";
import { type ParamProps } from "./ParamProps";
import { useParam } from "./hooks";

export function KnobParam(props: ParamProps) {
  const { enabled, paramKey } = props;
  const [[val$, set], paramDef] = useParam(props);

  return (
    <Knob
      val$={val$}
      setVal={set}
      range={paramDef.value.range}
      id={paramKey}
      size="2rem"
      label={paramDef.display?.name}
      formatValue={paramDef.display?.format}
      disabled={!enabled}
    />
  );
}
