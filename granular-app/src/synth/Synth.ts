import granularProcessorUrl from "./processor?worker&url";

export class Synth {
  ctx: AudioContext;
  granularNode: AudioWorkletNode;

  constructor(ctx: AudioContext, granularNode: AudioWorkletNode) {
    this.ctx = ctx;
    this.granularNode = granularNode;
  }

  static async build(): Promise<Synth> {
    const ctx = new AudioContext();
    await ctx.audioWorklet.addModule(granularProcessorUrl);
    const granularNode = new AudioWorkletNode(ctx, "GranularProcessor");
    granularNode.connect(ctx.destination);
    return Promise.resolve(new Synth(ctx, granularNode));
  }
}
