import { ConsoleLogger } from "../lib/ConsoleLogger";
import { Logger } from "../lib/Logger";
import { EngineParams } from "./EngineParams";
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
  private readonly log: Logger;

  constructor(options: GranularWorkletNodeOptions) {
    super();

    this.engine = new GranularEngine(options.processorOptions.granularModule, {
      sampleRate,
      outputBufCapacity: 2048,
      outputBufLen: 128,
    });

    this.log = new ConsoleLogger(GranularProcessor.name);

    this.port.onmessage = (event: MessageEvent<Message>) => {
      this.handleMessage(event.data);
    };
  }

  static get parameterDescriptors() {
    return [
      {
        name: "bpm",
        automationRate: "k-rate",
        defaultValue: 120,
        minValue: 40,
        maxValue: 300,
      },
    ];
  }

  process(
    _inputs: Float32Array[][],
    outputs: Float32Array[][],
    params: EngineParams,
  ): boolean {
    this.engine.setParams(params);

    const output = outputs[0];
    const samples = output[0].length;
    const engineOutput = this.engine.process(samples);

    output[0].set(engineOutput[0]);
    output[1].set(engineOutput[1]);

    return true;
  }

  handleMessage(msg: Message) {
    this.log.debug("received message", msg);
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
