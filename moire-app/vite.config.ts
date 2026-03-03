import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: { target: "esnext" },
  // Makes `SharedArrayBuffer` available. See https://github.com/chaosprint/vite-plugin-cross-origin-isolation/issues/3#issuecomment-1126879870
  server: {
    headers: {
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
  },
});
