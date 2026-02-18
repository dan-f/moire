import randomProcessorUrl from "./RandomProcessor?worker&url";

export class RandomNode extends AudioWorkletNode {
  private constructor(ctx: AudioContext) {
    super(ctx, "RandomProcessor", {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [1],
    });
  }

  static async new(ctx: AudioContext): Promise<RandomNode> {
    await ctx.audioWorklet.addModule(randomProcessorUrl);
    return new RandomNode(ctx);
  }

  get frequency(): AudioParam {
    return this.parameters.get("frequency")!;
  }
}
