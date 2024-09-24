import { range } from "../../lib/iter";
import { Config } from "../../synth/granular";
import { type Theme } from "./theme";

export function loadTheme(): Theme {
  return {
    colors: {
      stream: [...range(Config.NumStreams)].map((s) =>
        getCssVar(streamColorCssVar(s)),
      ),
    },
  };
}

function getCssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name);
}

function streamColorCssVar(i: number): string {
  return `--stream-color-${i}`;
}
