import { RefObject, useEffect, useMemo, useRef } from "react";
import * as AsyncResult from "../lib/AsyncResult";
import { Buffer, Synth } from "../synth";
import { Config } from "../synth/granular";
import { useSynth } from "./AppContext";
import cls from "./Sample.module.css";

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
      width={WIDTH}
      height={HEIGHT}
      ref={canvasRef}
    ></canvas>
  );
}

function useAnimateSample(
  canvasRef: RefObject<HTMLCanvasElement>,
  uploadResult: AsyncResult.T<Buffer.UploadResult> | undefined,
) {
  const synth = useSynth();

  const animation = useMemo(
    () => new SampleAnimation(canvasRef, synth, uploadResult),
    [canvasRef, synth, uploadResult],
  );

  useEffect(() => animation.start(), [animation]);
}

class SampleAnimation {
  private readonly canvasRef: RefObject<HTMLCanvasElement>;
  private readonly synth: Synth;
  private readonly uploadResult?: AsyncResult.T<Buffer.UploadResult>;
  private frameId: number | undefined = undefined;

  constructor(
    canvasRef: RefObject<HTMLCanvasElement>,
    synth: Synth,
    uploadResult: AsyncResult.T<Buffer.UploadResult> | undefined,
  ) {
    this.canvasRef = canvasRef;
    this.synth = synth;
    this.uploadResult = uploadResult;

    this.start = this.start.bind(this);
    this.stop = this.stop.bind(this);
    this.drawFrame = this.drawFrame.bind(this);
  }

  start(): () => void {
    this.frameId = requestAnimationFrame(this.drawFrame);
    return this.stop;
  }

  private stop() {
    if (typeof this.frameId === "number") {
      cancelAnimationFrame(this.frameId);
      this.frameId = undefined;
    }
  }

  private drawFrame() {
    const ctx = this.canvasRef.current?.getContext("2d");
    if (ctx) {
      this.drawSampleWindow(ctx);
    }
    this.frameId = requestAnimationFrame(this.drawFrame);
  }

  private drawSampleWindow(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    if (
      this.uploadResult?.state === AsyncResult.ResultState.Done &&
      this.uploadResult.result.type === Buffer.UploadResultType.Success
    ) {
      this.drawWave(ctx, this.uploadResult.result.buffer);
      this.drawPlayheads(ctx);
    }
  }

  private drawWave(ctx: CanvasRenderingContext2D, buffer: Buffer.T) {
    const verticalOffset = HEIGHT / 2;
    const centerPosition = HEIGHT / 2;

    ctx.strokeStyle = "black";
    ctx.fillStyle = "black";
    ctx.beginPath();

    for (let x = 0; x < WIDTH; x++) {
      const subSample = (x / WIDTH) * Buffer.length(buffer);
      const frame = Buffer.subFrame(buffer, subSample);
      ctx.lineTo(x, centerPosition + frame[0] * verticalOffset);
    }

    ctx.stroke();
  }

  private drawPlayheads(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = "black";
    for (let s = 0; s < Config.NumStreams; s++) {
      const x = this.synth.playheadPosition(s) * WIDTH;
      if (x > 0) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, HEIGHT);
        ctx.stroke();
      }
    }
  }
}

const WIDTH = 300;
const HEIGHT = 150;
