/**
 * Exports of the WASM granular engine module
 */
export interface Imports extends WebAssembly.Imports {
  Math: {
    random(): number;
  };
}
