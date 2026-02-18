import { i18n } from "../app/i18n";
import { type ParamDef } from "../lib/param";
import { percent, unit } from "../ui-lib/format";
import { type GranularParamKey, GranularParamDefs } from "./granular";
import { type Modulation } from "./modulation";

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
  lfo1Freq: {
    key: "lfo1Freq",
    value: { default: 0.5, range: [0, 10] },
    display: { name: `${i18n("Lfo")} 1`, format: unit("Hz") },
  } satisfies ParamDef,
  lfo2Freq: {
    key: "lfo2Freq",
    value: { default: 1, range: [0, 10] },
    display: { name: `${i18n("Lfo")} 2`, format: unit("Hz") },
  } satisfies ParamDef,
  lfo3Freq: {
    key: "lfo3Freq",
    value: { default: 2, range: [0, 10] },
    display: { name: `${i18n("Lfo")} 3`, format: unit("Hz") },
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

export function modulationGainParamKey(modulationId: Modulation["id"]): string {
  return `modulation_${modulationId}_gain`;
}

export * from "./granular/param";
