import { EngineExports, Pointer } from "./EngineExports";

export class GranularEngine {
  private readonly instance: WebAssembly.Instance;
  private readonly synth: Pointer;

  private outputBufCapacity: number;
  private outputBufLen: number;

  private outputChannels: Float32Array[] = [
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
    this.outputBufCapacity = options.outputBufCapacity;
    this.outputBufLen = options.outputBufLen;

    this.instance = new WebAssembly.Instance(module, {});
    console.log("Granular engine is exporting:", this.engine);

    this.synth = this.engine.new_synth(
      sampleRate,
      this.outputBufCapacity,
      this.outputBufLen,
    );
    console.log("Instantiated `Synth`:", this.synth);

    this.assignOutputChannels();
    console.log("Got output channels:", this.outputChannels);
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
      this.outputBufCapacity = Math.ceil((this.outputBufLen * 2) / 1024) * 1024;
      this.engine.resize_output_buf(
        this.synth,
        this.outputBufCapacity,
        this.outputBufLen,
      );
      this.assignOutputChannels();
    }

    this.engine.process(this.synth);

    return this.outputChannels;
  }

  private get engine(): EngineExports {
    return this.instance.exports as EngineExports;
  }

  private assignOutputChannels() {
    for (let channel = 0; channel < this.outputChannels.length; channel++) {
      this.outputChannels[channel] = new Float32Array(
        this.engine.memory.buffer,
        this.engine.output_channel(this.synth, channel),
        this.outputBufLen,
      );
    }
  }
}
