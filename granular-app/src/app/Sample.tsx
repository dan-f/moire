import {
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as Ar from "../lib/AsyncResult";
import * as Buf from "../lib/Buffer";
import { Synth } from "../synth";
import { Config } from "../synth/granular";
import { Bordered } from "../ui-lib/Bordered";
import { classes } from "../ui-lib/css";
import { useSynth } from "./AppContext";
import { useAnimationFrame } from "./hooks/animation";
import { i18n } from "./i18n";
import style from "./Sample.module.css";
import { Theme, useTheme } from "./theme";

export function Sample() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const synth = useSynth();
  const [sampleResult, setSampleResult] =
    useState<Ar.AsyncResult<Buf.UploadResult>>();
  useAnimateSample(canvasRef, sampleResult);

  function triggerFileInput(event: React.KeyboardEvent) {
    if (event.key === "Enter" || event.key === " ") {
      inputRef.current?.click();
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setSampleResult((ar) => Ar.loading(ar?.result));
    setSampleResult(Ar.done(await synth.uploadSample(file)));
  }

  return (
    <Bordered className={style.container}>
      <canvas
        className={style.canvas}
        aria-label="waveform display"
        ref={canvasRef}
      ></canvas>

      <label
        onKeyUp={triggerFileInput}
        className={classes(
          style.label,
          sampleResult?.state !== Ar.ResultState.Done && style["label-visible"],
        )}
        role="button"
        tabIndex={0}
      >
        <span>
          {sampleResult?.state === Ar.ResultState.Loading
            ? ""
            : i18n("UploadSample")}
        </span>
        <input
          type="file"
          accept="audio/*"
          onChange={handleFileChange}
          ref={inputRef}
        ></input>
      </label>
    </Bordered>
  );
}

function useAnimateSample(
  canvasRef: RefObject<HTMLCanvasElement>,
  uploadResult: Ar.AsyncResult<Buf.UploadResult> | undefined,
) {
  const synth = useSynth();
  const theme = useTheme();

  const animation = useMemo(() => {
    return new SampleAnimation(synth, theme, uploadResult);
  }, [synth, theme, uploadResult]);

  useEffect(() => {
    animation.setupCanvas(canvasRef.current!);
  }, [animation, canvasRef]);

  useAnimationFrame(
    useCallback(() => {
      animation.drawFrame();
    }, [animation]),
  );
}

class SampleAnimation {
  canvas!: HTMLCanvasElement;
  ctx!: CanvasRenderingContext2D;
  private readonly synth: Synth;
  private readonly theme: Theme;
  private readonly uploadResult?: Ar.AsyncResult<Buf.UploadResult>;

  constructor(
    synth: Synth,
    theme: Theme,
    uploadResult: Ar.AsyncResult<Buf.UploadResult> | undefined,
  ) {
    this.synth = synth;
    this.theme = theme;
    this.uploadResult = uploadResult;

    this.drawFrame = this.drawFrame.bind(this);
  }

  setupCanvas(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio;
    this.canvas.width = this.cssWidth * dpr;
    this.canvas.height = this.cssHeight * dpr;
    this.ctx.scale(dpr, dpr);
  }

  drawFrame() {
    this.ctx.fillStyle = this.theme.colors.backgroundRaised;
    this.ctx.fillRect(0, 0, this.cssWidth, this.cssHeight);
    if (this.uploadResult?.result?.type === Buf.UploadResultType.Success) {
      this.drawWave(this.uploadResult.result.buffer);
      this.drawPlayheads();
    }
  }

  private drawWave(buffer: Buf.Buffer) {
    const verticalOffset = this.cssHeight / 2;
    const centerPosition = this.cssHeight / 2;

    this.ctx.strokeStyle = this.theme.colors.foreground;
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();

    // left channel
    for (let x = 0; x < this.cssWidth; x++) {
      const subSample = (x / this.cssWidth) * Buf.length(buffer);
      const frame = Buf.subFrame(buffer, subSample);
      this.ctx.lineTo(x, centerPosition + frame[0] * verticalOffset);
    }

    this.ctx.stroke();

    // right channel
    this.ctx.strokeStyle = this.theme.colors.foregroundSecondary;
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();

    for (let x = 0; x < this.cssWidth; x++) {
      const subSample = (x / this.cssWidth) * Buf.length(buffer);
      const frame = Buf.subFrame(buffer, subSample);
      this.ctx.lineTo(x, centerPosition + frame[1] * verticalOffset);
    }

    this.ctx.stroke();
  }

  private drawPlayheads() {
    for (let s = 0; s < Config.NumStreams; s++) {
      const x = this.synth.playheadPosition(s) * this.cssWidth;
      if (x > 0) {
        this.ctx.strokeStyle = this.theme.colors.stream[s];
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(x, 0);
        this.ctx.lineTo(x, this.cssHeight);
        this.ctx.stroke();
      }
    }
  }

  private get cssWidth() {
    return this.canvas.clientWidth;
  }

  private get cssHeight() {
    return this.canvas.clientHeight;
  }
}
