export type DragEvent = DragStart | DragMove | DragEnd;

export enum EventType {
  DragStart = "DragStart",
  DragMove = "DragMove",
  DragEnd = "DragEnd",
}

interface BaseDragEvent {
  type: EventType;
  slow: boolean;
  x: number;
  y: number;
}

interface DragStart extends BaseDragEvent {
  type: EventType.DragStart;
}

interface DragMove extends BaseDragEvent {
  type: EventType.DragMove;
}

interface DragEnd extends BaseDragEvent {
  type: EventType.DragEnd;
}

export function start(x: number, y: number, slow: boolean): DragStart {
  return { type: EventType.DragStart, x, y, slow };
}

export function move(x: number, y: number, slow: boolean): DragMove {
  return { type: EventType.DragMove, x, y, slow };
}

export function end(x: number, y: number, slow: boolean): DragEnd {
  return { type: EventType.DragEnd, x, y, slow };
}

export function equals(a: DragEvent, b: DragEvent): boolean {
  return a.type === b.type && a.x === b.x && a.y === b.y && a.slow === b.slow;
}
