export type Pointer = number;

/**
 * Exports of the WASM granular engine module
 */
export interface Exports extends WebAssembly.Exports {
  memory: WebAssembly.Memory;

  new_engine(
    sample_rate: number,
    output_buf_len: number,
    output_buf_capacity: number,
  ): Pointer;

  alloc_sample_buf(engine: Pointer, buf_len: number): void;

  reset_after_update_sample(engine: Pointer): void;

  alloc_output_buf(
    engine: Pointer,
    new_capacity: number,
    new_len: number,
  ): void;

  sample_buf_l(engine: Pointer): Pointer;
  sample_buf_r(engine: Pointer): Pointer;

  output_buf_l(engine: Pointer): Pointer;
  output_buf_r(engine: Pointer): Pointer;

  set_bpm(engine: Pointer, bpm: number): void;

  process(engine: Pointer): void;
}
