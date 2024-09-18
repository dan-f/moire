import { ConsoleLogger } from "../../../lib/ConsoleLogger";
import { repeat } from "../../../lib/iter";
import { type Logger } from "../../../lib/Logger";
import * as Buffer from "../../Buffer";
import { Config } from "../Config";
import * as PP from "../ProcessorParam";
import * as StreamParams from "../StreamParams";
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

  private audioBufLen: number;
  private audioBufCapacity: number;
  private audioBuffer: Buffer.T = Buffer.create(2);
  private playheadBuffers: Buffer.T[] = Array.from(
    repeat(Config.NumStreams, () => Buffer.create(1)),
  );

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

    this.audioBufCapacity = options.outputBufCapacity;
    this.audioBufLen = options.outputBufLen;
    this.engine = this.instance.exports.new_engine(
      sampleRate,
      this.audioBufLen,
      this.audioBufCapacity,
      options.maxStreams,
    );

    this.log = new ConsoleLogger(Engine.name);

    this.createBufferViews();
  }

  setParams(params: PP.ProcessorParams) {
    const { bpm, ...streamParams } = params;
    this.instance.exports.set_bpm(this.engine, bpm[0]);

    for (const [streamParam, [val]] of Object.entries(streamParams)) {
      const result = PP.unpackStreamParam(streamParam as PP.StreamParam);
      if (!result) {
        this.log.warn("unable to parse StreamParam", { streamParam });
        continue;
      }
      const [streamId, param] = result;
      switch (param) {
        case "gate":
          this.instance.exports.set_stream_gate(this.engine, streamId, val);
          break;
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

  process(samples: number): Buffer.T[] {
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
    if (samples > this.audioBufCapacity) {
      this.audioBufLen = samples;
      this.audioBufCapacity = Math.ceil(this.audioBufLen / 1024) * 1024;
      this.instance.exports.alloc_output_bufs(
        this.engine,
        this.audioBufCapacity,
        this.audioBufLen,
      );
      this.createBufferViews();
    }

    this.instance.exports.process(this.engine);

    return [this.audioBuffer, ...this.playheadBuffers];
  }

  updateSample(sample: Buffer.T) {
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

  addStream(stream: StreamParams.T): number | undefined {
    const id = this.instance.exports.add_stream(
      this.engine,
      stream.subdivision,
      stream.grainStart,
      stream.grainSizeMs,
      stream.gain,
      stream.tune,
      stream.pan,
      stream.env,
    );

    return id >= 0 ? id : undefined;
  }

  deleteStream(streamId: number) {
    this.instance.exports.delete_stream(this.engine, streamId);
  }

  private createBufferViews() {
    this.log.debug("(re)creating buffer views");

    this.audioBuffer[0] = this.channelView(
      this.instance.exports.output_buf_l(this.engine),
      this.audioBufLen,
    );
    this.audioBuffer[1] = this.channelView(
      this.instance.exports.output_buf_r(this.engine),
      this.audioBufLen,
    );

    for (let i = 0; i < Config.NumStreams; i++) {
      this.playheadBuffers[i][0] = this.channelView(
        this.instance.exports.playhead_buf(this.engine, i),
        this.audioBufLen,
      );
    }
  }

  private channelView(ptr: Pointer, len: number): Float32Array {
    return new Float32Array(this.instance.exports.memory.buffer, ptr, len);
  }
}
