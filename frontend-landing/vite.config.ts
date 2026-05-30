import path from "node:path";
import { defineConfig, loadEnv, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";

const appDir = path.resolve(process.cwd());
const sharedDir = path.resolve(process.cwd(), "../shared");

const RUNTIME_CONFIG_KEYS = [
  "APP_SURFACE",
  "API_BASE_URL",
  "PAY_PUBLIC_BASE_URL",
  "VITE_MOBI_SLON_URL",
  "VITE_MOBI_SLON_CAMPAIGN_KEY_FACEBOOK",
  "VITE_MOBI_SLON_CAMPAIGN_KEY_GOOGLE",
  "VITE_GOOGLE_ADS_ID",
  "VITE_FB_PIXEL_ID",
  "VITE_YANDEX_METRIKA_ID",
  "VITE_TRACKING_DEBUG",
] as const;

const buildRuntimeConfigScript = (env: Record<string, string>): string => {
  const configEntries = RUNTIME_CONFIG_KEYS.map((key) => `  ${key}: ${JSON.stringify(env[key] ?? "")},`);
  return `window.__APP_CONFIG__ = {\n${configEntries.join("\n")}\n};\n`;
};

const runtimeConfigDevPlugin = (env: Record<string, string>): PluginOption => ({
  name: "landing-runtime-config-dev",
  configureServer(server) {
    server.middlewares.use("/runtime-config.js", (_req, res) => {
      res.setHeader("Content-Type", "application/javascript; charset=utf-8");
      res.end(buildRuntimeConfigScript(env));
    });
  },
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, "..", "");

  return {
    envDir: "..",
    plugins: [react(), runtimeConfigDevPlugin(env)],
    server: {
      host: "0.0.0.0",
      port: 5174,
      strictPort: true,
      fs: {
        allow: [appDir, sharedDir],
      },
    },
  };
});
