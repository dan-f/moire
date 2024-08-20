import { type SynthMessage } from "./SynthMessage";

// import * as engine from "granular-engine";

class GranularProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.port.onmessage = (event: MessageEvent<SynthMessage>) => {
      console.log("[GranularProcessor] received event", event.data);
    };
    // engine.greet();
  }

  process(
    _inputs: Float32Array[][],
    _outputs: Float32Array[][],
    _parameters: Record<string, Float32Array>,
  ): boolean {
    return true;
  }
}

registerProcessor("GranularProcessor", GranularProcessor);
