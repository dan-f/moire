import { WebMidi } from "webmidi";
import { log } from "./log";

export async function init(): Promise<typeof WebMidi> {
  try {
    await WebMidi.enable();
    return WebMidi;
  } catch (error) {
    log.info("could not enable MIDI", error as Error);
    return WebMidi;
  }
}
