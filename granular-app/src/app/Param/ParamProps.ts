import { SynthParam } from "../../synth";

export interface T {
  param: SynthParam.T;
  enabled: boolean;
  range?: [min: number, max: number];
  label: string;
}

export const defaultRange: [number, number] = [0, 1];
