import { ConsoleLogger } from "../lib/ConsoleLogger";
import { range } from "../lib/iter";
import * as Buffer from "./Buffer";
import {
  Config,
  GranularNode,
  Message as Msg,
  ProcessorParam,
  StreamParams,
} from "./granular";
import * as SynthParam from "./SynthParam";
import * as SynthState from "./SynthState";

/**
 * Top-level interface for the application to orchestrate sound generation
 */
export class Synth {
  private readonly ctx: AudioContext;
  private readonly granularNode: GranularNode;
  private readonly analysers: AnalyserNode[];
  private readonly analyserResultBuf = new Float32Array(1);
  private readonly log = new ConsoleLogger(Synth.name);
  private readonly state$ = SynthState.newSubject();

  private constructor(ctx: AudioContext, granularNode: GranularNode) {
    this.ctx = ctx;
    this.granularNode = granularNode;
    this.analysers = Array(Config.NumStreams);
    for (const s of range(Config.NumStreams)) {
      this.addStream(StreamParams.initial);
      const analyser = ctx.createAnalyser();
      this.granularNode.connect(analyser, s + 1, 0);
      this.analysers[s] = analyser;
    }
  }

  async resumeWebAudio(): Promise<AudioContextState> {
    if (this.ctx.state !== "running") {
      await this.ctx.resume();
    }
    return this.ctx.state;
  }

  async uploadSample(file: File): Promise<Buffer.UploadResult> {
    const result = await Buffer.upload(this.ctx, file);

    switch (result.type) {
      case "SUCCESS":
        await this.updateSample(result.buffer);
        break;
      case "CHANNEL_ERROR":
        this.log.info(
          `Samples must be mono or stereo. Cannot handle ${result.numChannels}-channel sample`,
        );
        break;
      case "READ_ERROR":
        this.log.info("Error reading sample", result.event);
        break;
    }

    return result;
  }

  setParam(key: SynthParam.T, val: number) {
    const param = this.granularNode.parameters.get(key);
    if (!param) {
      this.log.info("unknown parameter key", { key });
      return;
    }
    this.setParamNow(param, val);
  }

  setParams(params: [SynthParam.T, number][]) {
    for (const [key, val] of params) {
      this.setParam(key, val);
    }
  }

  playheadPosition(streamId: number): number {
    this.analysers[streamId].getFloatTimeDomainData(this.analyserResultBuf);
    return this.analyserResultBuf[0];
  }

  static async new(ctx: AudioContext): Promise<Synth> {
    const granularNode = await GranularNode.new(ctx);
    granularNode.connect(ctx.destination);
    return new Synth(ctx, granularNode);
  }

  private async addStream(stream: StreamParams.T): Promise<number | undefined> {
    const { streamId } = await this.granularNode.request<
      Msg.AddStream.Req,
      Msg.AddStream.Rsp
    >({
      type: Msg.ReqType.AddStream,
      stream: stream,
    });

    if (typeof streamId === "number") {
      for (const [key, val] of Object.entries(stream)) {
        const paramKey = key as StreamParams.Key;
        const paramVal: StreamParams.T[typeof paramKey] = val;
        this.setParam(
          ProcessorParam.packStreamParam(streamId, paramKey),
          paramVal,
        );
      }
    }

    return streamId;
  }

  private async updateSample(sample: Float32Array[]): Promise<void> {
    await this.granularNode.request({
      type: Msg.ReqType.UpdateSample,
      sample,
    });
  }

  private setParamNow(param: AudioParam, value: number) {
    param.cancelScheduledValues(this.ctx.currentTime);
    param.setValueAtTime(value, this.ctx.currentTime);
  }
}
