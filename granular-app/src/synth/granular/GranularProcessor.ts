import { ConsoleLogger } from "../../lib/ConsoleLogger";
import { serve } from "../../lib/messaging";
import { Engine } from "./engine";
import { MAX_ENV, MIN_ENV } from "./Env";
import { type GranularWorkletNodeOptions } from "./GranularNode";
import { ReqType, Response, RspType, type Request } from "./message";
import { StreamParams, toProcessorParam, type ProcessorParams } from "./params";

/**
 * The `AudioWorkletProcessor` responsible for ultimately filling output buffers
 * within the audio thread callback. This component delegates to the WASM
 * instance by way of the {@linkcode Engine}.
 */
class GranularProcessor extends AudioWorkletProcessor {
  private static readonly MAX_STREAMS = 10;
  private readonly engine: Engine;
  private readonly log = new ConsoleLogger(GranularProcessor.name);

  constructor(options: GranularWorkletNodeOptions) {
    super();

    this.engine = new Engine(options.processorOptions.granularModule, {
      sampleRate,
      outputBufCapacity: 2048,
      outputBufLen: 128,
      maxStreams: GranularProcessor.MAX_STREAMS,
    });

    serve(this.port, this.handleRequest.bind(this));

    this.log.debug("initialized processor", { sampleRate });
  }

  static get parameterDescriptors(): ParamDescriptor[] {
    return [
      {
        name: "bpm",
        automationRate: "k-rate",
        defaultValue: 120,
        minValue: 40,
        maxValue: 300,
      },
      ...GranularProcessor.allStreamParamDescriptors(),
    ];
  }

  process(
    _inputs: Float32Array[][],
    outputs: Float32Array[][],
    params: ProcessorParams,
  ): boolean {
    this.engine.setParams(params);

    const output = outputs[0];
    const samples = output[0].length;
    const engineOutput = this.engine.process(samples);

    output[0].set(engineOutput[0]);
    output[1].set(engineOutput[1]);

    return true;
  }

  private async handleRequest(req: Request): Promise<Response> {
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
      case ReqType.DeleteStream:
        this.engine.deleteStream(req.streamId);
        return { type: RspType.StreamDeleted };
    }
  }

  private static allStreamParamDescriptors(): ParamDescriptor[] {
    return Array.from(Array(GranularProcessor.MAX_STREAMS).keys()).flatMap(
      GranularProcessor.perStreamParamDescriptors,
    );
  }

  private static perStreamParamDescriptors(
    streamId: number,
  ): ParamDescriptor[] {
    const name = (label: keyof StreamParams) =>
      toProcessorParam(streamId, label);
    return [
      {
        name: name("subdivision"),
        automationRate: "k-rate",
        defaultValue: 1,
        minValue: 1,
        maxValue: 100,
      },
      {
        name: name("grainStart"),
        automationRate: "k-rate",
        defaultValue: 0,
        minValue: 0,
        maxValue: 1,
      },
      {
        name: name("grainSizeMs"),
        automationRate: "k-rate",
        defaultValue: 150,
        minValue: 10,
        maxValue: 500,
      },
      {
        name: name("gain"),
        automationRate: "k-rate",
        defaultValue: 1,
        minValue: 0,
        maxValue: 1,
      },
      {
        name: name("tune"),
        automationRate: "k-rate",
        defaultValue: 0,
        minValue: -24,
        maxValue: 24,
      },
      {
        name: name("pan"),
        automationRate: "k-rate",
        defaultValue: 0.5,
        minValue: 0,
        maxValue: 1,
      },
      {
        name: name("env"),
        automationRate: "k-rate",
        defaultValue: 1,
        minValue: MIN_ENV,
        maxValue: MAX_ENV,
      },
    ];
  }
}

registerProcessor("GranularProcessor", GranularProcessor);

interface ParamDescriptor {
  name: string;
  automationRate: "a-rate" | "k-rate";
  defaultValue: number;
  minValue: number;
  maxValue: number;
}
