import { range } from "../../lib/iter";
import { Config } from "../../synth/granular";
import { type Theme } from "./theme";

export function loadTheme(): Theme {
  const theme = {
    colors: {
      foreground: getCssVar("foreground"),
      foregroundSecondary: getCssVar("foreground-secondary"),
      background: getCssVar("background"),
      backgroundSecondary: getCssVar("background-secondary"),
      stream: [...range(Config.NumStreams)].map((s) =>
        getCssVar(streamColorCssVar(s)),
      ),
    },
  };

  return theme;
}

function getCssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(
    `--${name}`,
  );
}

function streamColorCssVar(i: number): string {
  return `stream-color-${i}`;
}
