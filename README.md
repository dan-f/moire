# moire

A polyrhythmic granular synthesizer for the web.

## Developing

Install the dependencies:

- [rustup](https://rustup.rs/)
- [nix](https://nixos.org/download/)
  - Run `nix shell` (or use `nix-direnv`) for a functioning environment
  - Otherwise if you aren't using `nix`, make sure all of the dependencies listed in the [shell.nix](./shell.nix) are available

Scripts for testing, running, and building are in the [justfile](https://just.systems/).

## Overview

From a birds-eye view, the [moire UI](./moire-app/) drives the web audio API to ultimately produce sound. In web audio (and other realtime audio APIs), audio signals flow through a directed graph of processors or nodes. The bulk of the synthesizer's behavior is implemented within a single [`AudioWorkletNode`](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletNode), with that [code](./moire-engine/) being written in rust and compiled to WebAssembly for predictable performance.

Note that the engine is compiled ["the hard way"](https://surma.dev/things/rust-to-webassembly/), as the `wasm-pack` / `wasm-bindgen` approach generated JS that was incompatible with the `AudioWorkletGlobalScope`. All wasm exports are exported from the [crate root](./moire-engine/src/lib.rs).
