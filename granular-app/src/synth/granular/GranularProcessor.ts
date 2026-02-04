import { DefaultLogger } from "../../lib/DefaultLogger";
import { serve } from "../../lib/messaging";
import * as Buf from "../Buffer";
import { Engine } from "./engine";
import { type GranularWorkletNodeOptions } from "./GranularNode";
import { ReqType, RspType, type Request, type Response } from "./message";
import {
  ParamDescriptors,
  type AudioParamDescriptor,
  type ProcessorParams,
} from "./param";

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

  static get parameterDescriptors(): AudioParamDescriptor[] {
    return ParamDescriptors;
  }

  process(
    _inputs: Buf.Buffer[],
    outputs: Buf.Buffer[],
    params: ProcessorParams,
  ): boolean {
    const [dstAudio, dstPlayheads] = outputs;
    this.engine.checkResizeProcessingBuffers(Buf.length(dstAudio));
    this.engine.setParams(params);
    const [srcAudio, srcPlayheads] = this.engine.process();

    Buf.copy(srcAudio, dstAudio);
    Buf.copy(srcPlayheads, dstPlayheads);

    return true;
  }

  private async handleRequest(req: Request): Promise<Response> {
    switch (req.type) {
      case ReqType.UpdateSample:
        this.engine.updateSample(req.sample);
        return { type: RspType.SampleUpdated };
    }
  }
}

registerProcessor("GranularProcessor", GranularProcessor);
