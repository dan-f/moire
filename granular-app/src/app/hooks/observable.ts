import { useEffect, useState } from "react";
import { type Observable } from "rxjs";

/**
 * Run an effect on every emitted value from the observable
 */
export function useSubscription<T>(obs$: Observable<T>, f: (t: T) => void) {
  useEffect(() => {
    const subscription = obs$.subscribe(f);
    return () => subscription.unsubscribe();
  }, [f, obs$]);
}

/**
 * Treat the provided observable as react state
 */
export function useObservableState<T>(obs$: Observable<T>): T | undefined;
export function useObservableState<T>(obs$: Observable<T>, initial: T): T;
export function useObservableState<T>(
  obs$: Observable<T>,
  initial?: T,
): T | undefined {
  const [state, setState] = useState<T | undefined>(initial);
  useSubscription(obs$, setState);
  return state;
}
