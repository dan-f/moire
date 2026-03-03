import { createContext, useContext } from "react";
import { type Synth } from "../synth/Synth";
import { AppGlobals } from "./AppGlobals";

export const AppContext = createContext<AppGlobals | null>(null);

function useAppGlobals(): AppGlobals {
  const globals = useContext(AppContext);
  if (!globals) {
    throw new Error("App is missing a `<AppContext.Provider>`");
  }
  return globals;
}

export function useSynth(): Synth {
  return useAppGlobals().synth;
}

export function useAudioCtx(): AudioContext {
  return useAppGlobals().audioCtx;
}
