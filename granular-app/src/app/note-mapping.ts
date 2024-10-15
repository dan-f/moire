import { range } from "../lib/iter";
import { type NoteEventMapper } from "../note";
import { SynthParam } from "../synth";
import { Config } from "../synth/granular";

type SynthParamsInstruction = [SynthParam.T, number][];

export const poly: NoteEventMapper<SynthParamsInstruction> = (event) => {
  const { note } = event;
  const stream = MidiNoteToStream[note];
  if (typeof stream !== "number") {
    return;
  }
  switch (event.type) {
    case "noteon":
      return [
        [SynthParam.packStreamParam(stream, "gate"), 1],
        [SynthParam.packStreamParam(stream, "tune"), tune(note)],
      ];
    case "noteoff":
      return [[SynthParam.packStreamParam(stream, "gate"), 0]];
    default:
      return;
  }
};

const AllStreams = [...range(Config.NumStreams)];

const MidiNoteToStream: Record<number, number> = AllStreams.reduce(
  (acc, cur) => ({ ...acc, [cur + 60]: cur }),
  {},
);

export const mono: NoteEventMapper<SynthParamsInstruction> = (event) => {
  const { note } = event;
  if (event.type === "noteon") {
    HeldMonoNotes.push(note);
    return AllStreams.flatMap((stream) => [
      [SynthParam.packStreamParam(stream, "gate"), 1],
      // TODO - we want this to be relative to the current tune value
      //
      // This requires a few things we don't have currently:
      // 1) some way to query the synth's state. either inject a reference to
      //    the synth or less glamorously import the global synth instance.
      // 2) a modulate-able `tune` param. similar pattern to what we'd need for
      //    LFOs; basically an "add" node so that we can have a baseline tune
      //    setting (the one the UI controls) and then a tune *delta* which can
      //    go from, say, +2, back to 0.
      // 3) a way to show this in the UI; both the baseline value plus the
      //    current value
      //
      // Currently, this is tuning them all to the same value
      [SynthParam.packStreamParam(stream, "tune"), tune(note)],
    ]);
  } else if (event.type === "noteoff") {
    HeldMonoNotes.pop();
    const activeNote = HeldMonoNotes[HeldMonoNotes.length - 1];
    if (typeof activeNote !== "undefined") {
      return AllStreams.flatMap((stream) => [
        [SynthParam.packStreamParam(stream, "tune"), tune(activeNote)],
      ]);
    }
    return AllStreams.flatMap((stream) => [
      [SynthParam.packStreamParam(stream, "gate"), 0],
    ]);
  }
};

const HeldMonoNotes: number[] = [];

function tune(note: number) {
  return note - 60;
}
