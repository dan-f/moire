import { ProcessorParam, StreamParams } from "./granular";

// For now all audio params are owned by the granular processor, but this may
// expand down the line.
//
// TODO remove this point of indirection if that does not pan-out
export type T = ProcessorParam.T;

export function packStreamParam(stream: number, key: StreamParams.Key) {
  return ProcessorParam.packStreamParam(stream, key);
}

export function unpackStreamParam(
  t: T,
): [stream: number, key: StreamParams.Key] | undefined {
  if (ProcessorParam.isStreamParam(t)) {
    return ProcessorParam.unpackStreamParam(t);
  }
}
