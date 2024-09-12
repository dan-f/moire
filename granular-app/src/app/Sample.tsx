import { useEffect, useRef } from "react";
import * as AsyncResult from "../lib/AsyncResult";
import { Buffer } from "../synth";
import cls from "./Sample.module.css";

interface SampleProps {
  uploadResult?: AsyncResult.T<Buffer.UploadResult>;
}

export function Sample(props: SampleProps) {
  const { uploadResult } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    drawSampleWindow(canvas.getContext("2d")!, uploadResult);
  }, [canvasRef, uploadResult]);

  return (
    <canvas
      className={cls.canvas}
      width={WIDTH}
      height={HEIGHT}
      ref={canvasRef}
    ></canvas>
  );
}

function drawSampleWindow(
  ctx: CanvasRenderingContext2D,
  uploadResult?: AsyncResult.T<Buffer.UploadResult>,
) {
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  if (
    uploadResult?.state === AsyncResult.ResultState.Done &&
    uploadResult.result.type === Buffer.UploadResultType.Success
  ) {
    drawSamplePath(ctx, uploadResult.result.buffer);
  }
}

function drawSamplePath(ctx: CanvasRenderingContext2D, buffer: Buffer.T) {
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

const WIDTH = 300;
const HEIGHT = 150;
