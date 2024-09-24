import { useContext } from "react";
import { Theme } from "./theme";
import { ThemeContext } from "./ThemeContext";

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);

  if (!theme) {
    throw new Error("App is missing a `<ThemeProvider>`");
  }

  return theme;
}
