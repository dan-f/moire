import { EngineExports, Pointer } from "./EngineExports";

/**
 * Wrapper class providing ergonomic access to an instance of the WASM granular
 * engine.
 */
export class GranularEngine {
  private readonly instance: WebAssembly.Instance;
  private readonly synth: Pointer;

  private outputBuffer!: Float32Array;
  private outputBufCapacity: number;
  private outputBufLen: number;

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
    this.synth = this.engine.new_synth(
      sampleRate,
      this.outputBufCapacity,
      this.outputBufLen,
    );

    this.redrawBufferViews();
  }

  process(samples: number): Float32Array {
    // Based on the way the WASM memory model works, we cannot simply pass a
    // pointer to the WebAudio-provided `outputs` buffers from the
    // `AudioWorkletProcessor.process()` callback, which would have been
    // convenient for us, since we wouldn't have to allocate anything at
    // runtime, at least from within code we control.
    //
    // Instead, we're stuck allocating and potentiall growing buffers within the
    // WASM instance's memory, i.e. if we get called back with a `x >
    // 128`-length buffer to fill.
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
      this.engine.alloc_output_buf(
        this.synth,
        this.outputBufCapacity,
        this.outputBufLen,
      );
      this.redrawBufferViews();
    }

    this.engine.process(this.synth);

    return this.outputBuffer;
  }

  updateSample(sample: Float32Array[]) {
    const bufLen = sample[0].length;
    this.engine.alloc_sample_buf(this.synth, bufLen);
    // If our allocation causes the WASM memory to grow, we will have to re-draw
    // our views over its memory buffer. The WASM memory model guarantees that
    // our pointers are still accurate relative to the buffer, but the buffer
    // may itself have moved.
    this.redrawBufferViews();
    const buffer = new Float32Array(
      this.engine.memory.buffer,
      this.engine.sample_buf(this.synth),
      bufLen * 2,
    );
    switch (sample.length) {
      case 1:
        for (let i = 0; i < bufLen; i++) {
          // TODO -6db
          buffer[i * 2] = sample[0][i];
          buffer[i * 2 + 1] = sample[0][i];
        }
        break;
      case 2:
        for (let i = 0; i < bufLen; i++) {
          buffer[i * 2] = sample[0][i];
          buffer[i * 2 + 1] = sample[1][i];
        }
        break;
      default:
        throw new Error(
          `Expected mono or stereo sample. Cannot use ${sample.length}-channel sample`,
        );
    }
  }

  private get engine(): EngineExports {
    return this.instance.exports as EngineExports;
  }

  private redrawBufferViews() {
    this.outputBuffer = new Float32Array(
      this.engine.memory.buffer,
      this.engine.output_buf(this.synth),
      this.outputBufLen * 2,
    );
  }
}
