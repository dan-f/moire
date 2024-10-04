export function classes(...classNames: (string | undefined)[]): string {
  return classNames.filter((x) => typeof x !== "undefined").join(" ");
}
export function getCssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(
    `--${name}`,
  );
}
