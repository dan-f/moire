import { Client } from "../../lib/messaging";
import { Config } from "./Config";
import { EngineWasmUrl } from "./engine";
import granularProcessorUrl from "./GranularProcessor?worker&url";
import { type Request, type Response } from "./message";
import * as PP from "./ProcessorParam";
import * as StreamParams from "./StreamParams";

/**
 * Top-level WebAudio `AudioNode` subtype for constructing a granular synth.
 *
 * - Inputs: None
 * - Outputs:
 *   0. stereo audio out
 *   1. {@linkcode Config.NumStreams}-channel signal of per-stream playhead
 *      positions, where each channel contains playhead positions for an
 *      individual stream. A sample value < 0 indicates the stream is not
 *      playing, while a value > 0 indicates the normalized position (0 = start,
 *      1 = end) of the playhead over the sample buffer.
 */
export class GranularNode extends AudioWorkletNode {
  private readonly client = new Client(this.port);

  private constructor(ctx: AudioContext, engineModule: WebAssembly.Module) {
    super(ctx, "GranularProcessor", {
      numberOfInputs: 0,
      numberOfOutputs: 2,
      outputChannelCount: [2, Config.NumStreams],
      processorOptions: { granularModule: engineModule },
    });
  }

  static async new(ctx: AudioContext): Promise<GranularNode> {
    const [engineModule] = await Promise.all([
      WebAssembly.compileStreaming(fetch(EngineWasmUrl)),
      ctx.audioWorklet.addModule(granularProcessorUrl),
    ]);
    return new GranularNode(ctx, engineModule);
  }

  get bpm(): AudioParam {
    return this.parameters.get("bpm")!;
  }

  streamParam(
    streamId: number,
    param: StreamParams.Key,
  ): AudioParam | undefined {
    return this.parameters.get(PP.packStreamParam(streamId, param));
  }

  request<Req extends Request, Rsp extends Response>(
    request: Req,
  ): Promise<Rsp> {
    return this.client.request<Req, Rsp>(request);
  }
}

export interface GranularWorkletNodeOptions extends AudioWorkletNodeOptions {
  processorOptions: { granularModule: WebAssembly.Module };
}
