/**
 * Simple note on/off event.
 *
 * This exists in order to support playing via the computer keyboard. Ideally
 * Web MIDI would allow us to create a virtual device for the computer keyboard,
 * but that's not possible (see
 * https://github.com/WebAudio/web-midi-api/issues/45).
 *
 * Our workaround is to take the streams of "real" MIDI `noteon` / `noteoff`
 * messages, along with window `keydown` / `keyup` messages, and map them all to
 * this domain-specific event.
 */
export interface NoteEvent {
  type: "noteon" | "noteoff";
  /**
   * Midi note number, e.g. C4 = 60.
   */
  note: number;
}

export interface TimedNoteEvent extends NoteEvent {
  time: number;
}

export function noteon(note: number): NoteEvent {
  return { type: "noteon", note };
}

export function noteoff(note: number): NoteEvent {
  return { type: "noteoff", note };
}
