import { GridLayout } from "../ui-lib/GridLayout";
import { AppContext } from "./AppContext";
import { globals } from "./AppGlobals";
import { Drag } from "./Drag";
import { Synth } from "./Synth";
import { ThemeProvider } from "./theme";

export function App() {
  return (
    <AppContext.Provider value={globals}>
      <ThemeProvider>
        <Drag.Area>
          <GridLayout>
            <Synth />
          </GridLayout>
        </Drag.Area>
      </ThemeProvider>
    </AppContext.Provider>
  );
}
