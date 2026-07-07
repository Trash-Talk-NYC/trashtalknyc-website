/**
 * Stand-in for the `astro:actions` virtual module, which Astro's own vite
 * plugin generates and which plain vitest (no Astro plugin loaded) can't
 * resolve. Aliased in vitest.config.ts so action handlers in
 * src/actions/index.ts are importable and unit-testable outside of the
 * Astro dev/build pipeline.
 */
export function defineAction<T>(config: T): T {
  return config;
}

export class ActionError extends Error {
  code: string;

  constructor({ code, message }: { code: string; message?: string }) {
    super(message);
    this.code = code;
  }
}
