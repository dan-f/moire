/**
 * Param key type of all {@linkcode AudioParam} parameters of the
 * `GranularProcessor`
 *
 * TODO(poly): unify this with `ParamDescriptor` type so that we don't get drift
 */
export type ProcessorParamKey =
  | "bpm"
  | "attack"
  | "decay"
  | "sustain"
  | "release"
  | "note_event"
  | StreamParamKey;

/**
 * Param key type of all per-stream {@linkcode AudioParam} parameters of the
 * `GranularProcessor`
 */
export type StreamParamKey = `stream_${number}_${StreamParamName}`;

/**
 * Names of per-stream parameters. Must be concatenated with per-stream ID
 * via {@linkcode packStreamParam} to form fully-qualified {@linkcode ProcessorParamKey}.
 */
export type StreamParamName =
  | "enabled"
  | "subdivision"
  | "grainStart"
  | "grainSizeMs"
  | "gain"
  | "tune"
  | "pan"
  | "env";

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
 * Test whether the given param key is stream-specific
 */
export function isStreamParam(t: ProcessorParamKey): t is StreamParamKey {
  return t.startsWith("stream");
}

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
