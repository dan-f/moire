import { useEffect, useState } from "react";
import { WebMidi } from "webmidi";
import { range } from "../lib/iter";
import {
  enableMidi,
  mapNoteEvents,
  NoteEventMapper,
  noteEvents$,
} from "../midi";
import { Config } from "../synth/granular";
import { useSynth } from "./AppContext";

export function Midi() {
  useMidi();
  return null;
}

function useMidi() {
  const [midiEnabled, setMidiEnabled] = useState<boolean>();
  const synth = useSynth();

  useEffect(() => {
    if (typeof midiEnabled === "undefined") {
      enableMidi().then(setMidiEnabled);
    }
  }, [midiEnabled]);

  useEffect(() => {
    if (!midiEnabled) {
      return;
    }

    // hard-code the input for now
    const input = WebMidi.inputs[0];

    const subscription = mapNoteEvents(
      toStreamGates,
      noteEvents$(input),
    ).subscribe(([stream, params]) => {
      synth.setStreamParams(stream, params);
    });

    return () => subscription.unsubscribe();
  }, [midiEnabled, synth]);
}

const toStreamGates: NoteEventMapper = (event) => {
  const stream = MidiNoteToStream[event.note.number];
  if (typeof stream !== "number") {
    return;
  }
  switch (event.type) {
    case "noteon":
      return [stream, { gate: 1 }];
    case "noteoff":
      return [stream, { gate: 0 }];
    default:
      return;
  }
};

const MidiNoteToStream: Record<number, number> = [
  ...range(Config.MaxStreams),
].reduce((acc, cur) => ({ ...acc, [cur + 60]: cur }), {});
