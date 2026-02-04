// For now all audio params are owned by the granular processor, but this may
// expand down the line.
//
// TODO remove this point of indirection if that does not pan-out
export type { ProcessorParamKey as SynthParamKey } from "./granular";

export * from "./granular/param";
