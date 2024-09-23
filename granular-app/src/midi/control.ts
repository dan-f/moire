import { type Observable, filter, map } from "rxjs";
import { type NoteMessageEvent } from "webmidi";
import { SynthParam } from "../synth";

export type NoteEventMapper = (
  event: NoteMessageEvent,
) => SynthParamsInstruction | undefined;

export function mapNoteEvents(
  f: NoteEventMapper,
  notes$: Observable<NoteMessageEvent>,
): Observable<SynthParamsInstruction> {
  return notes$.pipe(
    map(f),
    filter((x) => Array.isArray(x)),
  );
}

type SynthParamsInstruction = [SynthParam.T, number][];
