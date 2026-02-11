import { range } from "../../lib/iter";
import { Config } from "./Config";
import { Max, Min } from "./Env";

/**
 * Parameter descriptors for the `GranularNode`. See
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletProcessor/parameterDescriptors_static}
 */
export const ParamDescriptors = [
  {
    name: "bpm" as const,
    automationRate: "k-rate",
    defaultValue: 120,
    minValue: 40,
    maxValue: 300,
  },
  {
    name: "attack" as const,
    automationRate: "k-rate",
    defaultValue: 10,
    minValue: 0,
    maxValue: 1000,
  },
  {
    name: "decay" as const,
    automationRate: "k-rate",
    defaultValue: 50,
    minValue: 0,
    maxValue: 2000,
  },
  {
    name: "sustain" as const,
    automationRate: "k-rate",
    defaultValue: 0.8,
    minValue: 0,
    maxValue: 1,
  },
  {
    name: "release" as const,
    automationRate: "k-rate",
    defaultValue: 250,
    minValue: 0,
    maxValue: 3000,
  },
  {
    name: "note_event" as const,
    automationRate: "k-rate",
    defaultValue: 0,
    minValue: -128,
    maxValue: 128,
  },
  ...Array.from(range(Config.NumStreams)).flatMap((streamId) => {
    const name = <N extends string>(name: N) =>
      `stream_${streamId}_${name}` as const;
    return [
      {
        name: name("enabled"),
        automationRate: "k-rate",
        defaultValue: streamId === 0 ? 1 : 0,
        minValue: 0,
        maxValue: 1,
      },
      {
        name: name("subdivision"),
        automationRate: "k-rate",
        defaultValue: 1,
        minValue: 1,
        maxValue: 100,
      },
      {
        name: name("grainStart"),
        automationRate: "k-rate",
        defaultValue: 0,
        minValue: 0,
        maxValue: 1,
      },
      {
        name: name("grainSizeMs"),
        automationRate: "k-rate",
        defaultValue: 150,
        minValue: 10,
        maxValue: 500,
      },
      {
        name: name("grainProbability"),
        automationRate: "k-rate",
        defaultValue: 1,
        minValue: 0,
        maxValue: 1,
      },
      {
        name: name("gain"),
        automationRate: "k-rate",
        defaultValue: 1,
        minValue: 0,
        maxValue: 1,
      },
      {
        name: name("tune"),
        automationRate: "k-rate",
        defaultValue: 0,
        minValue: -24,
        maxValue: 24,
      },
      {
        name: name("pan"),
        automationRate: "k-rate",
        defaultValue: 0.5,
        minValue: 0,
        maxValue: 1,
      },
      {
        name: name("env"),
        automationRate: "k-rate",
        defaultValue: 1,
        minValue: Min,
        maxValue: Max,
      },
    ] satisfies AudioParamDescriptor[];
  }),
] satisfies AudioParamDescriptor[];

/**
 * Key type of all {@linkcode AudioParam} parameters of the `GranularProcessor`
 */
export type ProcessorParamKey = (typeof ParamDescriptors)[number]["name"];

/**
 * Key type of all per-stream {@linkcode AudioParam} parameters of the
 * `GranularProcessor`
 */
export type StreamParamKey = Extract<
  ProcessorParamKey,
  `stream_${number}_${string}`
>;

/**
 * Names of per-stream parameters. Must be concatenated with per-stream ID via
 * {@linkcode packStreamParam} to form fully-qualified
 * {@linkcode ProcessorParamKey}.
 * */
export type StreamParamName =
  StreamParamKey extends `stream_${number}_${infer Name}` ? Name : never;

/**
 * Create a {@linkcode ProcessorParamKey} for a given stream param name and stream ID
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
export type ProcessorParams = Record<ProcessorParamKey, Float32Array>;

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
