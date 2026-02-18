const English = {
  EnableStream: "enable stream",
  DisableStream: "disable stream",
  SelectSource: "select source",
  SelectTarget: "select target",

  Increment: "increment",
  Decrement: "decrement",
  Milliseconds: "ms",
  Bpm: "bpm",
  Dry: "dry",
  Wet: "wet",
  Center: "center",
  Left: "left",
  Right: "right",
  Lfo: "lfo",

  level: "level",
  drive: "drive",
  reverb: "reverb",
  tempo: "tempo",
  attack: "attack",
  sustain: "sustain",
  decay: "decay",
  release: "release",
  subdivision: "subdivision",
  start: "start",
  size: "size",
  probability: "probability",
  gain: "gain",
  tune: "tune",
  pan: "pan",
  env: "env",
};

type SupportedLanguage = "en";

const DefaultLanguage = "en";

type Translations = typeof English;

export const Strings: Record<SupportedLanguage, Translations> = {
  en: English,
};

/**
 * Hold-over for proper i18n, as only English is supported with no interpolation
 * or pluralization. This mostly just exists to keep string definitions outside
 * of component files.
 *
 * TODO if/when actually addressing i18n, replace this function with a
 * dynamically-defined one in react context so that we can deal with possible
 * changes to the navigator's language a la theming. Injecting the `i18n`
 * function also means we can't refer to it from static positions (e.g.
 * `GranularParamDefs`) and instead will need to inject.
 */
export function i18n(key: keyof Translations): string {
  return Strings[language() as SupportedLanguage][key];
}

// TODO remove hack with what's described above
function language(): string {
  if (typeof navigator === "undefined") {
    return DefaultLanguage;
  }
  const language = navigator.language.split("-")[0];
  return language in Strings ? language : DefaultLanguage;
}
