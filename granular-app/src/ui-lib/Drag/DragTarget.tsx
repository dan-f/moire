import { type Observable } from "rxjs";
import { useBeginDrag, useDragEvents } from "./DragContext";
import { type DragEvent } from "./DragEvent";

interface Props {
  id: string;
  render: (dragEvents$: Observable<DragEvent>) => React.ReactNode;
}

export function DragTarget(props: Props) {
  const { id, render } = props;
  const events$ = useDragEvents(id);
  const beginDrag = useBeginDrag();

  const handleMouseDown = (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault();
    beginDrag(id, e.clientX, e.clientY);
  };

  return <div onMouseDown={handleMouseDown}>{render(events$)}</div>;
}
