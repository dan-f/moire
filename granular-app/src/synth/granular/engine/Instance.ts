import { Exports } from "./Exports";
import { Imports } from "./Imports";

/**
 * Subtype of `WebAssembly.Instance` to properly type its imports & exports
 */
export class Instance extends WebAssembly.Instance {
  exports!: Exports;

  constructor(module: WebAssembly.Module, imports: Imports) {
    super(module, imports);
  }
}
