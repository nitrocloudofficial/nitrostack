import { defineConfig } from 'vite';
import mkcert from 'vite-plugin-mkcert';

export default defineConfig({
  plugins: [mkcert()],
  server: {
    port: 5173,
    proxy: {
      '/mcp-api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/mcp-api/, '/mcp')
      }
    }
  }
});

