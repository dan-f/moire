export function* range(n: number): Generator<number> {
  for (let i = 0; i < n; i++) {
    yield i;
  }
}

export function* repeat<T>(n: number, fn: (i: number) => T): Generator<T> {
  for (let i = 0; i < n; i++) {
    yield fn(i);
  }
}
