export type SpamVerdict =
  | { spam: false }
  | { spam: true; reason: 'honeypot' | 'too_fast' | 'link_flood' | 'markup_spam' };

export interface SpamCheckInput {
  /** Honeypot field — humans never see it, so any value means a bot. */
  botcheck?: string;
  /** Epoch-ms render timestamp set by page JS; absent on no-JS submits. */
  startedAt?: string;
  /** Free-text fields worth scanning (message, experience). */
  text?: string;
}

/** Submissions completed faster than this are almost certainly scripted. */
const MIN_FILL_TIME_MS = 3000;

/** More raw URLs than this in one free-text field reads as link spam. */
const MAX_URLS = 4;

const URL_PATTERN = /https?:\/\//gi;
const MARKUP_PATTERN = /\[url[=\]]|\[link[=\]]|<a\s+href/i;

export function checkSpam(input: SpamCheckInput, now: number = Date.now()): SpamVerdict {
  if (input.botcheck && input.botcheck.trim() !== '') {
    return { spam: true, reason: 'honeypot' };
  }

  if (input.startedAt) {
    const startedAt = Number(input.startedAt);
    // An unparseable timestamp means a bot fabricated the field; a parseable
    // one that's implausibly recent means the form was filled by script.
    if (!Number.isFinite(startedAt) || now - startedAt < MIN_FILL_TIME_MS) {
      return { spam: true, reason: 'too_fast' };
    }
  }

  if (input.text) {
    const urlCount = input.text.match(URL_PATTERN)?.length ?? 0;
    if (urlCount > MAX_URLS) return { spam: true, reason: 'link_flood' };
    if (MARKUP_PATTERN.test(input.text)) return { spam: true, reason: 'markup_spam' };
  }

  return { spam: false };
}
