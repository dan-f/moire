import { i18n } from "../app/i18n";
import { type ParamDef } from "../lib/param";
import { percent } from "../ui-lib/format";
import { type GranularParamKey, GranularParamDefs } from "./granular";

const SynthLevelDefs = {
  masterGain: {
    key: "masterGain",
    value: { default: 1, range: [0, 2] },
    display: { name: i18n("level"), format: percent([0, 2]) },
  } satisfies ParamDef,
  saturationGain: {
    key: "saturationGain",
    value: { default: 1, range: [0.5, 5] },
    display: { name: i18n("drive"), format: percent([0.5, 5]) },
  } satisfies ParamDef,
  reverbBalance: {
    key: "reverbBalance",
    value: { default: -1, range: [-1, 1] },
    display: { name: i18n("reverb"), format: percent([-1, 1]) },
  } satisfies ParamDef,
};

export const SynthParamDefs: Record<
  GranularParamKey | keyof typeof SynthLevelDefs,
  ParamDef
> = {
  ...GranularParamDefs,
  ...SynthLevelDefs,
};

export type SynthParamKey = keyof typeof SynthParamDefs;

export * from "./granular/param";
