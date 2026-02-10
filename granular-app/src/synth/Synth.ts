import reverbIrUrl from "../assets/stalbans_a_ortf.wav";
import { DefaultLogger } from "../lib/DefaultLogger";
import { range } from "../lib/iter";
import { NoteEvent } from "../note";
import { upload, type UploadResult } from "./Buffer";
import { Config, GranularNode, Message as Msg } from "./granular";
import { SynthParamKey } from "./param";

/**
 * Top-level interface for the application to orchestrate sound generation
 */
export class Synth {
  private readonly ctx: AudioContext;
  private readonly nodes: SynthNodes;
  private readonly analysers: AnalyserNode[];
  private readonly analyserResultBuf = new Float32Array(1);
  private readonly log = new DefaultLogger(Synth.name);

  private constructor(ctx: AudioContext, nodes: SynthNodes) {
    this.ctx = ctx;
    this.nodes = nodes;
    this.analysers = Array(Config.NumStreams);
    const splitter = ctx.createChannelSplitter(Config.NumStreams);
    this.nodes.granular.connect(splitter, 1);
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

  async uploadSample(file: File): Promise<UploadResult> {
    const result = await upload(this.ctx, file);

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

  getParam(key: SynthParamKey): AudioParam {
    const param =
      key === "reverbBalance"
        ? this.nodes.reverbBalance.offset
        : this.nodes.granular.parameters.get(key);
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
    const granular = await GranularNode.new(ctx);
    const dry = new GainNode(ctx, { gain: 0 });
    const wet = new GainNode(ctx, { gain: 0 });
    const reverb = new ConvolverNode(ctx, {
      buffer: await fetch(reverbIrUrl)
        .then((r) => r.arrayBuffer())
        .then((ab) => ctx.decodeAudioData(ab)),
    });
    const limiter = new DynamicsCompressorNode(ctx, {
      threshold: -0.5,
      ratio: 20,
      attack: 0.003,
      release: 0.05,
    });

    const reverbBalance = constantSourceNode(ctx, { offset: -1 });
    const [dryGain, wetGain] = crossFadedGainNodes(ctx, reverbBalance);
    dryGain.connect(dry.gain);
    wetGain.connect(wet.gain);

    granular.connect(dry).connect(limiter);
    granular.connect(wet).connect(reverb).connect(limiter);
    limiter.connect(ctx.destination);

    return new Synth(ctx, { granular, reverbBalance });
  }

  private async updateSample(sample: Float32Array[]): Promise<void> {
    await this.nodes.granular.request({
      type: Msg.ReqType.UpdateSample,
      sample,
    });
  }
}

function constantSourceNode(
  ctx: AudioContext,
  options?: ConstantSourceOptions,
): ConstantSourceNode {
  const node = new ConstantSourceNode(ctx, options);
  node.start();
  return node;
}

/**
 * Given a signal in the range [-1, 1], create two nodes specifying gain
 * suitable for crossfading. See
 * https://dsp.stackexchange.com/questions/14754/equal-power-crossfade
 */
function crossFadedGainNodes(
  ctx: AudioContext,
  balance: AudioNode,
): [AudioNode, AudioNode] {
  const bufLen = 65536;
  const curveA = new Float32Array(bufLen);
  const curveB = new Float32Array(bufLen);
  for (let i = 0; i < bufLen; i++) {
    const x = (2 * i) / bufLen - 1;
    curveA[i] = Math.sqrt(0.5 * (1 - x)); // 1 to 0
    curveB[i] = Math.sqrt(0.5 * (1 + x)); // 0 to 1
  }

  const shaperA = new WaveShaperNode(ctx, { curve: curveA });
  const shaperB = new WaveShaperNode(ctx, { curve: curveB });
  balance.connect(shaperA);
  balance.connect(shaperB);

  return [shaperA, shaperB];
}

interface SynthNodes {
  granular: GranularNode;
  reverbBalance: ConstantSourceNode;
}
