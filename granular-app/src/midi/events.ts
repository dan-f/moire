import {
  concatMap,
  defer,
  fromEventPattern,
  map,
  merge,
  type Observable,
} from "rxjs";
import { type Input, type InputEventMap, type NoteMessageEvent } from "webmidi";
import { init } from "./init";

/**
 * Lazy observable of "noteon"/"noteoff" {@linkcode NoteMessageEvent}s.
 * Subscribing forces a MIDI permissions prompt.
 */
export const noteEvents$: Observable<NoteMessageEvent> = defer(init).pipe(
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
