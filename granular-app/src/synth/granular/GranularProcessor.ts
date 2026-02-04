import { DefaultLogger } from "../../lib/DefaultLogger";
import { range } from "../../lib/iter";
import { serve } from "../../lib/messaging";
import * as Buf from "../Buffer";
import { Config } from "./Config";
import { Engine } from "./engine";
import { Max, Min } from "./Env";
import { type GranularWorkletNodeOptions } from "./GranularNode";
import { ReqType, Response, RspType, type Request } from "./message";
import { packStreamParam, ProcessorParams, StreamParamName } from "./param";

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
        defaultValue: 120,
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
      {
        name: "note_event",
        automationRate: "k-rate",
        defaultValue: 0,
        minValue: -128,
        maxValue: 128,
      },
      // TODO(poly): refactor these/rework `allStreamParamDescriptors` to
      // generate per-voice param descriptors (and a level down per-stream
      // descriptors)
      ...GranularProcessor.allStreamParamDescriptors(),
    ];
  }

  process(
    _inputs: Buf.Buffer[],
    outputs: Buf.Buffer[],
    params: ProcessorParams,
  ): boolean {
    const [dstAudio, dstPlayheads, ...dstBigBufViews] = outputs;
    this.engine.checkResizeProcessingBuffers(Buf.length(dstAudio));
    this.engine.setParams(params);
    const [srcAudio, srcPlayheads, srcBigBufViews] = this.engine.process();

    Buf.copy(srcAudio, dstAudio);
    Buf.copy(srcPlayheads, dstPlayheads);

    for (let i = 0; i < 8; i++) {
      Buf.copy(srcBigBufViews[i], dstBigBufViews[i]);
    }

    return true;
  }

  private async handleRequest(req: Request): Promise<Response> {
    switch (req.type) {
      case ReqType.UpdateSample:
        this.engine.updateSample(req.sample);
        return { type: RspType.SampleUpdated };
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
    const name = (key: StreamParamName) => packStreamParam(streamId, key);
    return [
      {
        name: name("enabled"),
        automationRate: "k-rate",
        defaultValue: streamId === 0 ? 1 : 0,
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
