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
    waiverCheck: 'on',
    ageCheck: 'on',
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

  // Brevo drops string values for boolean attributes without an error,
  // which is how WAIVER_ACCEPTED went unrecorded — these must be booleans
  it('sends WAIVER_ACCEPTED and PHOTO_CONSENT as real JSON booleans', async () => {
    const attrs = await sentAttributes({ photoConsent: 'on' });
    expect(attrs.WAIVER_ACCEPTED).toBe(true);
    expect(attrs.PHOTO_CONSENT).toBe(true);
  });

  it('sends PHOTO_CONSENT false (still a boolean) when the box is unchecked', async () => {
    const attrs = await sentAttributes();
    expect(attrs.PHOTO_CONSENT).toBe(false);
    expect(typeof attrs.WAIVER_ACCEPTED).toBe('boolean');
  });

  it('keeps the text attributes as strings', async () => {
    const attrs = await sentAttributes();
    expect(attrs.FIRSTNAME).toBe('Jane');
    expect(attrs.BOROUGH).toBe('Manhattan');
    expect(attrs.ZIP_CODE).toBe('10033');
  });
});
