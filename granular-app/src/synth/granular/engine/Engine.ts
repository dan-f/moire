import { ConsoleLogger } from "../../../lib/ConsoleLogger";
import { type Logger } from "../../../lib/Logger";
import * as Buffer from "../../Buffer";
import {
  fromProcessorParam,
  type ProcessorParams,
  type StreamParam,
  type StreamParams,
} from "../params";
import { type Pointer } from "./Exports";
import { Instance } from "./Instance";

/**
 * Wrapper class providing safe access to an instance of the WASM granular
 * engine
 */
export class Engine {
  private readonly instance: Instance;
  private readonly engine: Pointer;
  private readonly log: Logger;

  private outputBufLen: number;
  private outputBufCapacity: number;
  private outputBuffer: Buffer.T = [new Float32Array(), new Float32Array()];

  constructor(
    module: WebAssembly.Module,
    options: {
      sampleRate: number;
      outputBufCapacity: number;
      outputBufLen: number;
      maxStreams: number;
    },
  ) {
    this.instance = new Instance(module, {
      Math: {
        random: Math.random,
      },
    });

    this.outputBufCapacity = options.outputBufCapacity;
    this.outputBufLen = options.outputBufLen;
    this.engine = this.instance.exports.new_engine(
      sampleRate,
      this.outputBufLen,
      this.outputBufCapacity,
      options.maxStreams,
    );

    this.log = new ConsoleLogger(Engine.name);

    this.createBufferViews();
  }

  setParams(params: ProcessorParams) {
    const { bpm, ...streamParams } = params;
    this.instance.exports.set_bpm(this.engine, bpm[0]);

    for (const [streamParam, [val]] of Object.entries(streamParams)) {
      const result = fromProcessorParam(streamParam as StreamParam);
      if (!result) {
        this.log.warn("unable to parse StreamParam", { streamParam });
        continue;
      }
      const [streamId, param] = result;
      switch (param) {
        case "subdivision":
          this.instance.exports.set_stream_subdivision(
            this.engine,
            streamId,
            val,
          );
          break;
        case "grainStart":
          this.instance.exports.set_stream_grain_start(
            this.engine,
            streamId,
            val,
          );
          break;
        case "grainSizeMs":
          this.instance.exports.set_stream_grain_size_ms(
            this.engine,
            streamId,
            val,
          );
          break;
        case "gain":
          this.instance.exports.set_stream_gain(this.engine, streamId, val);
          break;
        case "tune":
          this.instance.exports.set_stream_tune(this.engine, streamId, val);
          break;
        case "pan":
          this.instance.exports.set_stream_pan(this.engine, streamId, val);
          break;
        case "env":
          this.instance.exports.set_stream_env(this.engine, streamId, val);
          break;
        default:
          this.log.warn(`unexpected param type ${param}`);
          break;
      }
    }
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
      this.instance.exports.alloc_output_buf(
        this.engine,
        this.outputBufCapacity,
        this.outputBufLen,
      );
      this.createBufferViews();
    }

    this.instance.exports.process(this.engine);

    return this.outputBuffer;
  }

  updateSample(sample: Float32Array[]) {
    this.log.debug("allocating sample buffer");
    const bufLen = Buffer.length(sample);
    this.instance.exports.alloc_sample_buf(this.engine, bufLen);
    // If our allocation causes the WASM memory to grow, we will have to re-draw
    // our views over its memory buffer. The WASM memory model guarantees that
    // our pointers are still accurate relative to the buffer, but the buffer
    // may itself have moved.
    this.createBufferViews();
    const buf = [
      this.channelView(this.instance.exports.sample_buf_l(this.engine), bufLen),
      this.channelView(this.instance.exports.sample_buf_r(this.engine), bufLen),
    ];
    Buffer.copyStereo(sample, buf);
    this.instance.exports.reset_after_update_sample(this.engine);
  }

  addStream(params: StreamParams): number | undefined {
    const id = this.instance.exports.add_stream(
      this.engine,
      params.subdivision,
      params.grainStart,
      params.grainSizeMs,
      params.gain,
      params.tune,
      params.pan,
      params.env,
    );

    return id >= 0 ? id : undefined;
  }

  deleteStream(streamId: number) {
    this.instance.exports.delete_stream(this.engine, streamId);
  }

  private createBufferViews() {
    this.log.debug("(re)creating buffer views");
    this.outputBuffer[0] = this.channelView(
      this.instance.exports.output_buf_l(this.engine),
      this.outputBufLen,
    );
    this.outputBuffer[1] = this.channelView(
      this.instance.exports.output_buf_r(this.engine),
      this.outputBufLen,
    );
  }

  private channelView(ptr: Pointer, len: number): Float32Array {
    return new Float32Array(this.instance.exports.memory.buffer, ptr, len);
  }
}
