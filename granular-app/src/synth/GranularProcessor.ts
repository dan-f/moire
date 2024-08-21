import { GranularEngine } from "./GranularEngine";
import { type GranularWorkletNodeOptions } from "./GranularNode";
import { type SynthMessage } from "./SynthMessage";

class GranularProcessor extends AudioWorkletProcessor {
  private readonly engine: GranularEngine;

  constructor(options: GranularWorkletNodeOptions) {
    super();
    this.engine = new GranularEngine(options.processorOptions.granularModule, {
      sampleRate,
      outputBufCapacity: 2048,
      outputBufLen: 128,
    });

    this.port.onmessage = (event: MessageEvent<SynthMessage>) => {
      this.handleMessage(event.data);
    };
  }

  process(
    _inputs: Float32Array[][],
    outputs: Float32Array[][],
    _parameters: Record<string, Float32Array>,
  ): boolean {
    const output = outputs[0];
    const samples = output[0].length;
    const engineOutput = this.engine.process(samples);
    for (let channel = 0; channel < output.length; channel++) {
      for (let sample = 0; sample < samples; sample++) {
        output[channel][sample] = engineOutput[channel][sample];
      }
    }
    return true;
  }

  handleMessage(msg: SynthMessage) {
    console.log("[GranularProcessor] received event", msg);
  }
}

registerProcessor("GranularProcessor", GranularProcessor);
