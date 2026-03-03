export type AsyncResult<R> = Loading<R> | Done<R>;

export interface Loading<R> {
  state: ResultState.Loading;
  result?: R;
}

export interface Done<R> {
  state: ResultState.Done;
  result: R;
}

export enum ResultState {
  Loading = "LOADING",
  Done = "DONE",
}

export function loading<R>(result: R | undefined): Loading<R> {
  return { state: ResultState.Loading, result };
}

export function done<R>(result: R): Done<R> {
  return { state: ResultState.Done, result };
}
