import { range } from "../../lib/iter";
import { Config } from "../../synth/granular";
import { getCssVar } from "../../ui-lib/css";
import { type Theme } from "./Theme";

export function loadTheme(): Theme {
  const theme = {
    colors: {
      foreground: getCssVar("foreground"),
      foregroundSecondary: getCssVar("foreground-secondary"),
      background: getCssVar("background"),
      backgroundRaised: getCssVar("background-raised"),
      backgroundRecessed: getCssVar("background-recessed"),
      stream: [...range(Config.NumStreams)].map((s) =>
        getCssVar(streamColorCssVar(s)),
      ),
    },
  };

  return theme;
}

function streamColorCssVar(i: number): string {
  return `stream-color-${i}`;
}
