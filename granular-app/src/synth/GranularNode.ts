import engineWasmUrl from "./engine/granular_engine.wasm?url";
import { Message } from "./GranularMessage";
import granularProcessorUrl from "./GranularProcessor?worker&url";

/**
 * Top-level WebAudio `AudioNode` subtype for constructing a granular synth.
 */
export class GranularNode extends AudioWorkletNode {
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
      WebAssembly.compileStreaming(fetch(engineWasmUrl)),
      ctx.audioWorklet.addModule(granularProcessorUrl),
    ]);
    return new GranularNode(ctx, engineModule);
  }

  get bpm(): AudioParam {
    return this.parameters.get("bpm")!;
  }

  send(message: Message) {
    this.port.postMessage(message);
  }
}

export interface GranularWorkletNodeOptions extends AudioWorkletNodeOptions {
  processorOptions: { granularModule: WebAssembly.Module };
}
