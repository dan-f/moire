import { i18n } from "../../app/i18n";
import { range } from "../../lib/iter";
import { type ParamDef } from "../../lib/param";
import { percent, unit } from "../../ui-lib/format";
import { Config } from "./Config";

const ParamDefs = [
  {
    key: "bpm" as const,
    value: { range: [40, 300], default: 120 },
    display: { name: i18n("tempo"), format: unit(i18n("Bpm")) },
  },
  {
    key: "attack" as const,
    value: { range: [0, 1000], default: 10 },
    display: { name: i18n("attack"), format: unit(i18n("Milliseconds")) },
  },
  {
    key: "decay" as const,
    value: { range: [0, 2000], default: 50 },
    display: { name: i18n("decay"), format: unit(i18n("Milliseconds")) },
  },
  {
    key: "sustain" as const,
    value: { range: [0, 1], default: 0.8 },
    display: { name: i18n("sustain"), format: percent() },
  },
  {
    key: "release" as const,
    value: { range: [0, 3000], default: 250 },
    display: { name: i18n("release"), format: unit(i18n("Milliseconds")) },
  },
  {
    key: "note_event" as const,
    value: { range: [-128, 128], default: 0 },
  },
  ...Array.from(range(Config.NumStreams)).flatMap((streamId) => {
    const key = <N extends string>(name: N) =>
      `stream_${streamId}_${name}` as const;
    return [
      {
        key: key("enabled"),
        value: { range: [0, 1], default: streamId === 0 ? 1 : 0 },
      },
      {
        key: key("subdivision"),
        value: { range: [1, 100], default: streamId + 1 },
        display: { name: i18n("subdivision") },
      },
      {
        key: key("grainStart"),
        value: { range: [0, 1], default: 0 },
        display: { name: i18n("start"), format: percent() },
      },
      {
        key: key("grainSizeMs"),
        value: { range: [10, 500], default: 150 },
        display: { name: i18n("size"), format: unit(i18n("Milliseconds")) },
      },
      {
        key: key("grainProbability"),
        value: { range: [0, 1], default: 1 },
        display: { name: i18n("probability"), format: percent() },
      },
      {
        key: key("gain"),
        value: { range: [0, 1], default: 1 },
        display: { name: i18n("gain"), format: percent() },
      },
      {
        key: key("tune"),
        value: { range: [-24, 24], default: 0 },
        display: { name: i18n("tune") },
      },
      {
        key: key("pan"),
        value: { range: [0, 1], default: 0.5 },
        display: {
          name: i18n("pan"),
          format: (value) => {
            if (value === 0.5) {
              return i18n("Center");
            }
            if (value < 0.5) {
              return `${percent([0.5, 0])(value)} ${i18n("Left")}`;
            }
            return `${percent([0.5, 1])(value)} ${i18n("Right")}`;
          },
        },
      },
      {
        key: key("env"),
        value: { range: [0, 4], default: 1 },
        display: { name: i18n("env") },
      },
    ] satisfies ParamDef[];
  }),
] satisfies ParamDef[];

/**
 * All {@linkcode ParamDef}s for the granular node
 */
export const GranularParamDefs = ParamDefs.reduce<
  Record<(typeof ParamDefs)[number]["key"], ParamDef>
>(
  (defs, def) => ({ ...defs, [def.key]: def }),
  {} as Record<(typeof ParamDefs)[number]["key"], ParamDef>,
);

/**
 * Key type of all {@linkcode AudioParam} parameters of the `GranularProcessor`
 */
export type GranularParamKey = keyof typeof GranularParamDefs;

/**
 * Key type of all per-stream {@linkcode AudioParam} parameters of the
 * `GranularProcessor`
 */
export type StreamParamKey = Extract<
  GranularParamKey,
  `stream_${number}_${string}`
>;

/**
 * Names of per-stream parameters. Must be concatenated with per-stream ID via
 * {@linkcode packStreamParam} to form fully-qualified
 * {@linkcode GranularParamKey}.
 * */
export type StreamParamName =
  StreamParamKey extends `stream_${number}_${infer Name}` ? Name : never;

/**
 * Create a {@linkcode GranularParamKey} for a given stream param name and stream ID
 */
export function packStreamParam(
  streamId: number,
  key: StreamParamName,
): StreamParamKey {
  return `stream_${streamId}_${key}`;
}

/**
 * Type of the `params` parameter map passed into the
 * `GranularProcessor.process` callback
 */
export type GranularParams = Record<GranularParamKey, Float32Array>;

/**
 * Get the stream ID and stream key from a processor param key
 */
export function unpackStreamParam(
  param: StreamParamKey,
): [number, StreamParamName] | undefined {
  const re = /^stream_(\d+)_(\w+)$/;
  const match = param.match(re);
  if (!match) {
    return;
  }
  const [_, streamId, key] = match;
  return [parseInt(streamId), key as StreamParamName];
}

/**
 * Type of
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletProcessor/parameterDescriptors_static}
 */
export interface AudioParamDescriptor {
  name: string;
  automationRate: "a-rate" | "k-rate";
  defaultValue: number;
  minValue: number;
  maxValue: number;
}
