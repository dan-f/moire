const English = {
  EnableStream: "enable stream",
  DisableStream: "disable stream",

  Increment: "increment",
  Decrement: "decrement",
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
 */
export function i18n(key: keyof Translations): string {
  let language = navigator.language.split("-")[0];
  if (!(language in Strings)) {
    language = DefaultLanguage;
  }
  return Strings[language as SupportedLanguage][key];
}
