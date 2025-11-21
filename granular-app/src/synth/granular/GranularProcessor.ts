import { DefaultLogger } from "../../lib/DefaultLogger";
import { range } from "../../lib/iter";
import { serve } from "../../lib/messaging";
import * as Buffer from "../Buffer";
import { Config } from "./Config";
import { Engine } from "./engine";
import { Max, Min } from "./Env";
import { type GranularWorkletNodeOptions } from "./GranularNode";
import { ReqType, Response, RspType, type Request } from "./message";
import * as PP from "./ProcessorParam";
import * as StreamParams from "./StreamParams";

/**
 * The `AudioWorkletProcessor` responsible for ultimately filling output buffers
 * within the audio thread callback. This component delegates to the WASM
 * instance by way of the {@linkcode Engine}.
 */
class GranularProcessor extends AudioWorkletProcessor {
  private readonly engine: Engine;
  private readonly log = new DefaultLogger(GranularProcessor.name);

  constructor(options: GranularWorkletNodeOptions) {
    super();

    this.engine = new Engine(options.processorOptions.granularModule, {
      sampleRate,
      outputBufCapacity: 2048,
      outputBufLen: 128,
    });

    serve(this.port, this.handleRequest.bind(this));

    this.log.info("initialized processor", { sampleRate });
  }

  static get parameterDescriptors(): ParamDescriptor[] {
    return [
      {
        name: "bpm",
        automationRate: "k-rate",
        defaultValue: 300,
        minValue: 40,
        maxValue: 300,
      },
      {
        name: "attack",
        automationRate: "k-rate",
        defaultValue: 10,
        minValue: 0,
        maxValue: 5000,
      },
      {
        name: "decay",
        automationRate: "k-rate",
        defaultValue: 50,
        minValue: 0,
        maxValue: 5000,
      },
      {
        name: "sustain",
        automationRate: "k-rate",
        defaultValue: 0.8,
        minValue: 0,
        maxValue: 1,
      },
      {
        name: "release",
        automationRate: "k-rate",
        defaultValue: 250,
        minValue: 0,
        maxValue: 10000,
      },
      // TODO(poly): refactor these/rework `allStreamParamDescriptors` to
      // generate per-voice param descriptors (and a level down per-stream
      // descriptors)
      {
        name: "gate",
        automationRate: "k-rate",
        defaultValue: 0,
        minValue: 0,
        maxValue: 1,
      },
      {
        name: "note",
        automationRate: "k-rate",
        defaultValue: 0,
        minValue: 0,
        maxValue: 127,
      },
      ...GranularProcessor.allStreamParamDescriptors(),
    ];
  }

  process(
    _inputs: Buffer.T[],
    outputs: Buffer.T[],
    params: PP.ProcessorParams,
  ): boolean {
    this.engine.setParams(params);

    const [dstAudio, ...dstPlayheads] = outputs;
    const [srcAudio, ...srcPlayheads] = this.engine.process(
      Buffer.length(dstAudio),
    );

    Buffer.copy(srcAudio, dstAudio);

    for (let i = 0; i < Config.NumStreams; i++) {
      Buffer.copy(srcPlayheads[i], dstPlayheads[i]);
    }

    return true;
  }

  private async handleRequest(req: Request): Promise<Response> {
    switch (req.type) {
      case ReqType.UpdateSample:
        this.engine.updateSample(req.sample);
        return { type: RspType.SampleUpdated };
      case ReqType.AddStream: {
        // TODO delete these AddStream/DeleteStream request types
        return {
          type: RspType.StreamAdded,
          streamId: 999,
        };
      }
      case ReqType.DeleteStream:
        // TODO as stated above, delete me too
        return { type: RspType.StreamDeleted };
    }
  }

  private static allStreamParamDescriptors(): ParamDescriptor[] {
    return Array.from(range(Config.NumStreams)).flatMap(
      GranularProcessor.perStreamParamDescriptors,
    );
  }

  private static perStreamParamDescriptors(
    streamId: number,
  ): ParamDescriptor[] {
    const name = (key: StreamParams.Key) => PP.packStreamParam(streamId, key);
    return [
      {
        name: name("enabled"),
        automationRate: "k-rate",
        defaultValue: 0,
        minValue: 0,
        maxValue: 1,
      },
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
        minValue: Min,
        maxValue: Max,
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
