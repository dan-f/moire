import { BehaviorSubject } from "rxjs";
import { repeat } from "../lib/iter";
import { Config } from "./granular";

export interface T {
  streams: boolean[];
}

export function streamEnabled(t: T, i: number) {
  return t.streams[i] ?? false;
}

export function newSubject(): BehaviorSubject<T> {
  return new BehaviorSubject(initial);
}

export function getState(subj$: BehaviorSubject<T>): T {
  return subj$.getValue();
}

type Updater = (cur: T) => T;

export function updateSubject(subj$: BehaviorSubject<T>, f: Updater) {
  subj$.next(f(subj$.getValue()));
}

export const toggleStreamEnabled =
  (stream: number): Updater =>
  (cur) => {
    const streams = [...cur.streams];
    streams[stream] = !streams[stream];
    return { ...cur, streams };
  };

const initial: T = {
  streams: Array.from(repeat(Config.NumStreams, () => true)),
};
