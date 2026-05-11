import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  build: {
    chunkSizeWarningLimit: 400,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Firebase and React must not be manually split —
          // they have internal circular refs that break in isolation

          // Animation — safe to split, no circular deps
          if (id.includes("framer-motion")) return "framer-motion";

          // UI primitives — safe to split
          if (
            id.includes("@radix-ui") ||
            id.includes("cmdk") ||
            id.includes("vaul")
          ) return "ui";

          // Routing — safe to split
          if (
            id.includes("react-router") ||
            id.includes("@remix-run")
          ) return "router";

          // Everything else including Firebase and React goes to vendor
          if (id.includes("node_modules")) return "vendor";
        },
      },
    },
  },
}));
