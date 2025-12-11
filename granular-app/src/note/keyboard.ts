import { filter, fromEvent, map, merge, pipe } from "rxjs";
import * as NoteEvent from "./NoteEvent";

const toNote = pipe(
  map((e: KeyboardEvent) => KeyToMidiNote[e.key]),
  filter((n) => typeof n !== "undefined"),
);

/**
 * Stream of {@linkcode NoteEvent.T} coming from the computer keyboard.
 */
export const KeyboardNoteEvent$ = merge(
  fromEvent<KeyboardEvent>(window, "keydown").pipe(
    filter((e) => !e.repeat),
    toNote,
    map(NoteEvent.noteon),
  ),
  fromEvent<KeyboardEvent>(window, "keyup").pipe(
    toNote,
    map(NoteEvent.noteoff),
  ),
);

const KeyToMidiNote: Record<string, number | undefined> = {
  a: 60,
  w: 61,
  s: 62,
  e: 63,
  d: 64,
  f: 65,
  t: 66,
  g: 67,
  y: 68,
  h: 69,
  u: 70,
  j: 71,
  k: 72,
  o: 73,
  l: 74,
  p: 75,
  ";": 76,
};
