import { repeat } from "../lib/iter";

export type Buffer = Float32Array[];

export type UploadResult =
  | { type: UploadResultType.Success; buffer: Buffer }
  | { type: UploadResultType.ReadError; event: ProgressEvent<FileReader> }
  | { type: UploadResultType.ChannelError; numChannels: number };

export enum UploadResultType {
  Success = "SUCCESS",
  ReadError = "READ_ERROR",
  ChannelError = "CHANNEL_ERROR",
}

export function upload(
  audioCtx: AudioContext,
  file: File,
): Promise<UploadResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = () => {
      audioCtx.decodeAudioData(reader.result! as ArrayBuffer, (audioBuffer) => {
        const { numberOfChannels } = audioBuffer;
        if (numberOfChannels > 2) {
          resolve({
            type: UploadResultType.ChannelError,
            numChannels: numberOfChannels,
          });
          return;
        }
        const buffer = [];
        for (let i = 0; i < numberOfChannels; i++) {
          buffer.push(audioBuffer.getChannelData(i));
        }
        resolve({ type: UploadResultType.Success, buffer });
      });
    };

    reader.onerror = (event) =>
      resolve({ type: UploadResultType.ReadError, event });

    reader.readAsArrayBuffer(file);
  });
}

export function create(channelCount: number, length?: number): Buffer {
  return Array.from(
    repeat(channelCount, () =>
      length ? new Float32Array(length) : new Float32Array(),
    ),
  );
}

export function channels(buffer: Buffer): number {
  return buffer.length;
}

export function length(buffer: Buffer): number {
  return buffer[0].length;
}

/**
 * Copy a mono or stereo source to a stereo destination.
 */
export function copyStereo(src: Buffer, dst: Buffer) {
  if (channels(dst) !== 2) {
    throw new Error("Expected stereo destination for copy");
  }
  const bufLen = length(dst);
  if (bufLen !== length(src)) {
    throw new Error(
      "Expected equal length source and destination buffers for copy",
    );
  }

  switch (src.length) {
    case 1:
      for (let i = 0; i < bufLen; i++) {
        dst[0][i] = Math.cos((Math.PI / 2) * 0.5) * src[0][i];
        dst[1][i] = Math.sin((Math.PI / 2) * 0.5) * src[0][i];
      }
      break;
    case 2:
      dst[0].set(src[0]);
      dst[1].set(src[1]);
      break;
    default:
      throw new Error(
        `Expected mono or stereo source. Cannot use ${channels(src)}-channel sample`,
      );
  }
}

/**
 * Copy an N-channel source to an N-channel destination
 */
export function copy(src: Buffer, dst: Buffer) {
  if (length(src) !== length(dst)) {
    throw new Error("Expected buffers of equal channel counts");
  }
  for (let c = 0; c < channels(src); c++) {
    dst[c].set(src[c]);
  }
}

export function subFrame(buffer: Buffer, subSample: number): number[] {
  const bufLen = length(buffer);
  const chans = channels(buffer);
  const leftSample = Math.max(Math.floor(subSample), 0);
  const rightSample = Math.min(Math.ceil(subSample), bufLen - 1);
  const frame = Array(chans);
  for (let c = 0; c < chans; c++) {
    frame[c] = lerp(
      buffer[c][leftSample],
      buffer[c][rightSample],
      subSample - Math.floor(subSample),
    );
  }
  return frame;
}

function lerp(a: number, b: number, t: number): number {
  return (1 - t) * a + t * b;
}
