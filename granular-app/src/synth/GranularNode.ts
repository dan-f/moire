import granularWasmUrl from "../assets/granular_engine.wasm?url";
import { Message } from "./GranularMessage";
import granularProcessorUrl from "./GranularProcessor?worker&url";

/**
 * Top-level WebAudio `AudioNode` subtype for constructing a granular synth.
 */
export class GranularNode extends AudioWorkletNode {
  private constructor(ctx: AudioContext) {
    super(ctx, "GranularProcessor", {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [2],
      processorOptions: { granularModule },
    });
  }

  static async new(ctx: AudioContext): Promise<GranularNode> {
    await ctx.audioWorklet.addModule(granularProcessorUrl);
    return new GranularNode(ctx);
  }

  send(message: Message) {
    this.port.postMessage(message);
  }
}

export interface GranularWorkletNodeOptions extends AudioWorkletNodeOptions {
  processorOptions: { granularModule: WebAssembly.Module };
}

const granularModule = await WebAssembly.compileStreaming(
  fetch(granularWasmUrl),
);
