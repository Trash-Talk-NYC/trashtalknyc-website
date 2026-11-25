import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { upsertBrevoContact, getBrevoContactId, createBrevoNote, sendBrevoEmail } = vi.hoisted(() => ({
  upsertBrevoContact: vi.fn().mockResolvedValue({ ok: true }),
  getBrevoContactId: vi.fn().mockResolvedValue({ ok: true, id: 1 }),
  createBrevoNote: vi.fn().mockResolvedValue({ ok: true }),
  sendBrevoEmail: vi.fn().mockResolvedValue({ ok: true, messageId: '<abc@smtp-relay.mailin.fr>' }),
}));
vi.mock('../../lib/server/brevo', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/server/brevo')>();
  return { ...actual, upsertBrevoContact, getBrevoContactId, createBrevoNote, sendBrevoEmail };
});

import { server } from '../index';
import { HEALTH_HEADER } from '../../lib/server/health/healthMode';

const SECRET = 'a'.repeat(64);

function ctx(headers: Record<string, string> = {}) {
  return { clientAddress: '203.0.113.5', request: new Request('https://trashtalknyc.org/_actions/contact', { method: 'POST', headers }) } as never;
}

function contactInput(overrides: Record<string, unknown> = {}) {
  return {
    fname: 'Jane',
    lname: 'Doe',
    email: 'jane@example.com',
    botcheck: '',
    startedAt: String(Date.now() - 10_000),
    inquiryType: 'partnership',
    partnershipType: ['podcast'],
    organization: 'Acme Org',
    message: 'Hello there',
    ...overrides,
  };
}

const ENV = {
  BREVO_API_KEY: 'test-key',
  CONTACT_GENERAL: '10',
  CONTACT_COLLAB: '11',
  CONTACT_SPONSOR: '13',
  CONTACT_NOTIFY_FROM: 'site@trashtalknyc.org',
  CONTACT_NOTIFY_TO: 'contact@trashtalknyc.org',
  PARTNER_CONTENT_NOTIFY_TO: 'partnerships@trashtalknyc.org',
  PODCAST_NOTIFY_TO: 'podcast@trashtalknyc.org',
  // Turnstile is live, so a token-less submission must fail unless health mode skips it
  PUBLIC_TURNSTILE_SITE_KEY: 'site-key',
  TURNSTILE_SECRET_KEY: 'turnstile-secret',
  HEALTHCHECK_SECRET: SECRET,
};

describe('contact action in health mode', () => {
  beforeEach(() => {
    Object.assign(process.env, ENV);
    upsertBrevoContact.mockClear();
    sendBrevoEmail.mockClear();
  });

  afterEach(() => {
    for (const key of Object.keys(ENV)) delete process.env[key];
  });

  it('skips Turnstile, pins the fixed contact, and emails only fabiola@ while reporting the routed inboxes', async () => {
    // @ts-expect-error handler is untyped once defineAction is stubbed
    const result = await server.contact.handler(contactInput(), ctx({ [HEALTH_HEADER]: SECRET }));

    expect(upsertBrevoContact).toHaveBeenCalledWith('test-key', expect.objectContaining({ email: 'healthcheck@trashtalknyc.org', listId: 11 }));
    expect(upsertBrevoContact.mock.calls[0][1].attributes).toMatchObject({ FIRSTNAME: 'Site', LASTNAME: 'Health Check' });
    expect(sendBrevoEmail).toHaveBeenCalledTimes(1);
    const sent = sendBrevoEmail.mock.calls[0][1];
    expect(sent.to).toEqual([{ email: 'fabiola@trashtalknyc.org' }]);
    expect(sent.subject.startsWith('[Health check] [Podcast]')).toBe(true);
    expect(result).toEqual({
      ok: true,
      health: {
        listId: 11,
        routedTo: ['podcast@trashtalknyc.org', 'partnerships@trashtalknyc.org'],
        unset: [],
        messageId: '<abc@smtp-relay.mailin.fr>',
        notifyError: undefined,
      },
    });
  });

  it('refuses a wrong secret the same as no secret: Turnstile still applies and nothing is sent', async () => {
    for (const headers of [{ [HEALTH_HEADER]: 'b'.repeat(64) }, {}]) {
      // @ts-expect-error handler is untyped once defineAction is stubbed
      await expect(server.contact.handler(contactInput(), ctx(headers))).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    }
    expect(upsertBrevoContact).not.toHaveBeenCalled();
    expect(sendBrevoEmail).not.toHaveBeenCalled();
  });

  it('never opens without a configured secret, even when the header is sent empty-matched', async () => {
    delete process.env.HEALTHCHECK_SECRET;
    // @ts-expect-error handler is untyped once defineAction is stubbed
    await expect(server.contact.handler(contactInput(), ctx({ [HEALTH_HEADER]: '' }))).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(upsertBrevoContact).not.toHaveBeenCalled();
  });

  it('keeps a real visitor on their own address and the real inboxes', async () => {
    process.env.PUBLIC_TURNSTILE_SITE_KEY = '';
    // @ts-expect-error handler is untyped once defineAction is stubbed
    const result = await server.contact.handler(contactInput(), ctx());
    expect(result).toEqual({ ok: true });
    expect(upsertBrevoContact.mock.calls[0][1].email).toBe('jane@example.com');
    expect(sendBrevoEmail.mock.calls[0][1].to).toEqual([{ email: 'podcast@trashtalknyc.org' }, { email: 'partnerships@trashtalknyc.org' }]);
  });
});
