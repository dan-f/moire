import { useState } from "react";
import cls from "./App.module.css";
import { AppContext, useSynth } from "./AppContext";
import { globals } from "./AppGlobals";
import { SampleUpload, SampleUploadResult } from "./SampleUpload";
import { useLogger } from "./logging";

function ProvidedApp() {
  const log = useLogger(App.name);
  const synth = useSynth();

  const [uploadingSample, setUploadingSample] = useState(false);

  async function handleUpload(upload: Promise<SampleUploadResult>) {
    setUploadingSample(true);
    const result = await upload;
    setUploadingSample(false);

    switch (result.type) {
      case "SUCCESS":
        synth.updateSample(result.sample);
        break;
      case "CHANNEL_ERROR":
        log.error(
          `Samples must be mono or stereo. Cannot handle ${result.numChannels}-channel sample`,
        );
        break;
      case "READ_ERROR":
        log.error("Error reading sample", result.event);
        break;
    }
  }

  return (
    <>
      <h1>Granular</h1>
      <button onClick={synth.toggleWebAudioPlayState.bind(synth)}>
        toggle playback
      </button>
      <div className={cls.card}>
        <SampleUpload onUpload={handleUpload} />
        {uploadingSample && <div>uploading</div>}
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
