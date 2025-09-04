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
    port: 8080,
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: `assets/[name]-[hash].[ext]`,
        manualChunks: {
          // Core React libraries
          'react-vendor': ['react', 'react-dom'],
          'react-router': ['react-router-dom'],
          
          // UI Libraries - Split by usage
          'radix-core': ['@radix-ui/react-dialog', '@radix-ui/react-alert-dialog'],
          'radix-forms': ['@radix-ui/react-toast', '@radix-ui/react-select', '@radix-ui/react-dropdown-menu'],
          'radix-navigation': ['@radix-ui/react-navigation-menu', '@radix-ui/react-tabs'],
          
          // Utility libraries
          'utils': ['lucide-react', 'clsx', 'tailwind-merge'],
          
          // Data fetching
          'query': ['@tanstack/react-query'],
          
          // Firebase
          'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/analytics'],
          
          // Supabase
          'supabase': ['@supabase/supabase-js'],
          
          // Charts and visualization
          'charts': ['recharts'],
          
          // Form handling
          'forms': ['react-hook-form', '@hookform/resolvers', 'zod']
        }
      }
    },
    chunkSizeWarningLimit: 500,
    sourcemap: false,
    reportCompressedSize: true,
    // Enable tree shaking
    treeshake: true,
    // Optimize dependencies
    commonjsOptions: {
      include: [/node_modules/]
    }
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom']
  }
}));
