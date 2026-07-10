import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // Canonical production origin (www redirects here). Feeds Astro.site, which
  // the layout uses for canonical/og URLs and the sitemap uses for entries.
  site: 'https://trashtalknyc.org',
  // Pages stay fully prerendered; the adapter exists so Astro Actions
  // (form submissions) run as on-demand Netlify functions.
  output: 'static',
  integrations: [
    // The 404 page carries noindex, so keep it out of the sitemap too.
    sitemap({ filter: (page) => !page.includes('/404') }),
  ],
  // cacheOnDemandPages lets the CDN cache function responses (mainly 404s
  // from bot scans) instead of invoking the SSR function on every miss.
  // imageCDN off: <Image> assets are optimized by sharp at build time into
  // immutable /_astro files instead of per-request Netlify Image CDN
  // transforms — zero runtime cost, consistent with the static architecture.
  adapter: netlify({ cacheOnDemandPages: true, imageCDN: false }),
});
