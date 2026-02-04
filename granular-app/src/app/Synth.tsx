import { useMemo, useRef } from "react";
import { map, merge, Observable, tap } from "rxjs";
import { type NoteMessageEvent } from "webmidi";
import { range } from "../lib/iter";
import { NoteMessageEvent$ } from "../midi";
import { KeyboardNoteEvent$, NoteEvent } from "../note";
import { Config } from "../synth/granular";
import { Adsr } from "./Adsr";
import { useAudioCtx, useSynth } from "./AppContext";
import { useSubscription } from "./hooks/observable";
import { Param } from "./Param";
import { Sample } from "./Sample";
import { Stream } from "./Stream";
import style from "./Synth.module.css";

export function Synth() {
  const synth = useSynth();

  useSubscription(useTimedNoteEvents(), (noteEvent) => {
    synth.sendNoteEvent(noteEvent);
  });

  return (
    <div className={style.container} onClick={() => synth.resumeWebAudio()}>
      <Adsr />
      <div className={style.sample}>
        <Sample />
      </div>
      <div>
        <Param.Knob paramKey="bpm" label="tempo" enabled />
        {/* <fieldset>
          <legend>Voice Mode</legend>
          <label>
            Mono <input type="radio" name="voice" value="mono" checked></input>
          </label>
          <label>
            Poly <input type="radio" name="voice" value="poly"></input>
          </label>
        </fieldset> */}
        {/* end TODO */}
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

/**
 * Stream of note events, tagged with the respective (see implementation for
 * details) WebAudio clock time.
 */
function useTimedNoteEvents(): Observable<NoteEvent.TimedNoteEvent> {
  const ctx = useAudioCtx();
  const lastEventTime = useRef(ctx.currentTime);
  // There seem to be bugs both with `AudioContext.currentTime` and
  // `AudioParam.setValueAtTime`. It's possible to get the exact same
  // `AudioContext.currentTime` reported for note events that occur close enough
  // together. More significantly, `AudioParam.setValueAtTime` will drop values
  // when the `time` parameters of subsequent calls are too close in time, even
  // if that time difference represents a block of audio, let alone an
  // individual sample. For this reason, we have to artificially delay events
  // that are too close together.
  const conflictWindow = 0.01;

  return useMemo(
    () =>
      AllNoteEvents$.pipe(
        map((noteEvent) => {
          const time =
            ctx.currentTime - lastEventTime.current < conflictWindow
              ? lastEventTime.current + conflictWindow
              : ctx.currentTime;
          return { ...noteEvent, time };
        }),
        tap(({ time }) => {
          lastEventTime.current = time;
        }),
      ),
    [ctx, conflictWindow],
  );
}
