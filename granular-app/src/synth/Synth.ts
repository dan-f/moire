import { MessageType } from "./GranularMessage";
import { GranularNode } from "./GranularNode";

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

  setBpm(bpm: number) {
    this.granularNode.bpm.cancelScheduledValues(this.ctx.currentTime);
    this.granularNode.bpm.setValueAtTime(bpm, this.ctx.currentTime);
  }

  updateSample(sample: Float32Array[]) {
    this.granularNode.send({
      type: MessageType.UpdateSample,
      sample,
    });
  }

  static async new(ctx: AudioContext): Promise<Synth> {
    const granularNode = await GranularNode.new(ctx);
    granularNode.connect(ctx.destination);
    return new Synth(ctx, granularNode);
  }
}
