import { useState } from "react";
import * as AsyncResult from "../lib/AsyncResult";
import { mapNoteEvents, noteEvents$, toStreamGates } from "../midi";
import { Buffer } from "../synth";
import { useSynth } from "./AppContext";
import { FileUpload } from "./FileUpload";
import { Sample } from "./Sample";
import cls from "./Synth.module.css";
import { useSubscription } from "./hooks/observable";

export function Synth() {
  const synth = useSynth();
  const [sampleResult, setSampleResult] =
    useState<AsyncResult.T<Buffer.UploadResult>>();

  useSubscription(mapNoteEvents(toStreamGates, noteEvents$), (params) => {
    synth.setParams(params);
  });

  async function handleUpload(file: File) {
    setSampleResult(AsyncResult.loading());
    setSampleResult(AsyncResult.done(await synth.uploadSample(file)));
  }

  return (
    <div className={cls.synth} onClick={() => synth.resumeWebAudio()}>
      <div className={cls.sample}>
        <FileUpload onUpload={handleUpload} />
        <Sample uploadResult={sampleResult} />
      </div>
    </div>
  );
}
