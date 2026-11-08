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
  // Declare redirects here, not in a hand-written _redirects file — the
  // Netlify adapter emits _redirects from this config at build time, so
  // this stays the single source of truth.
  redirects: {
    // The recruitment page moved from /contact/join (round 20); old
    // links must keep landing on the roles, permanently.
    '/contact/join': { status: 301, destination: '/recruit' },
    // Photo Albums became the one Gallery page (captain, 2026-10-15)
    '/more-media/photo-albums': { status: 301, destination: '/more-media/gallery' },
    '/more-media/photo-albums/the-lab': { status: 301, destination: '/more-media/gallery' },
    // Stickers on the Wall was renamed The Wall (captain, 2026-10-21)
    '/stickers-on-the-wall': { status: 301, destination: '/the-wall' },
    // Hidden until the channels are ready (captain, 2026-10-15), so
    // temporary: these pages come back when their links exist
    '/more-media/podcast': { status: 302, destination: '/more-media' },
    '/more-media/substack': { status: 302, destination: '/more-media' },
  },
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
