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
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-alert-dialog', '@radix-ui/react-toast', '@radix-ui/react-select', '@radix-ui/react-dropdown-menu'],
          utils: ['lucide-react', 'clsx', 'tailwind-merge'],
          router: ['react-router-dom']
        }
      }
    },
    chunkSizeWarningLimit: 800,
    sourcemap: false,
    reportCompressedSize: true
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom']
  }
}));
