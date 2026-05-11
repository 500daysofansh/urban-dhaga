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
    // Warn if any chunk exceeds 400KB
    chunkSizeWarningLimit: 400,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Firebase — large, rarely changes, split into sub-chunks
          if (id.includes("firebase/auth")) return "firebase-auth";
          if (id.includes("firebase/firestore")) return "firebase-firestore";
          if (id.includes("firebase/storage")) return "firebase-storage";
          if (id.includes("firebase")) return "firebase-core";

          // Animation — framer-motion is heavy, isolate it
          if (id.includes("framer-motion")) return "framer-motion";

          // UI primitives — radix + shadcn, loaded on most pages
          if (
            id.includes("@radix-ui") ||
            id.includes("cmdk") ||
            id.includes("vaul")
          )
            return "ui";

          // Routing
          if (
            id.includes("react-router") ||
            id.includes("@remix-run")
          )
            return "router";

          // React core — keep together, always needed
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("react/jsx-runtime") ||
            id.includes("react/jsx-dev-runtime")
          )
            return "react";

          // Everything else in node_modules goes into vendor
          if (id.includes("node_modules")) return "vendor";
        },
      },
    },
  },
}));
