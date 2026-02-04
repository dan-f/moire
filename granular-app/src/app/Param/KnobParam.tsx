import { type Observable } from "rxjs";
import { DragEvent, DragTarget } from "../../ui-lib/Drag";
import { Knob } from "../../ui-lib/Knob";
import { useParam } from "./hooks";
import * as ParamProps from "./ParamProps";

export function KnobParam(props: ParamProps.T) {
  const { enabled, paramKey, label } = props;
  const [[val, set], range] = useParam(props);

  const render = (events$: Observable<DragEvent.T>) => {
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
