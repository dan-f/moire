import { type Observable } from "rxjs";
import { DragEvent, DragTarget } from "../../ui-lib/Drag";
import { Knob } from "../../ui-lib/Knob";
import { useParamVal } from "./hooks";
import * as ParamProps from "./ParamProps";

export function KnobParam(props: ParamProps.T) {
  const { enabled, range } = ParamProps.withDefaultRange(props);
  const [val, set] = useParamVal(props);

  const render = (events$: Observable<DragEvent.T>) => {
    return (
      <Knob
        size="2rem"
        val={val}
        range={range}
        setVal={set}
        dragEvents$={events$}
        disabled={!enabled}
      />
    );
  };

  return <DragTarget id={props.param} render={render} />;
}
