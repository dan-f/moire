import { distinctUntilChanged, map, pipe, type OperatorFunction } from "rxjs";

export type Selector<T, R> = (t: T) => R;

export function select<T, R>(
  selector: Selector<T, R>,
  comparator?: Parameters<typeof distinctUntilChanged<R>>[0],
): OperatorFunction<T, R> {
  return pipe(map(selector), distinctUntilChanged(comparator));
}
