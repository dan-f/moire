import { DefaultLogger } from "../lib/DefaultLogger";
import { range } from "../lib/iter";
import * as Buffer from "./Buffer";
import { Config, GranularNode, Message as Msg } from "./granular";
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
  private readonly log = new DefaultLogger(Synth.name);
  readonly state$ = SynthState.newSubject();

  private constructor(ctx: AudioContext, granularNode: GranularNode) {
    this.ctx = ctx;
    this.granularNode = granularNode;
    this.analysers = Array(Config.NumStreams);
    for (const s of range(Config.NumStreams)) {
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

  toggleStreamEnabled(stream: number) {
    SynthState.updateSubject(
      this.state$,
      SynthState.toggleStreamEnabled(stream),
    );
  }

  getParamVal(key: SynthParam.T): number | undefined {
    return this.findParam(key)?.value;
  }

  setParam(key: SynthParam.T, val: number) {
    const param = this.findParam(key);
    if (!param) {
      return;
    }
    const isStreamParam = SynthParam.unpackStreamParam(key);
    if (isStreamParam) {
      const [stream] = isStreamParam;
      const streamEnabled = SynthState.streamEnabled(stream)(
        this.state$.getValue(),
      );
      if (!streamEnabled) {
        return;
      }
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

  private async updateSample(sample: Float32Array[]): Promise<void> {
    await this.granularNode.request({
      type: Msg.ReqType.UpdateSample,
      sample,
    });
  }

  private findParam(key: SynthParam.T): AudioParam | undefined {
    const param = this.granularNode.parameters.get(key);
    if (!param) {
      this.log.info("unknown parameter key", { key });
    }
    return param;
  }

  private setParamNow(param: AudioParam, value: number) {
    param.cancelScheduledValues(this.ctx.currentTime);
    param.setValueAtTime(value, this.ctx.currentTime);
  }
}
