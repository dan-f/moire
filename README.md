# granular

## Developing

Install the dependencies:

- [rustup](https://rustup.rs/)
- [wasm-pack](https://rustwasm.github.io/wasm-pack/installer/)
- [nix](https://nixos.org/download/)

Ideally nix would manage rustup & wasm-pack, but this isn't working currently. If you don't want to use nix, manually install the dependencies listed in the [shell.nix](./shell.nix). Assuming you are using nix, run `nix shell` to get a functioning development session.
