/**
 * Given a signal in the range [-1, 1], create two nodes specifying gain
 * suitable for crossfading. See
 * https://dsp.stackexchange.com/questions/14754/equal-power-crossfade
 */
export function xFadedGainNodes(
  ctx: AudioContext,
  balance: AudioNode,
): [AudioNode, AudioNode] {
  return [
    balance.connect(new WaveShaperNode(ctx, { curve: Curves.xfadeA })),
    balance.connect(new WaveShaperNode(ctx, { curve: Curves.xfadeB })),
  ];
}

export function saturatorNode(ctx: AudioContext): WaveShaperNode {
  return new WaveShaperNode(ctx, { curve: Curves.tanh });
}

export function saturationModule(ctx: AudioContext): {
  input: AudioNode;
  output: AudioNode;
  gain: ConstantSourceNode;
} {
  const biasOffset = 0.05;
  const gain = constantSourceNode(ctx, { offset: 1 });
  const input = new GainNode(ctx, { gain: 0 });
  const output = input
    .connect(
      constantSourceNode(ctx, { offset: biasOffset }).connect(
        new GainNode(ctx),
      ),
    )
    .connect(new WaveShaperNode(ctx, { curve: Curves.tanh }))
    .connect(
      constantSourceNode(ctx, { offset: -biasOffset }).connect(
        new GainNode(ctx),
      ),
    );

  gain.connect(input.gain);

  return { input, output, gain };
}

/**
 * Convenience constructor to automatically start
 * {@linkcode ConstantSourceNode}s.
 */
export function constantSourceNode(
  ctx: AudioContext,
  options?: ConstantSourceOptions,
): ConstantSourceNode {
  const node = new ConstantSourceNode(ctx, options);
  node.start();
  return node;
}

function createWsCurve(f: (x: number) => number): Float32Array {
  const curve = new Float32Array(WS_BUFLEN);
  for (let i = 0; i < WS_BUFLEN; i++) {
    const x = (2 * i) / WS_BUFLEN - 1;
    curve[i] = f(x);
  }
  return curve;
}

const WS_BUFLEN = 65536;

const Curves = {
  xfadeA: createWsCurve((x) => Math.sqrt(0.5 * (1 - x))),
  xfadeB: createWsCurve((x) => Math.sqrt(0.5 * (1 + x))),
  tanh: createWsCurve((x) => Math.tanh(x)),
  atan: createWsCurve((x) => (2 / Math.PI) * Math.atan(x)),
  cubic: createWsCurve((x) => x - Math.pow(x, 3) / 3),
  exp: createWsCurve((x) => Math.sign(x) * (1 - Math.exp(-Math.abs(x)))),
};
