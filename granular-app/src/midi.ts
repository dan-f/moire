import {
  concatMap,
  defer,
  filter,
  fromEventPattern,
  map,
  merge,
  type Observable,
} from "rxjs";
import {
  type Input,
  type InputEventMap,
  type NoteMessageEvent,
  WebMidi,
} from "webmidi";
import { ConsoleLogger } from "./lib/ConsoleLogger";
import { range } from "./lib/iter";
import { SynthParam } from "./synth";
import { Config } from "./synth/granular";

const log = new ConsoleLogger("midi");

export const noteEvents$ = defer(enableMidi).pipe(
  map((w) => w.inputs[0]),
  concatMap((input) =>
    merge(noteEvent$("noteon", input), noteEvent$("noteoff", input)),
  ),
);

export function mapNoteEvents(
  f: NoteEventMapper,
  notes$: Observable<NoteMessageEvent>,
): Observable<SynthParamsInstruction> {
  return notes$.pipe(
    map(f),
    filter((x) => Array.isArray(x)),
  );
}

export const toStreamGates: NoteEventMapper = (event) => {
  const stream = MidiNoteToStream[event.note.number];
  if (typeof stream !== "number") {
    return;
  }
  switch (event.type) {
    case "noteon":
      return [[SynthParam.forStream(stream, "gate"), 1]];
    case "noteoff":
      return [[SynthParam.forStream(stream, "gate"), 0]];
    default:
      return;
  }
};

async function enableMidi(): Promise<typeof WebMidi> {
  try {
    await WebMidi.enable();
    return WebMidi;
  } catch (error) {
    log.info("could not enable MIDI", error as Error);
    return WebMidi;
  }
}

type NoteEvent = "noteon" | "noteoff";

function noteEvent$(
  event: NoteEvent,
  input: Input,
): Observable<NoteMessageEvent> {
  const addHandler = (handler: InputEventMap[NoteEvent]) => {
    input.addListener(event, handler);
  };
  const removeHandler = (handler: InputEventMap[NoteEvent]) => {
    input.removeListener(event, handler);
  };
  return fromEventPattern(addHandler, removeHandler);
}

type SynthParamsInstruction = [SynthParam.T, number][];

type NoteEventMapper = (
  event: NoteMessageEvent,
) => SynthParamsInstruction | undefined;

const MidiNoteToStream: Record<number, number> = [
  ...range(Config.NumStreams),
].reduce((acc, cur) => ({ ...acc, [cur + 60]: cur }), {});
