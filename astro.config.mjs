import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';

export default defineConfig({
  // Pages stay fully prerendered; the adapter exists so Astro Actions
  // (form submissions) run as on-demand Netlify functions.
  output: 'static',
  adapter: netlify(),
});
