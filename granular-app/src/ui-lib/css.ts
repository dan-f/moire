export function classes(
  ...classNames: (string | boolean | undefined)[]
): string {
  return classNames.filter((x) => typeof x === "string").join(" ");
}

export function getCssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(
    `--${name}`,
  );
}
