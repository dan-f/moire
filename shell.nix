{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  packages = [
    pkgs.just
    pkgs.nodejs_22
  ];
}
