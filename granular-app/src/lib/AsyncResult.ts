export type T<R> = Loading | Done<R>;

export interface Loading {
  state: ResultState.Loading;
}

export interface Done<R> {
  state: ResultState.Done;
  result: R;
}

export enum ResultState {
  Loading = "LOADING",
  Done = "DONE",
}

export function loading(): Loading {
  return { state: ResultState.Loading };
}

export function done<R>(result: R): Done<R> {
  return { state: ResultState.Done, result };
}
