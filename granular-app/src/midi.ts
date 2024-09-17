import { filter, fromEventPattern, map, merge, type Observable } from "rxjs";
import {
  type Input,
  type InputEventMap,
  type NoteMessageEvent,
  WebMidi,
} from "webmidi";
import { ConsoleLogger } from "./lib/ConsoleLogger";
import { StreamParams } from "./synth/granular";

const log = new ConsoleLogger("midi");

export async function enableMidi(): Promise<boolean> {
  try {
    await WebMidi.enable();
    return true;
  } catch (error) {
    log.error("could not enable MIDI", undefined, error as Error);
    return false;
  }
}

export function noteEvents$(input: Input): Observable<NoteMessageEvent> {
  return merge(noteEvent$("noteon", input), noteEvent$("noteoff", input));
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

type StreamParamsInstruction = [number, Partial<StreamParams.T>];

export type NoteEventMapper = (
  event: NoteMessageEvent,
) => StreamParamsInstruction | undefined;

export function mapNoteEvents(
  f: NoteEventMapper,
  notes$: Observable<NoteMessageEvent>,
): Observable<StreamParamsInstruction> {
  return notes$.pipe(
    map(f),
    filter((x) => Array.isArray(x)),
  );
}
