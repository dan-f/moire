import { type Observable } from "rxjs";
import { Drag, DragEvent } from "../Drag";
import { Knob } from "../Knob";
import { useParamVal } from "./hooks";
import * as ParamProps from "./ParamProps";

export function KnobParam(props: ParamProps.T) {
  const { range } = ParamProps.withDefaultRange(props);
  const { val, set } = useParamVal(props);

  const render = (events$: Observable<DragEvent.T>) => {
    return (
      <Knob
        size="2rem"
        val={val}
        range={range}
        setVal={set}
        dragEvents$={events$}
      />
    );
  };

  return <Drag.Target id={props.param} render={render} />;
}
