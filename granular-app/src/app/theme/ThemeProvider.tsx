import { useBehaviorSubjectState } from "../hooks/observable";
import { Theme$ } from "./observable";
import { ThemeContext } from "./ThemeContext";

interface Props {
  children: React.ReactNode;
}

export function ThemeProvider(props: Props) {
  const theme = useBehaviorSubjectState(Theme$);

  return (
    <ThemeContext.Provider value={theme}>
      {props.children}
    </ThemeContext.Provider>
  );
}
