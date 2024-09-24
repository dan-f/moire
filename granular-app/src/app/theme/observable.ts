import { fromEvent, map } from "rxjs";
import { loadTheme } from "./css";

export const theme$ = fromEvent(
  window.matchMedia("(prefers-color-scheme: dark)"),
  "change",
).pipe(map(loadTheme));
