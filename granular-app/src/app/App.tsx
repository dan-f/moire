import { DragArea } from "../ui-lib/Drag";
import { GridLayout } from "../ui-lib/GridLayout";
import { AppContext } from "./AppContext";
import { globals } from "./AppGlobals";
import { Synth } from "./Synth";
import { ThemeProvider } from "./theme";

export function App() {
  return (
    <AppContext.Provider value={globals}>
      <ThemeProvider>
        <DragArea>
          <GridLayout>
            <Synth />
          </GridLayout>
        </DragArea>
      </ThemeProvider>
    </AppContext.Provider>
  );
}
