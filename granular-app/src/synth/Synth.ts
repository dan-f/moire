import { BehaviorSubject, Observable } from "rxjs";
import { i18n } from "../app/i18n";
import reverbIrUrl from "../assets/stalbans_a_ortf.wav";
import { upload, type UploadResult } from "../lib/Buffer";
import { DefaultLogger } from "../lib/DefaultLogger";
import { range } from "../lib/iter";
import { Param, ParamDef } from "../lib/param";
import {
  constantSourceNode,
  modulatedParamModule,
  oscillatorNode,
  saturationModule,
  xFadedGainNodes,
} from "../lib/webaudio";
import { NoteEvent } from "../note";
import { percent } from "../ui-lib/format";
import {
  Config,
  GranularNode,
  GranularParamDefs,
  GranularParamKey,
  Message as Msg,
  unpackStreamParam,
} from "./granular";
import { type Modulation, type ModulationSource } from "./modulation";
import {
  modulationGainParamKey,
  SynthParamDefs,
  type SynthParamKey,
} from "./param";
import { RandomNode } from "./RandomNode";

/**
 * Top-level interface for the application to orchestrate sound generation
 */
export class Synth {
  private readonly ctx: AudioContext;
  private readonly granular: GranularNode;
  private readonly params: Map<string, Param>;
  private nextModId = 0;
  readonly modSources: Map<ModulationSource["key"], ModulationSource>;
  private readonly modulationsSubj$: BehaviorSubject<
    Record<Modulation["id"], Modulation>
  >;
  private readonly analysers: AnalyserNode[];
  private readonly analyserResultBuf = new Float32Array(1);
  private readonly log = new DefaultLogger(Synth.name);

