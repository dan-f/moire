import { AppContext } from "./AppContext";
import { globals } from "./AppGlobals";
import { Synth } from "./Synth";

export function App() {
  return (
    <AppContext.Provider value={globals}>
      <Synth />
    </AppContext.Provider>
  );
}
