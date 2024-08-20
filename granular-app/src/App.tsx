// import init from "granular-engine/granular_engine_bg.wasm?init";
// import * as engine from "granular-engine";
import init from "granular-engine";
import { useEffect, useState } from "react";
import cls from "./App.module.css";

function App() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    init().then((thing) => {
      thing.greet();
    });

    // engine.greet();
    // init().then((instance) => {
    //   instance.exports.greet();
    // });
  }, []);

  return (
    <>
      <h1>Vite + React</h1>
      <div className={cls.card}>
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
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
