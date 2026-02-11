// For now all audio params are owned by the granular processor, but this may
// expand down the line.
//

import { type ProcessorParamKey } from "./granular";

export type SynthParamKey =
  | ProcessorParamKey
  | "masterGain"
  | "saturationGain"
  | "reverbBalance";

export * from "./granular/param";
