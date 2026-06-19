import { resolve } from 'node:path';

import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.config';

export default defineConfig({
  plugins: [crx({ manifest })],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        onboarding: resolve(__dirname, 'src/onboarding/onboarding.html'),
        practice: resolve(__dirname, 'src/practice/practice.html'),
        devLab: resolve(__dirname, 'src/dev-lab/dev-lab.html'),
      },
    },
  },
});
