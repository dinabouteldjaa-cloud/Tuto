import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/apple-touch-icon.png"],
      manifest: {
        name: "Tuto",
        short_name: "Tuto",
        description: "Your notes. Your schoolwork. Your study companion.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#fffaf6",
        theme_color: "#f3701b",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/icons/maskable-icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Precache the built app shell so it can launch offline once installed.
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
        // The Tuto character illustrations are large source PNGs not needed
        // for the app shell to boot offline — exclude them from precache so
        // installing the PWA stays fast. They still load normally over the
        // network like any other image.
        globIgnores: ["tuto/**"],
      },
    }),
  ],
  resolve: {
    alias: [{ find: "@", replacement: path.resolve(__dirname, "./src") }],
  },
  server: {
    port: 5173,
  },
});
