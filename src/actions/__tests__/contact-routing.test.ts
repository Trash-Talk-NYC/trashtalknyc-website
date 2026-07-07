import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { upsertBrevoContact } = vi.hoisted(() => ({
  upsertBrevoContact: vi.fn().mockResolvedValue({ ok: true }),
}));
vi.mock('../../lib/server/brevo', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/server/brevo')>();
  return { ...actual, upsertBrevoContact };
});

import { server } from '../index';

function contactCtx() {
  return { clientAddress: '203.0.113.5' } as never;
}

function contactInput(overrides: Record<string, unknown> = {}) {
  return {
    fname: 'Jane',
    lname: 'Doe',
    email: 'jane@example.com',
    botcheck: '',
    startedAt: String(Date.now() - 10_000),
    inquiryType: 'general',
    organization: undefined,
    message: 'Hello there',
    ...overrides,
  };
}

describe('contact action Brevo list routing', () => {
  beforeEach(() => {
    upsertBrevoContact.mockClear();
    process.env.BREVO_API_KEY = 'test-key';
    process.env.CONTACT_GENERAL = '111';
    process.env.CONTACT_COLLAB = '222';
  });

  afterEach(() => {
    delete process.env.BREVO_API_KEY;
    delete process.env.CONTACT_GENERAL;
    delete process.env.CONTACT_COLLAB;
  });

  it('routes general inquiries to the CONTACT_GENERAL list', async () => {
    // @ts-expect-error handler is untyped once defineAction is stubbed
    await server.contact.handler(contactInput({ inquiryType: 'general' }), contactCtx());

    expect(upsertBrevoContact).toHaveBeenCalledTimes(1);
    expect(upsertBrevoContact).toHaveBeenCalledWith('test-key', expect.objectContaining({ listId: 111 }));
  });

  it('routes partnership inquiries to the CONTACT_COLLAB list', async () => {
    // @ts-expect-error handler is untyped once defineAction is stubbed
    await server.contact.handler(
      contactInput({ inquiryType: 'partnership', organization: 'Acme Org' }),
      contactCtx(),
    );

    expect(upsertBrevoContact).toHaveBeenCalledTimes(1);
    expect(upsertBrevoContact).toHaveBeenCalledWith('test-key', expect.objectContaining({ listId: 222 }));
  });
});
