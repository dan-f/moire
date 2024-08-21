import { useState } from "react";
import cls from "./App.module.css";
import { Synth } from "./synth/Synth";

const synth = await Synth.new();

function App() {
  const [audioCtxState, setAudioCtxState] = useState(synth.ctxState);

  function handleClick() {
    if (audioCtxState === "suspended") {
      synth.start().then((ctxState) => setAudioCtxState(ctxState));
    }
  }

  return (
    <>
      <h1>Vite + React</h1>
      <div className={cls.card}>
        <button onClick={handleClick}>
          AudioContext state is {synth.ctxState}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className={cls["read-the-docs"]}>
        Click on the Vite and React logos to learn more
      </p>
    </>
  );
}

export default App;
