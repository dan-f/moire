import { SynthParamKey } from "../../synth";

export interface ParamProps {
  paramKey: SynthParamKey;
  label: string;
  enabled: boolean;
  /**
   * When specified, override the default range, which is the param's
   * [`minValue`, `maxValue`]
   */
  range?: [min: number, max: number];
}
