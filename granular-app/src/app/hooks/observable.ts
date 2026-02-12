import { useEffect, useMemo, useState } from "react";
import { BehaviorSubject, Observable, Subject } from "rxjs";

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
 * Returns a memoized {@linkcode Subject} and bound methods
 */
export function useSubject<T>(): Subject<T> {
  const subj$ = useMemo(() => {
    const subj$ = new Subject<T>();
    subj$.next = subj$.next.bind(subj$);
    subj$.error = subj$.error.bind(subj$);
    subj$.complete = subj$.complete.bind(subj$);
    return subj$;
  }, []);

  return subj$;
}

/**
 * Returns a memoized {@linkcode BehaviorSubject} and bound methods
 */
export function useBehaviorSubject<T>(initial: T): BehaviorSubject<T> {
  const subj$ = useMemo(() => {
    const subj$ = new BehaviorSubject<T>(initial);
    subj$.next = subj$.next.bind(subj$);
    subj$.error = subj$.error.bind(subj$);
    subj$.complete = subj$.complete.bind(subj$);
    return subj$;
  }, [initial]);

  return subj$;
}

/**
 * Treat the provided {@linkcode Observable} as react state
 */
export function useObservableState<T>(obs$: Observable<T>): T | undefined;
export function useObservableState<T>(obs$: Observable<T>, initial: T): T;
export function useObservableState<T>(
  obs$: Observable<T>,
  initial?: T,
): T | undefined {
  const [state, setState] = useState(initial);
  useSubscription(obs$, setState);
  return state;
}

/**
 * Treat the provided {@linkcode BehaviorSubject} as react state
 */
export function useBehaviorSubjectState<T>(subj$: BehaviorSubject<T>): T {
  const [state, setState] = useState(subj$.value);
  useSubscription(subj$, setState);
  return state;
}
