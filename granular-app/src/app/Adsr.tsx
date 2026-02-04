import style from "./Adsr.module.css";
import { Param } from "./Param";

export function Adsr() {
  return (
    <div className={style.container}>
      <Param.Knob paramKey="attack" label="attack" enabled />
      <Param.Knob paramKey="decay" label="decay" enabled />
      <Param.Knob paramKey="sustain" label="sustain" enabled />
      <Param.Knob paramKey="release" label="release" enabled />
    </div>
  );
}
