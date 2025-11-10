import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  },
  server: {
    port: 3000,
    open: true,
    hmr: {
      overlay: true, // Show errors as overlay
      port: 24678, // Use a specific port for HMR
    },
    watch: {
      // Reduce file watching for better performance
      usePolling: false,
      interval: 100,
    },
  },
  optimizeDeps: {
    include: ['@supabase/supabase-js'], // Force include supabase for proper bundling
  },
  define: {
    global: 'globalThis',
  },
})
