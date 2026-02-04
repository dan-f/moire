import { type Observable, concatMap } from "rxjs";
import { type NoteEvent } from "./NoteEvent";

export type NoteEventMapper<T> = (event: NoteEvent) => T | undefined;

/**
 * Transform a stream of {@linkcode NoteEvent}s a la map-filter.
 */
export function mapNoteEvents<T>(
  f: NoteEventMapper<T>,
  notes$: Observable<NoteEvent>,
): Observable<T> {
  return notes$.pipe(
    concatMap((e) => {
      const result = f(e);
      return result ? [result] : [];
    }),
  );
}
