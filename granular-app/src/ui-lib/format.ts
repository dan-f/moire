export type ValueFormatter = (value: number) => string;

export const decimal: ValueFormatter = (value) => value.toFixed(2);

export const unit: (u: string) => ValueFormatter = (u) => (value) =>
  `${decimal(value)}${u}`;

export const percent: (range?: [min: number, max: number]) => ValueFormatter =
  ([min, max] = [0, 1]) =>
  (value) =>
    `${decimal(((value - min) / (max - min)) * 100)}%`;
