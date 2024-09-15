import * as Stream from "./Stream";

/**
 * Param key type of all {@linkcode AudioParam} parameters of the `GranularProcessor`
 */
export type T = "bpm" | StreamParam;

/**
 * Param key type of all per-stream {@linkcode AudioParam} parameters of the
 * `GranularProcessor`
 */
export type StreamParam = `stream_${number}_${keyof Stream.T}`;

/**
 * Type of the `params` parameter map passed into the
 * `GranularProcessor.process` callback
 */
export type ProcessorParams = Record<T, Float32Array>;

/**
 * Get the stream param for a given stream param
 */
export function packStreamParam(
  streamId: number,
  key: Stream.Key,
): StreamParam {
  return `stream_${streamId}_${key}`;
}

/**
 * Get the stream ID and stream key from a processor param key
 */
export function unpackStreamParam(
  param: StreamParam,
): [number, Stream.Key] | undefined {
  const re = /^stream_(\d+)_(\w+)$/;
  const match = param.match(re);
  if (!match) {
    return;
  }
  const [_, streamId, key] = match;
  return [parseInt(streamId), key as Stream.Key];
}
