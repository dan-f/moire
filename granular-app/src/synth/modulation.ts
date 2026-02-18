import { Param } from "../lib/param";

export interface Modulation {
  id: number;
  source?: ModulationSource;
  destination?: Param & { module: Required<Param["module"]> };
}

export interface ModulationSource {
  key: string;
  displayName: string;
  output: AudioNode;
}
