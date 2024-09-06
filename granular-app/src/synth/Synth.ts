import { GranularNode, Message as M, StreamParams } from "./granular";

/**
 * Top-level interface for the application to orchestrate sound generation
 */
export class Synth {
  private ctx: AudioContext;
  private granularNode: GranularNode;

  private constructor(ctx: AudioContext, granularNode: GranularNode) {
    this.ctx = ctx;
    this.granularNode = granularNode;
  }

  async toggleWebAudioPlayState(): Promise<AudioContextState> {
    if (this.ctx.state !== "running") {
      await this.ctx.resume();
    } else {
      await this.ctx.suspend();
    }
    return this.ctx.state;
  }

  async updateSample(sample: Float32Array[]): Promise<void> {
    await this.granularNode.request({
      type: M.ReqType.UpdateSample,
      sample,
    });
  }

  setBpm(bpm: number) {
    this.granularNode.bpm.cancelScheduledValues(this.ctx.currentTime);
    this.granularNode.bpm.setValueAtTime(bpm, this.ctx.currentTime);
  }

  async addStream(params: StreamParams): Promise<number | undefined> {
    const rsp = await this.granularNode.request<
      M.AddStream.Req,
      M.AddStream.Rsp
    >({
      type: M.ReqType.AddStream,
      params,
    });
    return rsp.streamId;
  }

  async deleteStream(streamId: number): Promise<void> {
    await this.granularNode.request<M.DeleteStream.Req, M.DeleteStream.Rsp>({
      type: M.ReqType.DeleteStream,
      streamId,
    });
  }

  static async new(ctx: AudioContext): Promise<Synth> {
    const granularNode = await GranularNode.new(ctx);
    granularNode.connect(ctx.destination);
    return new Synth(ctx, granularNode);
  }
}
