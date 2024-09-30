import { SynthParam } from "../../synth";

export interface T {
  param: SynthParam.T;
  enabled: boolean;
  range?: [min: number, max: number];
}

export function withDefaultRange(props: T): Required<T> {
  const { range = [0, 1], ...rest } = props;
  return { range, ...rest };
}
