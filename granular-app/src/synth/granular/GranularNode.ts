import { Client } from "../../lib/messaging";
import { EngineWasmUrl } from "./engine";
import granularProcessorUrl from "./GranularProcessor?worker&url";
import { type Request, type Response } from "./message";

/**
 * Top-level WebAudio `AudioNode` subtype for constructing a granular synth.
 */
export class GranularNode extends AudioWorkletNode {
  private readonly client = new Client(this.port);

  private constructor(ctx: AudioContext, engineModule: WebAssembly.Module) {
    super(ctx, "GranularProcessor", {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [2],
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

  request<Req extends Request, Rsp extends Response>(
    request: Req,
  ): Promise<Rsp> {
    return this.client.request<Req, Rsp>(request);
  }
}

export interface GranularWorkletNodeOptions extends AudioWorkletNodeOptions {
  processorOptions: { granularModule: WebAssembly.Module };
}
