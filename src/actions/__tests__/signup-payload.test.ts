import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { upsertBrevoContact, getBrevoContactId, createBrevoNote } = vi.hoisted(() => ({
  upsertBrevoContact: vi.fn().mockResolvedValue({ ok: true }),
  getBrevoContactId: vi.fn().mockResolvedValue({ ok: true, id: 1 }),
  createBrevoNote: vi.fn().mockResolvedValue({ ok: true }),
}));
vi.mock('../../lib/server/brevo', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/server/brevo')>();
  return { ...actual, upsertBrevoContact, getBrevoContactId, createBrevoNote };
});
// No network in tests: a fixed NYC ZIP lookup
vi.mock('../../lib/server/location', () => ({
  resolveSignupLocation: vi.fn().mockResolvedValue({
    ok: true,
    zipLookup: 'found',
    location: { COUNTRY: 'United States', CITY: 'New York City', STATE_REGION: 'New York', ZIP_CODE: '10033', BOROUGH: 'Manhattan' },
  }),
}));

import { server } from '../index';

const ctx = { clientAddress: '203.0.113.9' } as never;

function signupInput(overrides: Record<string, unknown> = {}) {
  return {
    fname: 'Jane',
    lname: 'Doe',
    email: 'jane@example.com',
    botcheck: '',
    startedAt: String(Date.now() - 10_000),
    country: 'United States',
    zip: '10033',
    hear: 'Word of Mouth',
    ...overrides,
  };
}

async function sentAttributes(overrides: Record<string, unknown> = {}) {
  // @ts-expect-error handler is untyped once defineAction is stubbed
  await server.signup.handler(signupInput(overrides), ctx);
  expect(upsertBrevoContact).toHaveBeenCalledTimes(1);
  return upsertBrevoContact.mock.calls[0][1].attributes as Record<string, unknown>;
}

describe('signup Brevo payload', () => {
  beforeEach(() => {
    upsertBrevoContact.mockClear();
    process.env.BREVO_API_KEY = 'test-key';
    process.env.BREVO_LIST_ID_SIGNUP = '9';
  });

  afterEach(() => {
    delete process.env.BREVO_API_KEY;
    delete process.env.BREVO_LIST_ID_SIGNUP;
  });

  // The waiver, 18+, photo-consent, and "Anything we should know?" fields
  // came off the newsletter (team round 3, captain 2026-11-08). Leaving the
  // attributes out keeps older signups' Brevo values; sending false would
  // overwrite them.
  it('no longer sends WAIVER_ACCEPTED, PHOTO_CONSENT, or MESSAGE', async () => {
    const attrs = await sentAttributes();
    expect(attrs).not.toHaveProperty('WAIVER_ACCEPTED');
    expect(attrs).not.toHaveProperty('PHOTO_CONSENT');
    expect(attrs).not.toHaveProperty('MESSAGE');
  });

  it('ignores the old fields when a cached page still posts them', async () => {
    const attrs = await sentAttributes({ waiverCheck: 'on', ageCheck: 'on', photoConsent: 'on', experience: 'Hi' });
    expect(attrs).not.toHaveProperty('WAIVER_ACCEPTED');
    expect(attrs).not.toHaveProperty('PHOTO_CONSENT');
    expect(attrs).not.toHaveProperty('MESSAGE');
  });

  it('keeps the text attributes as strings', async () => {
    const attrs = await sentAttributes();
    expect(attrs.FIRSTNAME).toBe('Jane');
    expect(attrs.BOROUGH).toBe('Manhattan');
    expect(attrs.ZIP_CODE).toBe('10033');
  });
});
