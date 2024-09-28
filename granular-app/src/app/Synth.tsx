import { useState } from "react";
import * as AsyncResult from "../lib/AsyncResult";
import { range } from "../lib/iter";
import { mapNoteEvents, noteEvents$ } from "../midi";
import { type NoteEventMapper } from "../midi/control";
import { Buffer, SynthParam } from "../synth";
import { Config } from "../synth/granular";
import { useSynth } from "./AppContext";
import { FileUpload } from "./FileUpload";
import { useSubscription } from "./hooks/observable";
import { Sample } from "./Sample";
import { Stream } from "./Stream";
import style from "./Synth.module.css";

export function Synth() {
  const synth = useSynth();
  const [sampleResult, setSampleResult] =
    useState<AsyncResult.T<Buffer.UploadResult>>();

  useSubscription(mapNoteEvents(gateStreams, noteEvents$), (params) => {
    synth.setParams(params);
  });

  async function handleUpload(file: File) {
    setSampleResult(AsyncResult.loading());
    setSampleResult(AsyncResult.done(await synth.uploadSample(file)));
  }

  return (
    <div className={style.container} onClick={() => synth.resumeWebAudio()}>
      <div className={style.sample}>
        <FileUpload onUpload={handleUpload} />
        <Sample uploadResult={sampleResult} />
      </div>
      {[...range(Config.NumStreams)].map((stream) => (
        <div key={stream} className={style.stream}>
          <Stream stream={stream} />
        </div>
      ))}
    </div>
  );
}

const gateStreams: NoteEventMapper = (event) => {
  const stream = MidiNoteToStream[event.note.number];
  if (typeof stream !== "number") {
    return;
  }
  switch (event.type) {
    case "noteon":
      return [[SynthParam.packStreamParam(stream, "gate"), 1]];
    case "noteoff":
      return [[SynthParam.packStreamParam(stream, "gate"), 0]];
    default:
      return;
  }
};

const MidiNoteToStream: Record<number, number> = [
  ...range(Config.NumStreams),
].reduce((acc, cur) => ({ ...acc, [cur + 60]: cur }), {});
