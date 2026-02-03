import style from "./Adsr.module.css";
import { Param } from "./Param";

export function Adsr() {
  return (
    <div className={style.container}>
      <Param.Knob param="attack" label="attack" enabled range={[0, 5000]} />
      <Param.Knob param="decay" label="decay" enabled range={[0, 5000]} />
      <Param.Knob param="sustain" label="sustain" enabled range={[0, 1]} />
      <Param.Knob param="release" label="release" enabled range={[0, 10000]} />
    </div>
  );
}
