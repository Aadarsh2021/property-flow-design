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

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 5173,
  },
  build: {
    target: 'esnext',
    minify: 'esbuild', // Use esbuild instead of terser for better React compatibility
    sourcemap: true, // Enable sourcemaps for debugging
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: (assetInfo) => {
          if (!assetInfo.name) {
            return `assets/[name]-[hash].[ext]`;
          }
          
          const info = assetInfo.name.split('.');
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
        manualChunks: (id) => {
          // Simplified chunk splitting to avoid React initialization issues
          if (id.includes('node_modules/react') || 
              id.includes('node_modules/react-dom') || 
              id.includes('node_modules/react-router') ||
              id.includes('node_modules/react-hook-form') ||
              id.includes('node_modules/@hookform') ||
              id.includes('node_modules/@tanstack/react-query') ||
              id.includes('node_modules/@radix-ui')) {
            return 'react-vendor';
          }
          
          // Firebase - keep separate
          if (id.includes('node_modules/firebase/')) {
            return 'firebase';
          }
          
          // Supabase
          if (id.includes('node_modules/@supabase/')) {
            return 'supabase';
          }
          
          // Everything else goes to vendor
          if (id.includes('node_modules/')) {
            return 'vendor';
          }
        }
      }
    },
    chunkSizeWarningLimit: 500,
    reportCompressedSize: true,
    // Optimize dependencies
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true
    },
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Optimize asset handling
    assetsInlineLimit: 2048, // Reduced inline limit
  },
  plugins: [
    react({
      jsxRuntime: 'automatic',
      jsxImportSource: 'react'
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "use-sync-external-store/shim": path.resolve(__dirname, "./src/lib/useSyncExternalStoreShim.ts"),
      "use-sync-external-store/shim/index.js": path.resolve(__dirname, "./src/lib/useSyncExternalStoreShim.ts"),
    },
  },
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'react-router-dom',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'react-hook-form',
      '@hookform/resolvers',
      'react-window',
      'react-resizable-panels',
      'react-day-picker',
      '@tanstack/react-query',
      '@radix-ui/react-slot',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-toast',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-accordion',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-label',
      '@radix-ui/react-popover',
      '@radix-ui/react-progress',
      '@radix-ui/react-radio-group',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-separator',
      '@radix-ui/react-switch',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toggle',
      '@radix-ui/react-toggle-group',
      'lucide-react',
      'clsx',
      'tailwind-merge',
      'zod',
      'class-variance-authority'
    ],
    force: true, // Force re-optimization
    esbuildOptions: {
      target: 'esnext',
      jsx: 'automatic'
    }
  }
}));
