default: app-build

engine-build:
  cd granular-engine && wasm-pack build

app-build: engine-build app-deps (app 'build')

app-deps:
  cd granular-app && npm i

app npm_script='dev':
  cd granular-app && npm run {{npm_script}}
