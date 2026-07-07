import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      // `astro:actions` is a virtual module Astro's vite plugin provides;
      // plain vitest needs a stand-in to import src/actions/index.ts.
      'astro:actions': fileURLToPath(new URL('./test/stubs/astro-actions.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'happy-dom',
  },
});
