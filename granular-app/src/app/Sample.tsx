import { RefObject, useCallback, useMemo, useRef } from "react";
import * as AsyncResult from "../lib/AsyncResult";
import { Buffer, Synth } from "../synth";
import { Config } from "../synth/granular";
import { useSynth } from "./AppContext";
import { useAnimationFrame } from "./hooks/animation";
import cls from "./Sample.module.css";
import { Theme, useTheme } from "./theme";

interface SampleProps {
  uploadResult?: AsyncResult.T<Buffer.UploadResult>;
}

export function Sample(props: SampleProps) {
  const { uploadResult } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useAnimateSample(canvasRef, uploadResult);

  return (
    <canvas
      className={cls.canvas}
      width={Width}
      height={Height}
      ref={canvasRef}
    ></canvas>
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
    const ctx = this.canvasRef.current?.getContext("2d");
    if (ctx) {
      this.drawSampleWindow(ctx);
    }
  }

  private drawSampleWindow(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, Width, Height);

    if (
      this.uploadResult?.state === AsyncResult.ResultState.Done &&
      this.uploadResult.result.type === Buffer.UploadResultType.Success
    ) {
      this.drawWave(ctx, this.uploadResult.result.buffer);
      this.drawPlayheads(ctx);
    }
  }

  private drawWave(ctx: CanvasRenderingContext2D, buffer: Buffer.T) {
    const verticalOffset = Height / 2;
    const centerPosition = Height / 2;

    ctx.strokeStyle = "black";
    ctx.fillStyle = "black";
    ctx.beginPath();

    for (let x = 0; x < Width; x++) {
      const subSample = (x / Width) * Buffer.length(buffer);
      const frame = Buffer.subFrame(buffer, subSample);
      ctx.lineTo(x, centerPosition + frame[0] * verticalOffset);
    }

    ctx.stroke();
  }

  private drawPlayheads(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = "black";
    for (let s = 0; s < Config.NumStreams; s++) {
      const x = this.synth.playheadPosition(s) * Width;
      if (x > 0) {
        ctx.strokeStyle = this.theme.colors.stream[s];
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, Height);
        ctx.stroke();
      }
    }
  }
}

const Width = 300;
const Height = 150;
