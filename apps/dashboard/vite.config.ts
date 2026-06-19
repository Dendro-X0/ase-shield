import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: '../companion/dashboard-dist',
    emptyOutDir: true,
    sourcemap: true,
  },
  server: {
    port: 1421,
    proxy: {
      '/api': 'http://127.0.0.1:47123',
      '/health': 'http://127.0.0.1:47123',
      '/ipc': 'http://127.0.0.1:47123',
    },
  },
});
