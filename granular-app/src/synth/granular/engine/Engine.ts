import * as Buf from "../../../lib/Buffer";
import { DefaultLogger } from "../../../lib/DefaultLogger";
import { type Logger } from "../../../lib/Logger";
import { Config } from "../Config";
import {
  StreamParamKey,
  unpackStreamParam,
  type GranularParams,
} from "../param";
import { type Pointer } from "./Exports";
import { Instance } from "./Instance";

/**
 * Wrapper class providing safe access to an instance of the WASM granular
 * engine
 */
export class Engine {
  private readonly instance: Instance;
  private readonly engine: Pointer;
  private readonly outputBuf: Pointer;
  private outputBufView: Buf.Buffer = Buf.create(2);
  private readonly playheadsBuf: Pointer;
  private playheadsBufView: Buf.Buffer = Buf.create(Config.NumStreams);
  private sampleBuf?: Pointer;
  private readonly log: Logger;

  private audioBufLen: number;
  private audioBufCapacity: number;

  constructor(
    module: WebAssembly.Module,
    options: {
      sampleRate: number;
      outputBufCapacity: number;
      outputBufLen: number;
    },
  ) {
    this.log = new DefaultLogger(Engine.name);

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
    );
    this.outputBuf = this.instance.exports.new_buffer(
      2,
      this.audioBufLen,
      this.audioBufCapacity,
    );
    this.playheadsBuf = this.instance.exports.new_buffer(
      Config.NumStreams,
      this.audioBufLen,
      this.audioBufCapacity,
    );

    this.createBufferViews();
  }

  setParams(params: GranularParams) {
    const {
      bpm,
      note_event,
      attack,
      decay,
      sustain,
      release,
      ...streamParams
    } = params;
    this.instance.exports.set_bpm(this.engine, bpm[0]);
    this.instance.exports.apply_note_event(this.engine, note_event[0]);
    this.instance.exports.set_adsr(
      this.engine,
      attack[0],
      decay[0],
      sustain[0],
      release[0],
    );

    for (const [streamParam, [val]] of Object.entries(streamParams)) {
      const result = unpackStreamParam(streamParam as StreamParamKey);
      if (!result) {
        this.log.warn("unable to parse StreamParam", { streamParam });
        continue;
      }
      const [streamId, param] = result;
      switch (param) {
        case "enabled":
          this.instance.exports.set_stream_enabled(this.engine, streamId, val);
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
        case "grainProbability":
          this.instance.exports.set_stream_grain_probability(
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

  process(): [Buf.Buffer, Buf.Buffer] {
    if (typeof this.sampleBuf !== "undefined") {
      this.instance.exports.process(
        this.engine,
        this.sampleBuf,
        this.outputBuf,
        this.playheadsBuf,
      );
    }

    return [this.outputBufView, this.playheadsBufView];
  }

  updateSample(sample: Buf.Buffer) {
    this.log.info("allocating sample buffer");
    const bufLen = Buf.length(sample);
    if (typeof this.sampleBuf === "undefined") {
      this.sampleBuf = this.instance.exports.new_buffer(2, bufLen, bufLen);
    } else {
      this.instance.exports.resize_buffer(this.sampleBuf, bufLen, bufLen);
    }

    // If our allocation causes the WASM memory to grow, we will have to re-draw
    // our views over its memory buffer. The WASM memory model guarantees that
    // our pointers are still accurate relative to the buffer, but the buffer
    // may itself have moved.
    this.createBufferViews();
    const destBufView = [
      this.channelView(
        this.instance.exports.buffer_channel(this.sampleBuf, 0),
        bufLen,
      ),
      this.channelView(
        this.instance.exports.buffer_channel(this.sampleBuf, 1),
        bufLen,
      ),
    ];
    Buf.copyStereo(sample, destBufView);
    this.instance.exports.reset_after_update_sample(this.engine);
  }

  // Based on the way the WASM memory model works, we cannot simply pass a
  // pointer to the WebAudio-provided `outputs` buffers from the
  // `AudioWorkletProcessor.process()` callback, which would have been
  // convenient for us, since we wouldn't have to allocate anything at
  // runtime, at least from within code we control.
  //
  // Instead, we're stuck allocating and potentially growing buffers within
  // the WASM instance's memory, i.e. if we get called back with a `x >
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
  checkResizeProcessingBuffers(bufLen: number) {
    if (bufLen <= this.audioBufCapacity) {
      return;
    }

    this.audioBufLen = bufLen;
    this.audioBufCapacity = Math.ceil(this.audioBufLen / 1024) * 1024;
    this.instance.exports.resize_buffer(
      this.outputBuf,
      this.audioBufCapacity,
      this.audioBufLen,
    );
    this.instance.exports.resize_buffer(
      this.playheadsBuf,
      this.audioBufCapacity,
      this.audioBufLen,
    );

    this.createBufferViews();
  }

  private createBufferViews() {
    this.log.info("(re)creating buffer views");

    this.outputBufView[0] = this.channelView(
      this.instance.exports.buffer_channel(this.outputBuf, 0),
      this.audioBufLen,
    );
    this.outputBufView[1] = this.channelView(
      this.instance.exports.buffer_channel(this.outputBuf, 1),
      this.audioBufLen,
    );

    for (let i = 0; i < Config.NumStreams; i++) {
      this.playheadsBufView[i] = this.channelView(
        this.instance.exports.buffer_channel(this.playheadsBuf, i),
        this.audioBufLen,
      );
    }
  }

  private channelView(ptr: Pointer, len: number): Float32Array {
    return new Float32Array(this.instance.exports.memory.buffer, ptr, len);
  }
}
