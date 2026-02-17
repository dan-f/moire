import reverbIrUrl from "../assets/stalbans_a_ortf.wav";
import { upload, type UploadResult } from "../lib/Buffer";
import { DefaultLogger } from "../lib/DefaultLogger";
import { range } from "../lib/iter";
import { Param } from "../lib/param";
import {
  constantSourceNode,
  modulatedParamModule,
  saturationModule,
  xFadedGainNodes,
} from "../lib/webaudio";
import { NoteEvent } from "../note";
import {
  Config,
  GranularNode,
  GranularParamDefs,
  GranularParamKey,
  Message as Msg,
  unpackStreamParam,
} from "./granular";
import { SynthParamDefs, SynthParamKey } from "./param";

/**
 * Top-level interface for the application to orchestrate sound generation
 */
export class Synth {
  private readonly ctx: AudioContext;
  private readonly granular: GranularNode;
  private readonly params: Map<string, Param>;
  private readonly analysers: AnalyserNode[];
  private readonly analyserResultBuf = new Float32Array(1);
  private readonly log = new DefaultLogger(Synth.name);

  private constructor(ctx: AudioContext, options: SynthOptions) {
    this.ctx = ctx;
    this.granular = options.granular;
    this.params = options.params;
    this.analysers = Array(Config.NumStreams);
    const splitter = new ChannelSplitterNode(ctx, {
      numberOfOutputs: Config.NumStreams,
    });
    this.granular.connect(splitter, 1);
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
    param.module.manualTarget.setValueAtTime(
      event.type === "noteon" ? noteVal : -noteVal,
      event.time,
    );
  }

  getParam(key: SynthParamKey): Param;
  getParam(key: string): Param | undefined;
  getParam(key: string): Param | undefined {
    return this.params.get(key);
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

    // params
    const params = new Map<string, Param>();
    const masterGain = constantSourceNode(ctx, { offset: 1 });
    const reverbBalance = constantSourceNode(ctx, { offset: -1 });
    const [dryGain, wetGain] = xFadedGainNodes(ctx, reverbBalance);
    params.set("masterGain", {
      def: SynthParamDefs.masterGain,
      module: { manualTarget: masterGain.offset },
    });
    params.set("saturationGain", {
      def: SynthParamDefs.saturationGain,
      module: { manualTarget: saturation.gain.offset },
    });
    params.set("reverbBalance", {
      def: SynthParamDefs.reverbBalance,
      module: { manualTarget: reverbBalance.offset },
    });
    Object.values(GranularParamDefs).forEach((def) => {
      const streamParam = unpackStreamParam(def.key as GranularParamKey);
      const granularParam = granular.getParam(def.key as GranularParamKey);
      if (
        streamParam &&
        !["subdivision", "tune", "env"].includes(streamParam[1])
      ) {
        const module = modulatedParamModule(ctx, def);
        granularParam.value = granularParam.minValue;
        module.output.connect(granularParam);
        params.set(def.key, { def, module });
      } else {
        params.set(def.key, { def, module: { manualTarget: granularParam } });
      }
    });

    // audio graph
    dryGain.connect(dry.gain);
    wetGain.connect(wet.gain);
    masterGain.connect(mix.gain);
    granular.connect(saturation.input);
    saturation.output.connect(dry).connect(mix);
    saturation.output.connect(wet).connect(reverb).connect(mix);
    mix.connect(limiter).connect(ctx.destination);

    return new Synth(ctx, {
      granular,
      params,
    });
  }

  private async updateSample(sample: Float32Array[]): Promise<void> {
    await this.granular.request({
      type: Msg.ReqType.UpdateSample,
      sample,
    });
  }
}

interface SynthOptions {
  granular: GranularNode;
  params: Map<string, Param>;
}