  private constructor(ctx: AudioContext, options: SynthOptions) {
    this.ctx = ctx;
    this.granular = options.granular;
    this.params = options.params;
    this.modSources = options.modSources;
    this.modulationsSubj$ = new BehaviorSubject({});
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

  playheadPosition(streamId: number): number {
    this.analysers[streamId].getFloatTimeDomainData(this.analyserResultBuf);
    return this.analyserResultBuf[0];
  }

  getParam(key: string): Param {
    const param = this.params.get(key);
    if (!param) {
      throw new Error(`Could not find param with key: ${key}`);
    }
    return param;
  }

  *modulationTargets(): Iterable<NonNullable<Modulation["target"]>> {
    for (const param of this.params.values()) {
      if (param.module.modulationTarget) {
        yield param as NonNullable<Modulation["target"]>;
      }
    }
  }

  get modulations$(): Observable<(typeof this.modulationsSubj$)["value"]> {
    return this.modulationsSubj$.asObservable();
  }

  createModulation(): void {
    const id = this.nextModId++;

    const initialGain = 0.5;
    const gain = new GainNode(this.ctx, { gain: initialGain });
    const range: [number, number] = [0, 1];
    const def: ParamDef = {
      key: modulationGainParamKey(id),
      value: { default: initialGain, range },
      display: { name: i18n("gain"), format: percent() },
    };
    this.params.set(def.key, { def, module: { manualTarget: gain.gain } });

    this.modulationsSubj$.next({
      ...this.modulationsSubj$.value,
      [id]: { id, gain },
    });
  }

  setModulationSource(
    id: Modulation["id"],
    sourceKey: ModulationSource["key"],
  ): void {
    const modulation = this.modulationsSubj$.value[id];
    if (!modulation) {
      this.log.error(`Called \`setModulationSource\` with unknown id: ${id}`);
      return;
    }
    const source = this.modSources.get(sourceKey);
    if (!source) {
      this.log.error(
        `Called \`setModulationSource\` with unknown sourceKey: ${sourceKey}`,
      );
      return;
    }

    if (modulation.source) {
      modulation.source.output.disconnect(modulation.gain);
    }
    source.output.connect(modulation.gain);
    this.modulationsSubj$.next({
      ...this.modulationsSubj$.value,
      [id]: { ...modulation, source },
    });
  }

  setModulationTarget(
    id: Modulation["id"],
    targetKey: Param["def"]["key"],
  ): void {
    const modulation = this.modulationsSubj$.value[id];
    if (!modulation) {
      this.log.error(`Called \`setModulationTarget\` with unknown id: ${id}`);
      return;
    }
    const possibleTarget = this.getParam(targetKey);
    if (!possibleTarget || !possibleTarget.module.modulationTarget) {
      this.log.error(
        `Called \`setModulationTarget\` with invalid targetKey: ${targetKey}`,
      );
      return;
    }
    const target = possibleTarget as Required<Modulation>["target"];

    if (modulation.target) {
      modulation.gain.disconnect(modulation.target.module.modulationTarget);
    }
    modulation.gain.connect(target.module.modulationTarget);
    this.modulationsSubj$.next({
      ...this.modulationsSubj$.value,
      [id]: { ...modulation, target },
    });
  }

  removeModulation(id: Modulation["id"]): void {
    const { [id]: modulation, ...remainingModulations } =
      this.modulationsSubj$.value;
    if (!modulation) {
      this.log.error(`Called \`removeModulation\` with unknown id: ${id}`);
      return;
    }

    if (modulation.source) {
      modulation.source.output.disconnect(modulation.gain);
    }
    if (modulation.target) {
      modulation.gain.disconnect(modulation.target.module.modulationTarget);
    }

    this.modulationsSubj$.next(remainingModulations);
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

    // modulation
    const lfos = [
      oscillatorNode(ctx),
      oscillatorNode(ctx),
      oscillatorNode(ctx),
    ];
    const rands = await Promise.all([
      RandomNode.new(ctx),
      RandomNode.new(ctx),
      RandomNode.new(ctx),
    ]);
    const modSources = new Map<string, ModulationSource>();
    lfos.forEach((node, i) => {
      const key = `lfo${i + 1}`;
      modSources.set(key, {
        key,
        displayName: `${i18n("Lfo")} ${i + 1}`,
        output: node,
      });
    });
    rands.forEach((node, i) => {
      const key = `rand${i + 1}`;
      modSources.set(key, {
        key,
        displayName: `${i18n("Random")} ${i + 1}`,
        output: node,
      });
    });

    // params
    const params = new Map<string, Param>();
    const masterGain = constantSourceNode(ctx, { offset: 1 });
    const reverbBalance = constantSourceNode(ctx, { offset: -1 });
    const [dryGain, wetGain] = xFadedGainNodes(ctx, reverbBalance);
    params.set(SynthParamDefs.masterGain.key, {
      def: SynthParamDefs.masterGain,
      module: { manualTarget: masterGain.offset },
    });
    params.set(SynthParamDefs.saturationGain.key, {
      def: SynthParamDefs.saturationGain,
      module: { manualTarget: saturation.gain.offset },
    });
    params.set(SynthParamDefs.reverbBalance.key, {
      def: SynthParamDefs.reverbBalance,
      module: { manualTarget: reverbBalance.offset },
    });
    lfos.forEach((node, i) => {
      const paramKey = `lfo${i + 1}Freq` as SynthParamKey;
      const def = SynthParamDefs[paramKey];
      node.frequency.value = def.value.default;
      params.set(paramKey, {
        def,
        module: { manualTarget: node.frequency },
      });
    });
    rands.forEach((node, i) => {
      const paramKey = `rand${i + 1}Freq` as SynthParamKey;
      const def = SynthParamDefs[paramKey];
      node.frequency.value = def.value.default;
      params.set(paramKey, {
        def,
        module: { manualTarget: node.frequency },
      });
    });
    Object.values(GranularParamDefs).forEach((def) => {
      const streamParam = unpackStreamParam(def.key as GranularParamKey);
      const granularParam = granular.getParam(def.key as GranularParamKey);
      if (
        streamParam &&
        !["subdivision", "tune", "env", "enabled"].includes(streamParam[1])
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
      modSources,
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
  modSources: Map<string, ModulationSource>;
}
