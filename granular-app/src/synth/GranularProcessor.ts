import { GranularEngine } from "./GranularEngine";
import { MessageType, type Message } from "./GranularMessage";
import { type GranularWorkletNodeOptions } from "./GranularNode";

/**
 * The `AudioWorkletProcessor` responsible for ultimately filling output buffers
 * within the audio thread callback. This component delegates to the WASM
 * instance by way of the {@linkcode GranularEngine}.
 */
class GranularProcessor extends AudioWorkletProcessor {
  private readonly engine: GranularEngine;

  constructor(options: GranularWorkletNodeOptions) {
    super();

    this.engine = new GranularEngine(options.processorOptions.granularModule, {
      sampleRate,
      outputBufCapacity: 2048,
      outputBufLen: 128,
    });

    this.port.onmessage = (event: MessageEvent<Message>) => {
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

    for (let i = 0; i < samples; i++) {
      output[0][i] = engineOutput[i * 2];
      output[1][i] = engineOutput[i * 2 + 1];
    }

    return true;
  }

  handleMessage(msg: Message) {
    console.log("[GranularProcessor] received event", msg);
    switch (msg.type) {
      case MessageType.UpdateSample:
        this.handleUpdateSample(msg.sample);
        break;
    }
  }

  handleUpdateSample(sample: Float32Array[]) {
    this.engine.updateSample(sample);
  }
}

registerProcessor("GranularProcessor", GranularProcessor);
