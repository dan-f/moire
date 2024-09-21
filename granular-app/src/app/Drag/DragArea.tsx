import { useCallback, useEffect, useState } from "react";
import { type Subject } from "rxjs";
import { DragContext, DragEventsTable } from "./DragContext";
import * as DragEvent from "./DragEvent";

interface Props {
  children: React.ReactNode;
}

export function DragArea(props: Props) {
  const { children } = props;
  const [dragEvents, setDragEvents] = useState<DragEventsTable>({});
  const [target, setTarget] = useState<string | undefined>(undefined);

  const registerTarget = useCallback(
    (target: string, events$: Subject<DragEvent.T>) => {
      setDragEvents((dragEvents) => ({ ...dragEvents, [target]: events$ }));
    },
    [],
  );

  const deregisterTarget = useCallback((target: string) => {
    setDragEvents((dragEvents) => {
      const { [target]: _, ...updated } = dragEvents;
      return updated;
    });
  }, []);

  const beginDrag = useCallback(
    (target: string, x: number, y: number) => {
      setTarget(target);
      dragEvents[target].next(DragEvent.start(x, y));
    },
    [dragEvents],
  );

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (typeof target === "undefined") {
        return;
      }
      dragEvents[target].next(DragEvent.move(e.clientX, e.clientY));
    }

    function handleMouseUp(e: MouseEvent) {
      if (typeof target === "undefined") {
        return;
      }
      setTarget(undefined);
      dragEvents[target].next(DragEvent.end(e.clientX, e.clientY));
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragEvents, target]);

  return (
    <DragContext.Provider
      value={{
        dragEvents,
        target,
        registerTarget,
        deregisterTarget,
        beginDrag,
      }}
    >
      {children}
    </DragContext.Provider>
  );
}
