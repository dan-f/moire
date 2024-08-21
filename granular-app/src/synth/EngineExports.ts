export type Pointer = number;

export interface EngineExports extends WebAssembly.Exports {
  memory: WebAssembly.Memory;

  new_synth(
    sample_rate: number,
    output_buf_capacity: number,
    output_buf_len: number,
  ): Pointer;

  output_channel(synth: Pointer, channel: number): Pointer;

  resize_output_buf(
    synth: Pointer,
    new_capacity: number,
    new_len: number,
  ): void;

  process(synth: Pointer): void;
}
