import { AppContext } from "./AppContext";
import { globals } from "./AppGlobals";
import { Drag } from "./Drag";
import { Synth } from "./Synth";

export function App() {
  return (
    <AppContext.Provider value={globals}>
      <Drag.Area>
        <Synth />
      </Drag.Area>
    </AppContext.Provider>
  );
}
