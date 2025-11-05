import {
  concatMap,
  defer,
  fromEventPattern,
  map,
  merge,
  type Observable,
} from "rxjs";
import {
  WebMidi,
  type Input,
  type InputEventMap,
  type NoteMessageEvent,
} from "webmidi";
import { DefaultLogger } from "./lib/DefaultLogger";

/**
 * Lazy observable of "noteon"/"noteoff" {@linkcode NoteMessageEvent}s.
 * Subscribing forces a MIDI permissions prompt.
 */
export const NoteMessageEvent$: Observable<NoteMessageEvent> = defer(init).pipe(
  map((w) => w.inputs[0]),
  concatMap((input) =>
    merge(noteEvent$("noteon", input), noteEvent$("noteoff", input)),
  ),
);

type NoteEvent = "noteon" | "noteoff";

function noteEvent$(
  event: NoteEvent,
  input?: Input,
): Observable<NoteMessageEvent> {
  const addHandler = (handler: InputEventMap[NoteEvent]) => {
    input?.addListener(event, handler);
  };
  const removeHandler = (handler: InputEventMap[NoteEvent]) => {
    input?.removeListener(event, handler);
  };
  return fromEventPattern(addHandler, removeHandler);
}

const log = new DefaultLogger("midi");

async function init(): Promise<typeof WebMidi> {
  try {
    await WebMidi.enable();
    return WebMidi;
  } catch (error) {
    log.info("could not enable MIDI", error as Error);
    return WebMidi;
  }
}
