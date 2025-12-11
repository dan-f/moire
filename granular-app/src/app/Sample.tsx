import { RefObject, useCallback, useMemo, useRef } from "react";
import * as AsyncResult from "../lib/AsyncResult";
import { Buffer, Synth } from "../synth";
import { Config } from "../synth/granular";
import { Bordered } from "../ui-lib/Bordered";
import { useSynth } from "./AppContext";
import { useAnimationFrame } from "./hooks/animation";
import style from "./Sample.module.css";
import { Theme, useTheme } from "./theme";

interface SampleProps {
  uploadResult?: AsyncResult.T<Buffer.UploadResult>;
}

export function Sample(props: SampleProps) {
  const { uploadResult } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useAnimateSample(canvasRef, uploadResult);

  return (
    <Bordered>
      <canvas
        className={style.canvas}
        width={Width}
        height={Height}
        ref={canvasRef}
      ></canvas>
    </Bordered>
  );
}

function useAnimateSample(
  canvasRef: RefObject<HTMLCanvasElement>,
  uploadResult: AsyncResult.T<Buffer.UploadResult> | undefined,
) {
  const synth = useSynth();
  const theme = useTheme();

  const animation = useMemo(
    () => new SampleAnimation(canvasRef, synth, theme, uploadResult),
    [canvasRef, synth, theme, uploadResult],
  );

  useAnimationFrame(
    useCallback(() => {
      animation.drawFrame();
    }, [animation]),
  );
}

class SampleAnimation {
  private readonly canvasRef: RefObject<HTMLCanvasElement>;
  private readonly synth: Synth;
  private readonly theme: Theme;
  private readonly uploadResult?: AsyncResult.T<Buffer.UploadResult>;

  constructor(
    canvasRef: RefObject<HTMLCanvasElement>,
    synth: Synth,
    theme: Theme,
    uploadResult: AsyncResult.T<Buffer.UploadResult> | undefined,
  ) {
    this.canvasRef = canvasRef;
    this.synth = synth;
    this.theme = theme;
    this.uploadResult = uploadResult;

    this.drawFrame = this.drawFrame.bind(this);
  }

  drawFrame() {
    const canvasRef = this.canvasRef.current;
    if (canvasRef) {
      canvasRef.width = this.width;
      canvasRef.height = this.height;
      this.drawSampleWindow(canvasRef.getContext("2d")!);
    }
  }

  private drawSampleWindow(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.theme.colors.backgroundSecondary;
    ctx.fillRect(0, 0, this.width, this.height);

    if (
      this.uploadResult?.state === AsyncResult.ResultState.Done &&
      this.uploadResult.result.type === Buffer.UploadResultType.Success
    ) {
      this.drawWave(ctx, this.uploadResult.result.buffer);
      this.drawPlayheads(ctx);
    }
  }

  private drawWave(ctx: CanvasRenderingContext2D, buffer: Buffer.T) {
    const verticalOffset = this.height / 2;
    const centerPosition = this.height / 2;

    ctx.strokeStyle = this.theme.colors.foreground;
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let x = 0; x < this.width; x++) {
      const subSample = (x / this.width) * Buffer.length(buffer);
      const frame = Buffer.subFrame(buffer, subSample);
      ctx.lineTo(x, centerPosition + frame[0] * verticalOffset);
    }

    ctx.stroke();

    // right channel
    ctx.strokeStyle = this.theme.colors.foregroundSecondary;
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let x = 0; x < this.width; x++) {
      const subSample = (x / this.width) * Buffer.length(buffer);
      const frame = Buffer.subFrame(buffer, subSample);
      ctx.lineTo(x, centerPosition + frame[1] * verticalOffset);
    }

    ctx.stroke();
  }

  private drawPlayheads(ctx: CanvasRenderingContext2D) {
    for (let s = 0; s < Config.NumStreams; s++) {
      const x = this.synth.playheadPosition(s) * this.width;
      if (x > 0) {
        ctx.strokeStyle = this.theme.colors.stream[s];
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, this.height);
        ctx.stroke();
      }
    }
  }

  private get width() {
    return this.canvasRef.current?.clientWidth ?? Width;
  }

  private get height() {
    return this.canvasRef.current?.clientHeight ?? Height;
  }
}

const Width = 300;
const Height = 150;
