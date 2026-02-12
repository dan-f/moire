import { SynthParamKey } from "../../synth";
import { ValueFormatter } from "../../ui-lib/format";

export interface ParamProps {
  paramKey: SynthParamKey;
  label: string;
  formatValue?: ValueFormatter;
  enabled: boolean;
  /**
   * When specified, override the default range, which is the param's
   * [`minValue`, `maxValue`]
   */
  range?: [min: number, max: number];
}
