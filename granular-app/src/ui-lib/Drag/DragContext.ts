import { createContext, useContext, useEffect, useMemo } from "react";
import {
  BehaviorSubject,
  distinctUntilChanged,
  Subject,
  type Observable,
} from "rxjs";
import * as Drag from "./DragEvent";

export interface DragCtx {
  dragEvents: React.MutableRefObject<Record<string, Subject<Drag.DragEvent>>>;
  target$: BehaviorSubject<string | null>;

  registerTarget(target: string, events$: Subject<Drag.DragEvent>): void;
  deregisterTarget(target: string): void;

  beginDrag(target: string, x: number, y: number): void;
}

export type DragEventsTable = Record<string, Subject<Drag.DragEvent>>;

export const DragContext = createContext<DragCtx | null>(null);

export function useDragEvents(target: string): Observable<Drag.DragEvent> {
  const { dragEvents, registerTarget, deregisterTarget } = useDragContext();
  const events$ = useMemo(
    () => dragEvents.current[target] ?? new Subject(),
    [dragEvents, target],
  );

  useEffect(() => {
    registerTarget(target, events$);
    return () => deregisterTarget(target);
  }, [deregisterTarget, events$, registerTarget, target]);

  return useMemo(
    () => events$.pipe(distinctUntilChanged(Drag.equals)),
    [events$],
  );
}

export function useBeginDrag(): DragCtx["beginDrag"] {
  return useDragContext().beginDrag;
}

export function useDragTarget$(): Observable<string | null> {
  return useDragContext().target$;
}

function useDragContext(): DragCtx {
  const ctx = useContext(DragContext);
  if (!ctx) {
    throw new Error(
      "`useDragContext` called from outside of a `<DragContext.Provider>`",
    );
  }
  return ctx;
}
