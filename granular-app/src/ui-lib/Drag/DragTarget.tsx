import { useCallback, useMemo } from "react";
import { map, type Observable } from "rxjs";
import { useBeginDrag, useDragEvents, useDragTarget$ } from "./DragContext";
import { type DragEvent } from "./DragEvent";

interface Props {
  id: string;
  render: (
    dragEvents$: Observable<DragEvent>,
    dragFocus$: Observable<"current" | "other" | null>,
  ) => React.ReactNode;
  enabled: boolean;
}

export function DragTarget(props: Props) {
  const { id, render, enabled } = props;
  const dragTarget$ = useDragTarget$();
  const events$ = useDragEvents(id);
  const beginDrag = useBeginDrag();

  const dragFocus$ = useMemo(
    () =>
      dragTarget$.pipe(
        map((target) => {
          if (target === null) {
            return null;
          }
          return target === id ? "current" : "other";
        }),
      ),
    [dragTarget$, id],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (!enabled) {
        return;
      }
      e.preventDefault();
      beginDrag(id, e.clientX, e.clientY);
    },
    [beginDrag, enabled, id],
  );

  return <div onMouseDown={handleMouseDown}>{render(events$, dragFocus$)}</div>;
}
