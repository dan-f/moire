import { ConsoleLogger } from "../lib/ConsoleLogger";
import { Logger } from "../lib/Logger";
import { EngineExports, Pointer } from "./EngineExports";
import { EngineParams } from "./EngineParams";

/**
 * Wrapper class providing safe access to an instance of the WASM granular
 * engine.
 */
export class GranularEngine {
  private readonly instance: WebAssembly.Instance;
  private readonly engine: Pointer;
  private readonly log: Logger;

  private outputBufLen: number;
  private outputBufCapacity: number;
  private outputBuffer: Float32Array[] = [
    new Float32Array(),
    new Float32Array(),
  ];

  constructor(
    module: WebAssembly.Module,
    options: {
      sampleRate: number;
      outputBufCapacity: number;
      outputBufLen: number;
    },
  ) {
    this.instance = new WebAssembly.Instance(module, {});

    this.outputBufCapacity = options.outputBufCapacity;
    this.outputBufLen = options.outputBufLen;
    this.engine = this.imports.new_engine(
      sampleRate,
      this.outputBufLen,
      this.outputBufCapacity,
    );

    this.log = new ConsoleLogger(GranularEngine.name);

    this.createBufferViews();
  }

  setParams(params: EngineParams) {
    const { bpm } = params;
    this.imports.set_bpm(this.engine, bpm[0]);
  }

  process(samples: number): Float32Array[] {
    // Based on the way the WASM memory model works, we cannot simply pass a
    // pointer to the WebAudio-provided `outputs` buffers from the
    // `AudioWorkletProcessor.process()` callback, which would have been
    // convenient for us, since we wouldn't have to allocate anything at
    // runtime, at least from within code we control.
    //
    // Instead, we're stuck allocating and potentiall growing buffers within the
    // WASM instance's memory, i.e. if we get called back with a `x >
    // 128`-length buffer to fill (which is unlikely to happen, but Web Audio
    // claims they will build this out eventually).
    //
    // We have a couple mitigations. First, WASM instances are created with a
    // pre-allocated block of growable linear memory, meaning that in the event
    // of a small-enough buffer allocation, the WASM runtime won't be
    // `malloc`ing anything, but rather just moving pointers around. When the
    // WASM runtime needs to actually grow its linear memory, allocations are
    // done in 64 KiB pages. I've never seen an audio buffer size larger than
    // 8192 f32s, so it's unlikely we'll ever require a real heap allocation
    // more than once.
    //
    // When we do resize a buffer, we allocate a capacity that's roughly 2x the
    // buffer size we see, KiB-aligned, in the event that we resize again.
    if (samples > this.outputBufCapacity) {
      this.outputBufLen = samples;
      this.outputBufCapacity = Math.ceil(this.outputBufLen / 1024) * 1024;
      this.imports.alloc_output_buf(
        this.engine,
        this.outputBufCapacity,
        this.outputBufLen,
      );
      this.createBufferViews();
    }

    this.imports.process(this.engine);

    return this.outputBuffer;
  }

  updateSample(sample: Float32Array[]) {
    this.log.debug("allocating sample buffer");
    const bufLen = sample[0].length;
    this.imports.alloc_sample_buf(this.engine, bufLen);
    // If our allocation causes the WASM memory to grow, we will have to re-draw
    // our views over its memory buffer. The WASM memory model guarantees that
    // our pointers are still accurate relative to the buffer, but the buffer
    // may itself have moved.
    this.createBufferViews();
    const buf = [
      this.channelView(this.imports.sample_buf_l(this.engine), bufLen),
      this.channelView(this.imports.sample_buf_r(this.engine), bufLen),
    ];
    switch (sample.length) {
      case 1:
        for (let i = 0; i < bufLen; i++) {
          // TODO -6db
          buf[0][i] = sample[0][i];
          buf[1][i] = sample[0][i];
        }
        break;
      case 2:
        for (let i = 0; i < bufLen; i++) {
          buf[0][i] = sample[0][i];
          buf[1][i] = sample[1][i];
        }
        break;
      default:
        throw new Error(
          `Expected mono or stereo sample. Cannot use ${sample.length}-channel sample`,
        );
    }
  }

  private get imports(): EngineExports {
    return this.instance.exports as EngineExports;
  }

  private createBufferViews() {
    this.log.debug("(re)creating buffer views");
    this.outputBuffer[0] = this.channelView(
      this.imports.output_buf_l(this.engine),
      this.outputBufLen,
    );
    this.outputBuffer[1] = this.channelView(
      this.imports.output_buf_r(this.engine),
      this.outputBufLen,
    );
  }

  private channelView(ptr: Pointer, len: number): Float32Array {
    return new Float32Array(this.imports.memory.buffer, ptr, len);
  }
}
