import { useEffect } from "react";
import { type Observable } from "rxjs";

export function useSubscription<T>(obs$: Observable<T>, f: (t: T) => void) {
  useEffect(() => {
    const subscription = obs$.subscribe(f);
    return () => subscription.unsubscribe();
  }, [f, obs$]);
}
