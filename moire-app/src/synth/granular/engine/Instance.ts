import { Exports } from "./Exports";
import { Imports } from "./Imports";

/**
 * Subtype of `WebAssembly.Instance` to properly type its imports & exports
 */
export interface Instance extends WebAssembly.Instance {
  exports: Exports;
}

export function newInstance(
  module: WebAssembly.Module,
  imports: Imports,
): Instance {
  return new WebAssembly.Instance(module, imports) as Instance;
}
