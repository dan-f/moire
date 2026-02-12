import reverbIrUrl from "../assets/stalbans_a_ortf.wav";
import { DefaultLogger } from "../lib/DefaultLogger";
import { range } from "../lib/iter";
import { NoteEvent } from "../note";
import { upload, type UploadResult } from "./Buffer";
import { Config, GranularNode, Message as Msg } from "./granular";
import { SynthParamKey } from "./param";
import {
  constantSourceNode,
  paramModule,
  saturationModule,
  xFadedGainNodes,
} from "./webaudio";

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
    const splitter = new ChannelSplitterNode(ctx, {
      numberOfOutputs: Config.NumStreams,
    });
    this.nodes.granular.connect(splitter, 1);
    for (const s of range(Config.NumStreams)) {
      const analyser = new AnalyserNode(ctx);
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
    let param;
    switch (key) {
      case "masterGain":
        param = this.nodes.masterGain.offset;
        break;
      case "saturationGain":
        param = this.nodes.saturationGain.offset;
        break;
      case "reverbBalance":
        param = this.nodes.reverbBalance.offset;
        break;
      default:
        param = this.nodes.granular.parameters.get(key);
        break;
    }

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
    // audio nodes
    const granular = await GranularNode.new(ctx);
    const dry = new GainNode(ctx, { gain: 0 });
    const wet = new GainNode(ctx, { gain: 0 });
    const saturation = saturationModule(ctx);
    const reverb = new ConvolverNode(ctx, {
      buffer: await fetch(reverbIrUrl)
        .then((r) => r.arrayBuffer())
        .then((ab) => ctx.decodeAudioData(ab)),
    });
    const mix = new GainNode(ctx, { gain: 0 });
    const limiter = new DynamicsCompressorNode(ctx, {
      threshold: -0.5,
      ratio: 20,
      attack: 0.003,
      release: 0.05,
    });
    const lfo = new OscillatorNode(ctx, { type: "sine", frequency: 1 });
    lfo.start();

    // control nodes
    const masterGain = paramModule(ctx, [0, 2]);
    const reverbBalance = constantSourceNode(ctx, { offset: -1 });
    const [dryGain, wetGain] = xFadedGainNodes(ctx, reverbBalance);
    dryGain.connect(dry.gain);
    wetGain.connect(wet.gain);
    lfo.connect(masterGain.modTarget);
    masterGain.modTarget.gain.setValueAtTime(1, ctx.currentTime);
    masterGain.output.connect(mix.gain);

    // audio graph
    granular.connect(saturation.input);
    saturation.output.connect(dry).connect(mix);
    saturation.output.connect(wet).connect(reverb).connect(mix);
    mix.connect(limiter).connect(ctx.destination);

    return new Synth(ctx, {
      granular,
      saturationGain: saturation.gain,
      reverbBalance,
      masterGain: masterGain.manual,
    });
  }

  private async updateSample(sample: Float32Array[]): Promise<void> {
    await this.nodes.granular.request({
      type: Msg.ReqType.UpdateSample,
      sample,
    });
  }
}

interface SynthNodes {
  granular: GranularNode;
  saturationGain: ConstantSourceNode;
  reverbBalance: ConstantSourceNode;
  masterGain: ConstantSourceNode;
}
