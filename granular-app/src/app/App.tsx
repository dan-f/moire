import { useState } from "react";
import * as AsyncResult from "../lib/AsyncResult";
import { Buffer } from "../synth";
import cls from "./App.module.css";
import { AppContext, useSynth } from "./AppContext";
import { globals } from "./AppGlobals";
import { FileUpload } from "./FileUpload";
import { Midi } from "./Midi";
import { Sample } from "./Sample";

function ProvidedApp() {
  const synth = useSynth();
  const [sampleResult, setSampleResult] =
    useState<AsyncResult.T<Buffer.UploadResult>>();

  async function handleUpload(file: File) {
    setSampleResult(AsyncResult.loading());
    setSampleResult(AsyncResult.done(await synth.uploadSample(file)));
  }

  return (
    <>
      <div onClick={() => synth.resumeWebAudio()} className={cls.sample}>
        <FileUpload onUpload={handleUpload} />
        <Sample uploadResult={sampleResult} />
      </div>
      <Midi />
    </>
  );
}

export function App() {
  return (
    <AppContext.Provider value={globals}>
      <ProvidedApp />
    </AppContext.Provider>
  );
}
