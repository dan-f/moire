engine_dir := "granular-engine"
app_dir := "granular-app"

default: dev

dev: app-build (app 'dev')

preview: app-build (app 'preview')

engine-build:
  cd {{engine_dir}} && cargo build --release
  cp \
    {{engine_dir}}/target/wasm32-unknown-unknown/release/granular_engine.wasm \
    {{app_dir}}/src/assets/

disassemble: engine-build
  wasm2wat {{engine_dir}}/target/wasm32-unknown-unknown/release/granular_engine.wasm -o granular_engine.wat

app-build: engine-build app-deps (app 'build')

app-deps:
  cd {{app_dir}} && npm i

app npm_script='dev':
  cd {{app_dir}} && npm run {{npm_script}}
