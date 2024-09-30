import { useMemo } from "react";
import { select } from "../lib/observable";
import { Env, type Synth, SynthParam, SynthState } from "../synth";
import { StreamParams } from "../synth/granular";
import { Bordered } from "../ui-lib/Bordered";
import { IconButton } from "../ui-lib/IconButton";
import { useSynth } from "./AppContext";
import { Param } from "./Param";
import style from "./Stream.module.css";
import { useObservableState } from "./hooks/observable";
import { PowerIcon } from "./icons";

interface StreamProps {
  stream: number;
}

export function Stream(props: StreamProps) {
  const { stream } = props;
  const synth = useSynth();
  const [enabled, toggleEnabled] = useEnabled(synth, stream);

  function synthParam(key: StreamParams.Key): SynthParam.T {
    return SynthParam.packStreamParam(stream, key);
  }

  const classes = [style.container, style[`stream${stream}`]];
  if (!enabled) {
    classes.push(style.disabled);
  }

  return (
    <Bordered>
      <div className={classes.join(" ")}>
        <IconButton icon={<PowerIcon />} onClick={toggleEnabled} />
        <Param.Discrete
          param={synthParam("subdivision")}
          enabled={enabled}
          range={[1, 100]}
        />
        <Param.Knob param={synthParam("grainStart")} enabled={enabled} />
        <Param.Knob
          param={synthParam("grainSizeMs")}
          enabled={enabled}
          range={[10, 500]}
        />
        <Param.Knob param={synthParam("gain")} enabled={enabled} />
        <Param.Discrete
          param={synthParam("tune")}
          enabled={enabled}
          range={[-24, 24]}
        />
        <Param.Knob param={synthParam("pan")} enabled={enabled} />
        <Param.Discrete
          param={synthParam("env")}
          enabled={enabled}
          range={[Env.Min, Env.Max]}
        />
      </div>
    </Bordered>
  );
}

function useEnabled(
  synth: Synth,
  stream: number,
): [enabled: boolean, toggleEnabled: () => void] {
  const enabled = useObservableState(
    useMemo(
      () => synth.state$.pipe(select(SynthState.streamEnabled(stream))),
      [stream, synth.state$],
    ),
    false,
  );

  function toggleEnabled() {
    synth.toggleStreamEnabled(stream);
  }

  return [enabled, toggleEnabled];
}
