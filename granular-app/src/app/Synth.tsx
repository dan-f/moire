import { useState } from "react";
import { map, merge } from "rxjs";
import { type NoteMessageEvent } from "webmidi";
import * as AsyncResult from "../lib/AsyncResult";
import { range } from "../lib/iter";
import { NoteMessageEvent$ } from "../midi";
import { KeyboardNoteEvent$, mapNoteEvents, NoteEvent } from "../note";
import { Buffer } from "../synth";
import { Config } from "../synth/granular";
import { useSynth } from "./AppContext";
import { FileUpload } from "./FileUpload";
import { useSubscription } from "./hooks/observable";
import { mono } from "./note-mapping";
import { Sample } from "./Sample";
import { Stream } from "./Stream";
import style from "./Synth.module.css";

export function Synth() {
  const synth = useSynth();
  const [sampleResult, setSampleResult] =
    useState<AsyncResult.T<Buffer.UploadResult>>();

  useSubscription(mapNoteEvents(mono, AllNoteEvents$), (params) => {
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

const MidiNoteEvent$ = NoteMessageEvent$.pipe(map(midiToNoteEvent));

const AllNoteEvents$ = merge(MidiNoteEvent$, KeyboardNoteEvent$);

function midiToNoteEvent(e: NoteMessageEvent): NoteEvent.T {
  const { number } = e.note;
  if (e.type === "noteon") {
    return NoteEvent.noteon(number);
  } else {
    return NoteEvent.noteoff(number);
  }
}
