engine_dir := "granular-engine"
app_dir := "granular-app"

default: dev

dev: (build-engine) (app 'dev')

build: (build-engine) (app 'build')

preview: (build-engine) (app 'preview')

test: (engine 'test')

build-engine: (engine 'build')
  cp \
    {{engine_dir}}/target/wasm32-unknown-unknown/release/granular_engine.wasm \
    {{app_dir}}/src/synth/granular/engine/

app recipe *ARGS:
  just {{app_dir}}/{{recipe}} {{ARGS}}

engine recipe *ARGS:
  just {{engine_dir}}/{{recipe}} {{ARGS}}
