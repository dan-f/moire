import { useState } from "react";
import * as AsyncResult from "../lib/AsyncResult";
import { Buffer } from "../synth";
import cls from "./App.module.css";
import { AppContext, useSynth } from "./AppContext";
import { globals } from "./AppGlobals";
import { FileUpload } from "./FileUpload";
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
      <h1>Granular</h1>
      <button onClick={synth.toggleWebAudioPlayState.bind(synth)}>
        toggle playback
      </button>
      <div className={cls.card}>
        <FileUpload onUpload={handleUpload} />
        <Sample uploadResult={sampleResult} />
      </div>
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
