import * as Buf from "../lib/Buffer";
import { AudioParamDescriptor } from "./param";

/**
 * Custom oscillator for random sample-and-hold values
 */
class RandomProcessor extends AudioWorkletProcessor {
  t: number;
  dt: number;
  val: number;

  constructor(_: AudioWorkletNodeOptions) {
    super();
    this.t = 0;
    this.dt = sampleRate / DefaultFrequency;
    this.val = random();
  }

  static get parameterDescriptors(): AudioParamDescriptor[] {
    return [
      {
        name: "frequency",
        automationRate: "k-rate",
        defaultValue: DefaultFrequency,
        minValue: 1,
        maxValue: 20,
      },
    ];
  }

  process(
    _inputs: Buf.Buffer[],
    outputs: Buf.Buffer[],
    params: { frequency: Float32Array },
  ): boolean {
    this.dt = sampleRate / params.frequency[0];

    const channel = outputs[0][0];
    for (let i = 0; i < channel.length; i++) {
      const prvT = this.t;
      this.t = (this.t + this.dt) % 1;
      if (this.t < prvT) {
        this.val = random();
      }
      channel[i] = this.val;
    }

    return true;
  }
}

function random(): number {
  return Math.random() * 2 - 1;
}

const DefaultFrequency = 4;

registerProcessor(RandomProcessor.name, RandomProcessor);
