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
    target: ["es2020", "edge88", "firefox78", "chrome87", "safari14"], // ← ADD THIS
    chunkSizeWarningLimit: 400,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("framer-motion")) return "framer-motion";
          if (
            id.includes("@radix-ui") ||
            id.includes("cmdk") ||
            id.includes("vaul")
          ) return "ui";
          if (
            id.includes("react-router") ||
            id.includes("@remix-run")
          ) return "router";
          if (id.includes("node_modules")) return "vendor";
        },
      },
    },
  },
}));
