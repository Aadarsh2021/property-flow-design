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
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug']
      },
      mangle: {
        safari10: true
      }
    },
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: (assetInfo) => {
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
    chunkSizeWarningLimit: 1000,
    sourcemap: false,
    reportCompressedSize: true,
    // Enable tree shaking
    treeshake: {
      moduleSideEffects: false,
      propertyReadSideEffects: false,
      unknownGlobalSideEffects: false
    },
    // Optimize dependencies
    commonjsOptions: {
      include: [/node_modules/]
    },
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Optimize asset handling
    assetsInlineLimit: 4096
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
