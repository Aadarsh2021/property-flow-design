/**
 * Vite Configuration
 * 
 * This file configures the Vite build tool for the Property Flow Design
 * frontend application with optimized settings for development and production.
 * 
 * Features:
 * - React plugin with SWC for fast compilation
 * - Path aliases for clean imports
 * - Code splitting and optimization
 * - Development server configuration
 * - Build optimization settings
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(() => ({
  server: {
    host: "::",
    port: 5173,
  },
  build: {
    target: "esnext",
    minify: "esbuild",
    sourcemap: true,
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: (assetInfo) => {
          if (!assetInfo.name) {
            return `assets/[name]-[hash].[ext]`;
          }

          const info = assetInfo.name.split(".");
          const ext = info[info.length - 1];

          if (/\.(css)$/.test(assetInfo.name)) {
            return `assets/css/[name]-[hash].${ext}`;
          }
          if (/\.(png|jpe?g|gif|svg|webp|avif)$/.test(assetInfo.name)) {
            return `assets/images/[name]-[hash].${ext}`;
          }
          if (/\.(woff2?|eot|ttf|otf)$/.test(assetInfo.name)) {
            return `assets/fonts/[name]-[hash].${ext}`;
          }

          return `assets/[name]-[hash].${ext}`;
        },
      },
    },
    chunkSizeWarningLimit: 500,
    reportCompressedSize: true,
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
    cssCodeSplit: true,
    assetsInlineLimit: 2048,
  },
  plugins: [react()],
  resolve: {
    alias: [{ find: "@", replacement: path.resolve(__dirname, "./src") }],
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "react-hook-form",
      "@hookform/resolvers",
      "react-window",
      "react-resizable-panels",
      "react-day-picker",
      "@tanstack/react-query",
      "@radix-ui/react-slot",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-toast",
      "@radix-ui/react-tooltip",
      "@radix-ui/react-accordion",
      "@radix-ui/react-alert-dialog",
      "@radix-ui/react-avatar",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-label",
      "@radix-ui/react-popover",
      "@radix-ui/react-progress",
      "@radix-ui/react-radio-group",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-separator",
      "@radix-ui/react-switch",
      "@radix-ui/react-tabs",
      "@radix-ui/react-toggle",
      "@radix-ui/react-toggle-group",
      "lucide-react",
      "clsx",
      "tailwind-merge",
      "zod",
      "class-variance-authority",
    ],
    force: true,
    esbuildOptions: {
      target: "esnext",
      jsx: "automatic",
    },
  },
}));
