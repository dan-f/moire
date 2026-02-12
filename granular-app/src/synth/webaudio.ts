import { clamp } from "../lib/math";

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
 * Modulatable parameter where `manual` is the user-defined value, `modTarget`
 * is the connection point for a modulation signal as well as its attenuation
 * point, and `output` is the modulated parameter signal.
 */
export function paramModule(
  ctx: AudioContext,
  range: [min: number, max: number],
): {
  manual: ConstantSourceNode;
  modTarget: GainNode;
  output: AudioNode;
} {
  // normalize the incoming manual parameter to the [-1, 1] range
  const [min, max] = range;
  const manual = constantSourceNode(ctx);
  const normalized = manual
    .connect(
      constantSourceNode(ctx, { offset: -(min + (max - min) / 2) }).connect(
        new GainNode(ctx),
      ),
    )
    .connect(new GainNode(ctx, { gain: 1 / ((max - min) / 2) }));

  // modulate the signal, hard-clipping to prevent modulating outside of the
  // original range
  const modTarget = new GainNode(ctx, { gain: 0 });
  const mix = new GainNode(ctx);
  normalized.connect(mix);
  modTarget.connect(mix);
  const clipped = mix.connect(new WaveShaperNode(ctx, { curve: Curves.hard }));

  // bring the modulated parameter signal back to its original range
  const output = clipped
    .connect(new GainNode(ctx, { gain: (max - min) / 2 }))
    .connect(
      constantSourceNode(ctx, { offset: min + (max - min) / 2 }).connect(
        new GainNode(ctx),
      ),
    );

  return { manual, modTarget, output };
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
  hard: createWsCurve((x) => clamp(x, -1, 1)),
};
