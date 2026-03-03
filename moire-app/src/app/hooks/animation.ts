import { useEffect } from "react";

export function useAnimationFrame(cb: (elapsed: number, time: number) => void) {
  useEffect(() => {
    let lastTime = -1;
    let frameId: number | undefined;

    function tick(time: DOMHighResTimeStamp) {
      if (lastTime < 0) {
        lastTime = time;
      }
      cb(time - lastTime, time);
      lastTime = time;
      frameId = requestAnimationFrame(tick);
    }

    frameId = requestAnimationFrame(tick);

    return function stop() {
      if (typeof frameId === "number") {
        cancelAnimationFrame(frameId);
        frameId = undefined;
      }
    };
  }, [cb]);
}
