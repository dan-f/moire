import { BehaviorSubject, fromEvent, map } from "rxjs";
import { loadTheme } from "./css";

export const Theme$ = new BehaviorSubject(loadTheme());

fromEvent(window.matchMedia("(prefers-color-scheme: dark)"), "change")
  .pipe(map(loadTheme))
  .subscribe(Theme$);
