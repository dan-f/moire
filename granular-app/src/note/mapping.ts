import { type Observable, concatMap } from "rxjs";
import * as NoteEvent from "./NoteEvent";

export type NoteEventMapper<T> = (event: NoteEvent.T) => T | undefined;

/**
 * Transform a stream of {@linkcode NoteEvent.T}s a la map-filter.
 */
export function mapNoteEvents<T>(
  f: NoteEventMapper<T>,
  notes$: Observable<NoteEvent.T>,
): Observable<T> {
  return notes$.pipe(
    concatMap((e) => {
      const result = f(e);
      return result ? [result] : [];
    }),
  );
}
