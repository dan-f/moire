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
    MonoNoteQueue.add(note);
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
      [
        SynthParam.packStreamParam(stream, "tune"),
        tune(MonoNoteQueue.mruItem()!),
      ],
    ]);
  } else if (event.type === "noteoff") {
    MonoNoteQueue.remove(note);
    const activeNote = MonoNoteQueue.mruItem();
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

function tune(note: number) {
  return note - 60;
}

// TODO port this into the engine itself. -> tell the engine if we're in mono or
// poly mode then just set params like voice_1_gate -> on / off, and let the
// engine deal with the signal production
//
// also note re. poly mode, what pigments does is just steal the LRU voice and
// give it to the new note. however, when you let go of the new note you don't
// get that mono behavior of hearing the old note come back in (how would we do
// that anyway?). so it's not going to be like "mono mode is just a subset of
// poly mode" afaict.
class UsageQueue<T extends PropertyKey> {
  private lru?: ListNode<T>;
  private mru?: ListNode<T>;
  size = 0;
  private sizeLimit: number;
  private table = new Map<T, ListNode<T>>();

  constructor(sizeLimit: number) {
    this.sizeLimit = sizeLimit;
  }

  lruItem(): T | undefined {
    return this.lru?.val;
  }

  mruItem(): T | undefined {
    return this.mru?.val;
  }

  add(item: T) {
    if (this.table.has(item)) {
      const node = this.table.get(item)!;
      if (node === this.mru) {
        return;
      }

      this.splice(node);
      this.mru!.nxt = node;
      node.prv = this.mru;
      this.mru = node;
    } else if (this.size < this.sizeLimit) {
      const node: ListNode<T> = { val: item };

      if (this.size === 0) {
        this.mru = this.lru = node;
      } else {
        this.mru!.nxt = node;
        node.prv = this.mru;
        this.mru = node;
      }

      this.table.set(item, node);
      this.size += 1;
    }
  }

  remove(item: T) {
    const node = this.table.get(item);
    if (!node) {
      return;
    }

    this.splice(node);
    this.table.delete(item);
    this.size -= 1;
  }

  private splice(node: ListNode<T>) {
    const { prv, nxt } = node;

    delete node.prv;
    delete node.nxt;

    if (prv) {
      prv.nxt = nxt;
    }
    if (nxt) {
      nxt.prv = prv;
    }

    if (node === this.lru) {
      this.lru = nxt;
    }
    if (node === this.mru) {
      this.mru = prv;
    }
  }
}

const MonoNoteQueue = new UsageQueue<number>(6);

interface ListNode<T> {
  val: T;
  prv?: ListNode<T>;
  nxt?: ListNode<T>;
}
