import { SynthParam } from "../../synth";

export interface T {
  param: SynthParam.T;
  range?: [min: number, max: number];
}

export function withDefaultRange(props: T): Required<T> {
  const { param, range = [0, 1] } = props;
  return { param, range };
}
