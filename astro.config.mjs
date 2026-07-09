import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';

export default defineConfig({
  // Pages stay fully prerendered; the adapter exists so Astro Actions
  // (form submissions) run as on-demand Netlify functions.
  output: 'static',
  // cacheOnDemandPages lets the CDN cache function responses (mainly 404s
  // from bot scans) instead of invoking the SSR function on every miss.
  // imageCDN off: <Image> assets are optimized by sharp at build time into
  // immutable /_astro files instead of per-request Netlify Image CDN
  // transforms — zero runtime cost, consistent with the static architecture.
  adapter: netlify({ cacheOnDemandPages: true, imageCDN: false }),
});
