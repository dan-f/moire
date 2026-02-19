import { i18n } from "../app/i18n";
import { range } from "../lib/iter";
import { type ParamDef } from "../lib/param";
import { percent, unit } from "../ui-lib/format";
import { type GranularParamKey, Config, GranularParamDefs } from "./granular";
import { type Modulation } from "./modulation";

export const packStreamLfoFreqParamKey = (streamId: number) => {
  return `stream_${streamId}_lfoFreq` as const;
};

export const packStreamRandFreqParamKey = (streamId: number) => {
  return `stream_${streamId}_randFreq` as const;
};

const ParamDefs = [
  {
    key: "masterGain" as const,
    value: { default: 1, range: [0, 2] },
    display: { name: i18n("level"), format: percent([0, 2]) },
  },
  {
    key: "saturationGain" as const,
    value: { default: 1, range: [0.5, 5] },
    display: { name: i18n("drive"), format: percent([0.5, 5]) },
  },
  {
    key: "reverbBalance" as const,
    value: { default: -1, range: [-1, 1] },
    display: { name: i18n("reverb"), format: percent([-1, 1]) },
  },
  ...Array.from(range(Config.NumStreams)).flatMap((streamId) => {
    return [
      {
        key: packStreamLfoFreqParamKey(streamId),
        value: { default: 1, range: [0, 10] },
        display: { name: `${i18n("Lfo")}`, format: unit("Hz") },
      },
      {
        key: packStreamRandFreqParamKey(streamId),
        value: { default: 1, range: [0, 20] },
        display: { name: `${i18n("Random")}`, format: unit("Hz") },
      },
    ] satisfies ParamDef[];
  }),
] satisfies ParamDef[];

const SynthLevelDefs = ParamDefs.reduce<
  Record<(typeof ParamDefs)[number]["key"], ParamDef>
>(
  (defs, def) => ({ ...defs, [def.key]: def }),
  {} as Record<(typeof ParamDefs)[number]["key"], ParamDef>,
);

export const SynthParamDefs: Record<
  GranularParamKey | keyof typeof SynthLevelDefs,
  ParamDef
> = {
  ...GranularParamDefs,
  ...SynthLevelDefs,
};

export type SynthParamKey = keyof typeof SynthParamDefs;

export function packModulationGainParamKey(
  modulationId: Modulation["id"],
): string {
  return `modulation_${modulationId}_gain`;
}

export * from "./granular/param";
