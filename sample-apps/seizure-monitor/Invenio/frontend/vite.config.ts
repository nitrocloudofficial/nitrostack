import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

/**
 * Vite Configuration — Project Invenio
 *
 * @see https://vitejs.dev/config/
 *
 * Future considerations:
 * - Add API proxy to FastAPI backend (localhost:8000)
 * - Add PWA plugin for offline support
 * - Configure chunk splitting for code splitting
 * - Add bundle analyzer for production builds
 */
export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      // Path aliases — mirrors tsconfig paths
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@store': path.resolve(__dirname, './src/store'),
      '@types': path.resolve(__dirname, './src/types'),
      '@constants': path.resolve(__dirname, './src/constants'),
      '@lib': path.resolve(__dirname, './src/lib'),
    },
  },

  server: {
    port: 3000,
    strictPort: true,
    // Future: proxy API calls to FastAPI backend
    // proxy: {
    //   '/api': {
    //     target: 'http://localhost:8000',
    //     changeOrigin: true,
    //   },
    // },
  },

  build: {
    outDir: 'dist',
    sourcemap: true,
    // Future: Configure chunking strategy when adding heavy libraries
    // rollupOptions: {
    //   output: {
    //     manualChunks: { ... }
    //   }
    // }
  },

  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
    },
  },
})
