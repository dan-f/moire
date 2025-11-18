import { Env } from "./Env";

export interface T {
  enabled: boolean;
  subdivision: number;
  grainStart: number;
  grainSizeMs: number;
  gain: number;
  tune: number;
  pan: number;
  env: Env;
}

export type Key = keyof T;
