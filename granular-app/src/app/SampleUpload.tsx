import { useAudioCtx } from "./AppContext";

export interface SampleUploadProps {
  onUpload(upload: Promise<SampleUploadResult>): void;
}

export type SampleUploadResult =
  | { type: "SUCCESS"; sample: Float32Array[] }
  | { type: "READ_ERROR"; event: ProgressEvent<FileReader> }
  | { type: "CHANNEL_ERROR"; numChannels: number };

export function SampleUpload(props: SampleUploadProps) {
  const { onUpload } = props;
  const audioCtx = useAudioCtx();

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    onUpload(
      new Promise((resolve) => {
        const reader = new FileReader();

        reader.onload = () => {
          audioCtx.decodeAudioData(
            reader.result! as ArrayBuffer,
            (audioBuffer) => {
              const { numberOfChannels } = audioBuffer;
              if (numberOfChannels > 2) {
                resolve({
                  type: "CHANNEL_ERROR",
                  numChannels: numberOfChannels,
                });
                return;
              }
              const sample = [];
              for (let i = 0; i < numberOfChannels; i++) {
                sample.push(audioBuffer.getChannelData(i));
              }
              resolve({ type: "SUCCESS", sample });
            },
          );
        };

        reader.onerror = (event) => resolve({ type: "READ_ERROR", event });

        reader.readAsArrayBuffer(file);
      }),
    );
  }

  return (
    <input type="file" accept="audio/*" onChange={handleFileChange}></input>
  );
}
