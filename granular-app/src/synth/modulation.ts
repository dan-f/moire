import { Param } from "../lib/param";

export interface Modulation {
  id: number;
  source?: ModulationSource;
  gain: GainNode;
  target?: Param & { module: Required<Param["module"]> };
}

export interface ModulationSource {
  key: string;
  displayName: string;
  output: AudioNode;
}
