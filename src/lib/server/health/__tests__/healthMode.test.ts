import { describe, expect, it } from 'vitest';
import { HEALTH_HEADER, healthSecretMatches, isHealthRequest, planNotification } from '../healthMode';

const SECRET = '0123456789abcdef'.repeat(4);

describe('healthSecretMatches', () => {
  it('accepts only the exact configured secret', () => {
    expect(healthSecretMatches(SECRET, SECRET)).toBe(true);
    expect(healthSecretMatches(SECRET.slice(0, -1) + 'x', SECRET)).toBe(false);
    expect(healthSecretMatches(SECRET + 'x', SECRET)).toBe(false);
    expect(healthSecretMatches(SECRET.toUpperCase(), SECRET)).toBe(false);
  });

  it('refuses when nothing is presented', () => {
    expect(healthSecretMatches(null, SECRET)).toBe(false);
    expect(healthSecretMatches(undefined, SECRET)).toBe(false);
    expect(healthSecretMatches('', SECRET)).toBe(false);
  });

  it('never opens on an unset, empty, or short configured secret, even if the request matches it', () => {
    expect(healthSecretMatches('', '')).toBe(false);
    expect(healthSecretMatches(undefined, undefined)).toBe(false);
    expect(healthSecretMatches('short', 'short')).toBe(false);
  });
});

describe('isHealthRequest', () => {
  const env = (value?: string) => (name: string) => (name === 'HEALTHCHECK_SECRET' ? value : undefined);

  it('reads the secret from its header and the server env only', () => {
    expect(isHealthRequest(new Headers({ [HEALTH_HEADER]: SECRET }), env(SECRET))).toBe(true);
    expect(isHealthRequest(new Headers(), env(SECRET))).toBe(false);
    expect(isHealthRequest(new Headers({ [HEALTH_HEADER]: SECRET }), env(undefined))).toBe(false);
    // Another header carrying the secret doesn't count
    expect(isHealthRequest(new Headers({ authorization: SECRET }), env(SECRET))).toBe(false);
  });
});

describe('planNotification', () => {
  const routed = [{ email: 'podcast@trashtalknyc.org' }, { email: 'partnerships@trashtalknyc.org' }];

  it('emails the routed inboxes under the route tag for a real submission', () => {
    expect(planNotification(false, '[Podcast]', routed)).toEqual({
      to: routed,
      tag: '[Podcast]',
      routedTo: ['podcast@trashtalknyc.org', 'partnerships@trashtalknyc.org'],
    });
  });

  it('in health mode emails only fabiola@, tagged [Health check], and still reports the routed inboxes', () => {
    expect(planNotification(true, '[Podcast]', routed)).toEqual({
      to: [{ email: 'fabiola@trashtalknyc.org' }],
      tag: '[Health check] [Podcast]',
      routedTo: ['podcast@trashtalknyc.org', 'partnerships@trashtalknyc.org'],
    });
  });

  it('in health mode never lets a team inbox through', () => {
    for (const inbox of ['contact@', 'partnerships@', 'events@', 'podcast@']) {
      const plan = planNotification(true, '[General]', [{ email: `${inbox}trashtalknyc.org` }]);
      expect(plan.to).toEqual([{ email: 'fabiola@trashtalknyc.org' }]);
    }
  });
});
