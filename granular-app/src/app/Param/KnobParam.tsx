import { type Observable } from "rxjs";
import { DragEvent, DragTarget } from "../../ui-lib/Drag";
import { Knob } from "../../ui-lib/Knob";
import { useParam } from "./hooks";
import { type ParamProps } from "./ParamProps";

export function KnobParam(props: ParamProps) {
  const { enabled, paramKey, label } = props;
  const [[val, set], range] = useParam(props);

  const render = (events$: Observable<DragEvent.DragEvent>) => {
    return (
      <Knob
        size="2rem"
        val={val}
        range={range}
        setVal={set}
        id={paramKey}
        label={label}
        dragEvents$={events$}
        disabled={!enabled}
      />
    );
  };

  return <DragTarget id={props.paramKey} render={render} />;
}
