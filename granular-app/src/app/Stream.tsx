import { Env, SynthParam } from "../synth";
import { StreamParams } from "../synth/granular";
import { Param } from "./Param";
import cls from "./Stream.module.css";

interface StreamProps {
  stream: number;
}

export function Stream(props: StreamProps) {
  const { stream } = props;

  function synthParam(key: StreamParams.Key): SynthParam.T {
    return SynthParam.forStream(stream, key);
  }

  return (
    <div className={[cls.container, cls[`stream-${stream}`]].join(" ")}>
      <Param.Discrete param={synthParam("subdivision")} range={[1, 100]} />
      <Param.Knob param={synthParam("grainStart")} />
      <Param.Knob param={synthParam("grainSizeMs")} range={[10, 500]} />
      <Param.Knob param={synthParam("gain")} />
      <Param.Discrete param={synthParam("tune")} range={[-24, 24]} />
      <Param.Knob param={synthParam("pan")} />
      <Param.Discrete param={synthParam("env")} range={[Env.Min, Env.Max]} />
    </div>
  );
}
