import { BehaviorSubject } from "rxjs";
import { repeat } from "../lib/iter";
import { Selector } from "../lib/observable";
import { Config } from "./granular";

export interface T {
  streams: boolean[];
}

export function newSubject(): BehaviorSubject<T> {
  return new BehaviorSubject(initial);
}

export function streamEnabled(i: number): Selector<T, boolean> {
  return (t) => t.streams[i] ?? false;
}

type Updater = (cur: T) => T;

export function updateSubject(subj$: BehaviorSubject<T>, f: Updater) {
  subj$.next(f(subj$.getValue()));
}

export const toggleStreamEnabled =
  (stream: number): Updater =>
  (cur) => {
    if (stream < 0 || stream > cur.streams.length - 1) {
      return cur;
    }
    const streams = [...cur.streams];
    streams[stream] = !streams[stream];
    return { ...cur, streams };
  };

const initial: T = {
  streams: Array.from(repeat(Config.NumStreams, () => false)),
};
