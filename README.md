# granular

A work-in-progress browser-based polyrhithmic granular synthesizer. It operates on multiple dynamic "streams", each of which acts as a sort of playhead over the sample. Streams can be combined using relative rhythmic subdivisions and pitch shifting.

## TODO

- [ ] clock streams to other streams
- [ ] control parameters of running streams
- [ ] controlled randomization
- [ ] ui
- [ ] midi

## Developing

Install the dependencies:

- [rustup](https://rustup.rs/)
- [nix](https://nixos.org/download/)
  - Run `nix shell` (or use `nix-direnv`) for a functioning environment
  - Otherwise if you aren't using `nix`, make sure all of the dependencies listed in the [shell.nix](./shell.nix) are available

Scripts for testing, running, and building are in the [justfile](https://just.systems/).
