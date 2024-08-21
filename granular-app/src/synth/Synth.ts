import { GranularNode } from "./GranularNode";

export class Synth {
  private ctx: AudioContext;
  // private granularNode: AudioWorkletNode;

  private constructor(ctx: AudioContext, _granularNode: AudioWorkletNode) {
    this.ctx = ctx;
    // this.granularNode = granularNode;
  }

  async start(): Promise<AudioContextState> {
    await this.ctx.resume();
    return this.ctxState;
  }

  get ctxState(): AudioContextState {
    return this.ctx.state;
  }

  static async new(): Promise<Synth> {
    const ctx = new AudioContext();
    const granularNode = await GranularNode.new(ctx);
    granularNode.connect(ctx.destination);
    return new Synth(ctx, granularNode);
  }
}
