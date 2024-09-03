import { ConsoleLogger } from "../lib/ConsoleLogger";
import { serve } from "../lib/messaging";
import { Engine } from "./engine";
import { type Params } from "./engine/Params";
import { type GranularWorkletNodeOptions } from "./GranularNode";
import { ReqType, Response, RspType, type Request } from "./message";

/**
 * The `AudioWorkletProcessor` responsible for ultimately filling output buffers
 * within the audio thread callback. This component delegates to the WASM
 * instance by way of the {@linkcode Engine}.
 */
class GranularProcessor extends AudioWorkletProcessor {
  private readonly engine: Engine;
  private readonly log = new ConsoleLogger(GranularProcessor.name);

  constructor(options: GranularWorkletNodeOptions) {
    super();

    this.engine = new Engine(options.processorOptions.granularModule, {
      sampleRate,
      outputBufCapacity: 2048,
      outputBufLen: 128,
    });

    serve(this.port, this.handleRequest.bind(this));

    this.log.debug("initialized processor", { sampleRate });
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
    params: Params,
  ): boolean {
    this.engine.setParams(params);

    const output = outputs[0];
    const samples = output[0].length;
    const engineOutput = this.engine.process(samples);

    output[0].set(engineOutput[0]);
    output[1].set(engineOutput[1]);

    return true;
  }

  async handleRequest(req: Request): Promise<Response> {
    switch (req.type) {
      case ReqType.UpdateSample:
        this.engine.updateSample(req.sample);
        return { type: RspType.SampleUpdated };
      case ReqType.AddStream: {
        return {
          type: RspType.StreamAdded,
          streamId: this.engine.addStream(req.params),
        };
      }
    }
  }
}

registerProcessor("GranularProcessor", GranularProcessor);
