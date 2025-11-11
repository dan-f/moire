import { Env } from "./Env";

export interface T {
  subdivision: number;
  grainStart: number;
  grainSizeMs: number;
  gain: number;
  tune: number;
  pan: number;
  env: Env;
}

export type Key = keyof T;

export const initial: T = {
  subdivision: 1,
  grainStart: 0,
  grainSizeMs: 150,
  gain: 1,
  tune: 0,
  pan: 0.5,
  env: Env.Tri,
};
