import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@modules": path.resolve(__dirname, "../modules"),
      // Les modules vivent hors de /frontend (voir docs/02-architecture-modules.md) ; sans cet
      // alias, la résolution Node peut remonter au-delà de /frontend/node_modules et charger une
      // autre copie de React ailleurs sur la machine, ce qui casse les hooks (React en double).
      react: path.resolve(__dirname, "node_modules/react"),
      "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
    },
  },
  server: {
    fs: {
      allow: [path.resolve(__dirname, "..")],
    },
  },
});
