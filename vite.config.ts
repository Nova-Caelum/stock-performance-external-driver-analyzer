import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The app is served at /marketforces-dashboard/ (caelos.app and novacaelum.com). It is built into a folder of the
// same name inside dist/client, the Worker's assets directory, so every built file's path is its URL for both the
// Cloudflare assets router and the Node server. The build script clears dist/client first so nothing from an older
// layout is served or uploaded beside it.
const BASE = "/marketforces-dashboard/";

// The UI package is a vendored copy with its own dependencies, so React and motion
// must be deduped to a single copy or hooks break across the boundary.
export default defineConfig({
  base: BASE,
  plugins: [react()],
  resolve: { dedupe: ["react", "react-dom", "motion"] },
  server: {
    proxy: { [`${BASE}api`]: `http://127.0.0.1:${process.env.PORT ?? 3200}` },
  },
  build: { outDir: `dist/client${BASE}`, emptyOutDir: true },
});
