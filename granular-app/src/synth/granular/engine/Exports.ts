export type Pointer = number;

/**
 * Exports of the WASM granular engine module
 */
export interface Exports extends WebAssembly.Exports {
  memory: WebAssembly.Memory;

  // engine configuration
  new_engine(
    sample_rate: number,
    output_buf_len: number,
    output_buf_capacity: number,
  ): Pointer;
  alloc_sample_buf(engine: Pointer, buf_len: number): void;
  reset_after_update_sample(engine: Pointer): void;
  alloc_output_bufs(
    engine: Pointer,
    new_capacity: number,
    new_len: number,
  ): void;

  // buffer addressing
  sample_buf_l(engine: Pointer): Pointer;
  sample_buf_r(engine: Pointer): Pointer;
  output_buf_l(engine: Pointer): Pointer;
  output_buf_r(engine: Pointer): Pointer;
  playhead_buf(engine: Pointer, idx: number): Pointer;

  // audio callback
  process(engine: Pointer): void;

  // engine parameters
  set_bpm(engine: Pointer, bpm: number): void;

  // voice parameters
  set_note_event(engine: Pointer, note_event: number): void;
  set_adsr(
    engine: Pointer,
    attack_ms: number,
    decay_ms: number,
    sustain: number,
    release_ms: number,
  ): void;

  // stream parameters
  set_stream_enabled(engine: Pointer, stream_id: number, enabled: number): void;
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
}
