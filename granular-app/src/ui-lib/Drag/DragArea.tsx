import { useCallback, useEffect, useRef } from "react";
import { type Subject } from "rxjs";
import { useBehaviorSubject } from "../../app/hooks/observable";
import { DragContext, DragEventsTable } from "./DragContext";
import * as Drag from "./DragEvent";

interface Props {
  children: React.ReactNode;
}

export function DragArea(props: Props) {
  const { children } = props;
  const dragEvents = useRef<DragEventsTable>({});
  const target$ = useBehaviorSubject<string | null>(null);

  const registerTarget = useCallback(
    (target: string, events$: Subject<Drag.DragEvent>) => {
      dragEvents.current[target] = events$;
    },
    [],
  );

  const deregisterTarget = useCallback((target: string) => {
    delete dragEvents.current[target];
  }, []);

  const beginDrag = useCallback(
    (target_: string, x: number, y: number) => {
      target$.next(target_);
      dragEvents.current[target_].next(Drag.start(x, y));
    },
    [target$],
  );

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      const curTarget = target$.value;
      if (curTarget === null) {
        return;
      }
      dragEvents.current[curTarget].next(Drag.move(e.clientX, e.clientY));
    }

    function handleMouseUp(e: MouseEvent) {
      const curTarget = target$.value;
      if (curTarget === null) {
        return;
      }
      dragEvents.current[curTarget].next(Drag.end(e.clientX, e.clientY));
      target$.next(null);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [target$]);

  return (
    <DragContext.Provider
      value={{
        dragEvents,
        target$,
        registerTarget,
        deregisterTarget,
        beginDrag,
      }}
    >
      {children}
    </DragContext.Provider>
  );
}
