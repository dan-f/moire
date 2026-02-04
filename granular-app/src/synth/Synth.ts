import { DefaultLogger } from "../lib/DefaultLogger";
import { range } from "../lib/iter";
import { NoteEvent } from "../note";
import * as Buffer from "./Buffer";
import { Config, GranularNode, Message as Msg } from "./granular";
import * as SynthParam from "./SynthParam";

/**
 * Top-level interface for the application to orchestrate sound generation
 */
export class Synth {
  private readonly ctx: AudioContext;
  private readonly granularNode: GranularNode;
  private readonly analysers: AnalyserNode[];
  private readonly analyserResultBuf = new Float32Array(1);
  private readonly log = new DefaultLogger(Synth.name);

  private constructor(ctx: AudioContext, granularNode: GranularNode) {
    this.ctx = ctx;
    this.granularNode = granularNode;
    this.analysers = Array(Config.NumStreams);
    const splitter = ctx.createChannelSplitter(Config.NumStreams);
    this.granularNode.connect(splitter, 1);
    for (const s of range(Config.NumStreams)) {
      const analyser = ctx.createAnalyser();
      splitter.connect(analyser, s);
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
        this.log.warn(
          `Samples must be mono or stereo. Cannot handle ${result.numChannels}-channel sample`,
        );
        break;
      case "READ_ERROR":
        this.log.warn("Error reading sample", result.event);
        break;
    }

    return result;
  }

  sendNoteEvent(event: NoteEvent.TimedNoteEvent) {
    const noteVal = event.note + 1;
    const param = this.getParam("note_event");
    param.setValueAtTime(
      event.type === "noteon" ? noteVal : -noteVal,
      event.time,
    );
  }

  getParam(key: SynthParam.T): AudioParam {
    const param = this.granularNode.parameters.get(key);
    if (!param) {
      throw new Error(`Bug - unknown parameter key ${key}`);
    }
    return param;
  }

  playheadPosition(streamId: number): number {
    this.analysers[streamId].getFloatTimeDomainData(this.analyserResultBuf);
    return this.analyserResultBuf[0];
  }

  static async new(ctx: AudioContext): Promise<Synth> {
    const granularNode = await GranularNode.new(ctx);
    const limiter = ctx.createDynamicsCompressor();
    granularNode.connect(limiter);
    limiter.threshold.value = -0.5;
    limiter.ratio.value = limiter.ratio.maxValue;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.05;
    limiter.connect(ctx.destination);
    return new Synth(ctx, granularNode);
  }

  private async updateSample(sample: Float32Array[]): Promise<void> {
    await this.granularNode.request({
      type: Msg.ReqType.UpdateSample,
      sample,
    });
  }
}
