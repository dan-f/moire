import { useObservableState } from "../hooks/observable";
import { loadTheme } from "./css";
import { Theme$ } from "./observable";
import { ThemeContext } from "./ThemeContext";

interface Props {
  children: React.ReactNode;
}

export function ThemeProvider(props: Props) {
  const theme = useObservableState(Theme$, InitialTheme);

  return (
    <ThemeContext.Provider value={theme}>
      {props.children}
    </ThemeContext.Provider>
  );
}

const InitialTheme = loadTheme();
