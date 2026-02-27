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
    this.dt = dt(DefaultFrequency);
    this.val = random();
  }

  static get parameterDescriptors(): AudioParamDescriptor[] {
    return [
      {
        name: "frequency",
        automationRate: "k-rate",
        defaultValue: DefaultFrequency,
        minValue: 0,
        maxValue: 20,
      },
    ];
  }

  process(
    _inputs: Buf.Buffer[],
    outputs: Buf.Buffer[],
    params: { frequency: Float32Array },
  ): boolean {
    this.dt = dt(params.frequency[0]);

    const channel = outputs[0][0];
    for (let i = 0; i < channel.length; i++) {
      this.t += this.dt;
      if (this.t >= 1) {
        this.val = random();
        this.t -= 1;
      }
      channel[i] = this.val;
    }

    return true;
  }
}

function random(): number {
  return Math.random() * 2 - 1;
}

function dt(frequency: number): number {
  return frequency / sampleRate;
}

const DefaultFrequency = 4;

registerProcessor("RandomProcessor", RandomProcessor);
