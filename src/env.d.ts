/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** Cloudflare Turnstile site key (public); widget renders only when set at build time. */
  readonly PUBLIC_TURNSTILE_SITE_KEY?: string;
}

/**
 * Minimal surface of the Turnstile client API (loaded from
 * challenges.cloudflare.com/turnstile/v0/api.js) used by the form scripts.
 * Absent when no site key was set at build time, hence optional.
 */
interface Window {
  turnstile?: {
    reset: (widget?: string | HTMLElement) => void;
  };
}
