import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const appDir = path.resolve(__dirname);

export default defineConfig({
  envDir: "..",
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5175,
    strictPort: true,
    fs: {
      allow: [appDir],
    },
  },
});
