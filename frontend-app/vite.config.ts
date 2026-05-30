import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const appDir = path.resolve(process.cwd());
const sharedDir = path.resolve(process.cwd(), "../shared");

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "app-icon.svg",
        "flirto-badge.svg",
        "apple-touch-icon.png",
        "android-chrome-192x192.png",
        "android-chrome-512x512.png",
        "favicon.ico",
        "favicon.svg",
        "favicon-16x16.png",
        "favicon-32x32.png",
      ],
      manifest: {
        name: "Flirto Guru App",
        short_name: "Flirto App",
        description: "PWA-приложение Flirto Guru с email auth и advice flow.",
        id: "/app",
        theme_color: "#f5f4f7",
        background_color: "#f5f4f7",
        display: "standalone",
        display_override: ["standalone", "minimal-ui"],
        start_url: "/app",
        scope: "/",
        icons: [
          {
            src: "/app-icon.svg",
            sizes: "any",
            type: "image/svg+xml",
          },
          {
            src: "/apple-touch-icon.png",
            sizes: "180x180",
            type: "image/png",
          },
          {
            src: "/android-chrome-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/android-chrome-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === "style" || request.destination === "script" || request.destination === "image",
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "static-assets",
            },
          },
          {
            urlPattern: ({ url }) =>
              url.pathname === "/api/app/auth/refresh" || url.pathname === "/api/app/access-status",
            handler: "NetworkFirst",
            method: "GET",
            options: {
              cacheName: "auth-shell",
              networkTimeoutSeconds: 3,
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
            handler: "NetworkOnly",
          },
        ],
      },
    }),
  ],
  server: {
    fs: {
      allow: [appDir, sharedDir],
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
  },
});
