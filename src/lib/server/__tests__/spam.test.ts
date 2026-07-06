import { describe, expect, it } from 'vitest';
import { checkSpam } from '../spam';

const NOW = 1_750_000_000_000;

describe('checkSpam', () => {
  it('passes a clean human-speed submission', () => {
    const verdict = checkSpam(
      { botcheck: '', startedAt: String(NOW - 30_000), text: 'I would love to help clean my block.' },
      NOW,
    );
    expect(verdict.spam).toBe(false);
  });

  it('passes when the timing field is absent (no-JS submission)', () => {
    expect(checkSpam({ botcheck: '' }, NOW).spam).toBe(false);
  });

  it('flags a filled honeypot', () => {
    const verdict = checkSpam({ botcheck: 'http://spam.example' }, NOW);
    expect(verdict).toEqual({ spam: true, reason: 'honeypot' });
  });

  it('flags submissions completed implausibly fast', () => {
    const verdict = checkSpam({ startedAt: String(NOW - 500) }, NOW);
    expect(verdict).toEqual({ spam: true, reason: 'too_fast' });
  });

  it('flags a fabricated non-numeric timestamp', () => {
    const verdict = checkSpam({ startedAt: 'yesterday' }, NOW);
    expect(verdict).toEqual({ spam: true, reason: 'too_fast' });
  });

  it('flags link-flooded text', () => {
    const text = Array.from({ length: 6 }, (_, i) => `https://spam${i}.example`).join(' ');
    expect(checkSpam({ text }, NOW)).toEqual({ spam: true, reason: 'link_flood' });
  });

  it('allows a couple of legitimate links', () => {
    expect(checkSpam({ text: 'See https://a.example and https://b.example' }, NOW).spam).toBe(false);
  });

  it('flags BBCode/HTML markup spam', () => {
    expect(checkSpam({ text: 'buy [url=http://x.example]here[/url]' }, NOW)).toEqual({ spam: true, reason: 'markup_spam' });
    expect(checkSpam({ text: 'click <a href="http://x.example">now</a>' }, NOW)).toEqual({ spam: true, reason: 'markup_spam' });
  });
});
