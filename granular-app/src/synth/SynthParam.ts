import { ProcessorParam, StreamParams } from "./granular";

// For now all audio params are owned by the granular processor, but this may
// expand down the line
export type T = ProcessorParam.T;

export function forStream(stream: number, key: StreamParams.Key) {
  return ProcessorParam.packStreamParam(stream, key);
}
