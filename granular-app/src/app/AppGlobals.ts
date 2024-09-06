import { Synth } from "../synth";

export interface AppGlobals {
  audioCtx: AudioContext;
  synth: Synth;
}

const audioCtx = new AudioContext();
const synth = await Synth.new(audioCtx);

export const globals: AppGlobals = {
  audioCtx,
  synth,
};

// test
window.globals = globals;
