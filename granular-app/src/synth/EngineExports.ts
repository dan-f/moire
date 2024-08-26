export type Pointer = number;

/**
 * Type definition for the exports of the raw WASM granular engine.
 */
export interface EngineExports extends WebAssembly.Exports {
  memory: WebAssembly.Memory;

  new_synth(
    sample_rate: number,
    output_buf_capacity: number,
    output_buf_len: number,
  ): Pointer;

  alloc_sample_buf(synth: Pointer, buf_len: number): void;

  alloc_output_buf(synth: Pointer, new_capacity: number, new_len: number): void;

  sample_buf(synth: Pointer): Pointer;

  output_buf(synth: Pointer): Pointer;

  process(synth: Pointer): void;
}
