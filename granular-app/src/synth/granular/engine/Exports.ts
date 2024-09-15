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
    max_streams: number,
  ): Pointer;

  alloc_sample_buf(engine: Pointer, buf_len: number): void;

  reset_after_update_sample(engine: Pointer): void;

  alloc_output_bufs(
    engine: Pointer,
    new_capacity: number,
    new_len: number,
  ): void;

  sample_buf_l(engine: Pointer): Pointer;
  sample_buf_r(engine: Pointer): Pointer;

  output_buf_l(engine: Pointer): Pointer;
  output_buf_r(engine: Pointer): Pointer;

  playhead_buf(engine: Pointer, idx: number): Pointer;

  set_bpm(engine: Pointer, bpm: number): void;

  add_stream(
    engine: Pointer,
    subdivision: number,
    grain_start: number,
    grain_size_ms: number,
    gain: number,
    tune: number,
    pan: number,
    env: number,
  ): number;

  set_stream_subdivision(
    engine: Pointer,
    stream_id: number,
    subdivision: number,
  ): void;

  set_stream_grain_start(
    engine: Pointer,
    stream_id: number,
    grain_start: number,
  ): void;

  set_stream_grain_size_ms(
    engine: Pointer,
    stream_id: number,
    grain_size_ms: number,
  ): void;

  set_stream_gain(engine: Pointer, stream_id: number, gain: number): void;

  set_stream_tune(engine: Pointer, stream_id: number, tune: number): void;

  set_stream_pan(engine: Pointer, stream_id: number, pan: number): void;

  set_stream_env(engine: Pointer, stream_id: number, env: number): void;

  delete_stream(engine: Pointer, streamId: number): void;

  process(engine: Pointer): void;
}
