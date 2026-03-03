import { useMemo, useRef } from "react";
import { map, merge, Observable, tap } from "rxjs";
import { type NoteMessageEvent } from "webmidi";
import { range } from "../lib/iter";
import { NoteMessageEvent$ } from "../midi";
import { KeyboardNoteEvent$, NoteEvent } from "../note";
import { Config } from "../synth/granular";
import { Column } from "../ui-lib/Column";
import { Row } from "../ui-lib/Row";
import { TextButton } from "../ui-lib/TextButton";
import { useAudioCtx, useSynth } from "./AppContext";
import { type HelpModalRef, HelpModal } from "./HelpModal";
import { useSubscription } from "./hooks/observable";
import { i18n } from "./i18n";
import { Param } from "./Param";
import { Sample } from "./Sample";
import { Stream } from "./Stream";
import style from "./Synth.module.css";

export function Synth() {
  const synth = useSynth();
  const helpModal = useRef<HelpModalRef>(null);

  useSubscription(useTimedNoteEvents(), (noteEvent) => {
    synth.sendNoteEvent(noteEvent);
  });

  return (
    <div className={style.container} onClick={() => synth.resumeWebAudio()}>
      <div className={style.title}>{import.meta.env.VITE_PROJECT_NAME}</div>
      <div className={style.links}>
        <TextButton
          className={style.link}
          onClick={() => helpModal.current?.open()}
        >
          {i18n("Help")}
        </TextButton>
        <span>/</span>
        <a
          className={style.link}
          href={import.meta.env.VITE_PROJECT_URL}
          target="_blank"
          rel="noreferrer"
        >
          {i18n("About")}
        </a>
      </div>
      <Column gap="xxs">
        <Row>
          <Param.Knob paramKey="attack" enabled />
          <Param.Knob paramKey="decay" enabled />
        </Row>
        <Row>
          <Param.Knob paramKey="sustain" enabled />
          <Param.Knob paramKey="release" enabled />
        </Row>
      </Column>
      <div className={style.sample}>
        <Sample />
      </div>
      <Column gap="xxs">
        <Row>
          <Param.Knob paramKey="masterGain" enabled />
          <Param.Knob paramKey="saturationGain" enabled />
        </Row>
        <Row>
          <Param.Knob paramKey="reverbBalance" enabled />
          <Param.Knob paramKey="bpm" enabled />
        </Row>
      </Column>
      {[...range(Config.NumStreams)].map((stream) => (
        <Stream stream={stream} key={stream} />
      ))}
      <HelpModal ref={helpModal} />
    </div>
  );
}

const MidiNoteEvent$ = NoteMessageEvent$.pipe(map(midiToNoteEvent));

const AllNoteEvents$ = merge(MidiNoteEvent$, KeyboardNoteEvent$);

function midiToNoteEvent(e: NoteMessageEvent): NoteEvent.NoteEvent {
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
