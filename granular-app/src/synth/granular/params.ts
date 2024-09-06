import { Env } from "./Env";

/**
 * Logical parameters for stream creation and control
 */
export interface StreamParams {
  subdivision: number;
  grainStart: number;
  grainSizeMs: number;
  gain: number;
  tune: number;
  pan: number;
  env: Env;
}

/**
 * Get the processor param key for a given stream & logical param
 */
export function toProcessorParam(
  streamId: number,
  param: keyof StreamParams,
): StreamParam {
  return `stream_${streamId}_${param}`;
}

/**
 * Type of the `params` parameter map passed into the
 * `GranularProcessor.process` callback
 */
export type ProcessorParams = Record<ProcessorParam, Float32Array>;

/**
 * Key type of all {@linkcode AudioParam} parameters of the `GranularProcessor`
 */
export type ProcessorParam = GlobalBpm | StreamParam;

type GlobalBpm = "bpm";

/**
 * Key type of all per-stream {@linkcode AudioParam} parameters of the
 * `GranularProcessor`
 */
export type StreamParam =
  | StreamSubdivision
  | StreamGrainStart
  | StreamGrainSizeMs
  | StreamGain
  | StreamTune
  | StreamPan
  | StreamEnv;

type StreamSubdivision = `stream_${number}_subdivision`;
type StreamGrainStart = `stream_${number}_grainStart`;
type StreamGrainSizeMs = `stream_${number}_grainSizeMs`;
type StreamGain = `stream_${number}_gain`;
type StreamTune = `stream_${number}_tune`;
type StreamPan = `stream_${number}_pan`;
type StreamEnv = `stream_${number}_env`;
