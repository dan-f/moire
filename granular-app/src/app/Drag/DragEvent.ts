export type T = DragStart | DragMove | DragEnd;

export enum EventType {
  DragStart = "DragStart",
  DragMove = "DragMove",
  DragEnd = "DragEnd",
}

interface BaseDragEvent {
  type: EventType;
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

export function start(x: number, y: number): DragStart {
  return { type: EventType.DragStart, x, y };
}

export function move(x: number, y: number): DragMove {
  return { type: EventType.DragMove, x, y };
}

export function end(x: number, y: number): DragEnd {
  return { type: EventType.DragEnd, x, y };
}

export function equals(a: T, b: T): boolean {
  return a.type === b.type && a.x === b.x && a.y === b.y;
}
