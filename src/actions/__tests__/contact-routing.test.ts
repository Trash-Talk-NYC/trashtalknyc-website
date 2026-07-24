import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { upsertBrevoContact, getBrevoContactId, createBrevoNote, sendBrevoEmail } = vi.hoisted(() => ({
  upsertBrevoContact: vi.fn().mockResolvedValue({ ok: true }),
  getBrevoContactId: vi.fn().mockResolvedValue({ ok: true, id: 1 }),
  createBrevoNote: vi.fn().mockResolvedValue({ ok: true }),
  sendBrevoEmail: vi.fn().mockResolvedValue({ ok: true }),
}));
vi.mock('../../lib/server/brevo', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/server/brevo')>();
  return { ...actual, upsertBrevoContact, getBrevoContactId, createBrevoNote, sendBrevoEmail };
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

  it('records the message as a CRM note tagged with the tab-specific form name', async () => {
    getBrevoContactId.mockClear();
    createBrevoNote.mockClear();

    // @ts-expect-error handler is untyped once defineAction is stubbed
    await server.contact.handler(
      contactInput({ inquiryType: 'partnership', organization: 'Acme Org', message: 'Let us collaborate' }),
      contactCtx(),
    );

    expect(getBrevoContactId).toHaveBeenCalledWith('test-key', 'jane@example.com');
    expect(createBrevoNote).toHaveBeenCalledTimes(1);
    const noteText = createBrevoNote.mock.calls[0][2] as string;
    expect(noteText).toMatch(/^form=contact-collab \| field=message \| submitted=/);
    expect(noteText).toContain('Let us collaborate');
  });

  it('does not fail the submission when note creation fails', async () => {
    createBrevoNote.mockResolvedValueOnce({ ok: false, status: 400, detail: 'invalid_parameter' });

    // @ts-expect-error handler is untyped once defineAction is stubbed
    const result = await server.contact.handler(contactInput(), contactCtx());

    expect(result).toEqual({ ok: true });
  });

  it('does not fail the submission when the note flow throws unexpectedly', async () => {
    getBrevoContactId.mockRejectedValueOnce(new Error('boom: unexpected'));

    // @ts-expect-error handler is untyped once defineAction is stubbed
    const result = await server.contact.handler(contactInput(), contactCtx());
    expect(result).toEqual({ ok: true });

    createBrevoNote.mockRejectedValueOnce(new Error('boom: note post'));
    // @ts-expect-error handler is untyped once defineAction is stubbed
    const result2 = await server.contact.handler(contactInput(), contactCtx());
    expect(result2).toEqual({ ok: true });
  });
});

describe('contact action team notification', () => {
  beforeEach(() => {
    sendBrevoEmail.mockClear();
    sendBrevoEmail.mockResolvedValue({ ok: true });
    process.env.BREVO_API_KEY = 'test-key';
    process.env.CONTACT_GENERAL = '111';
    process.env.CONTACT_COLLAB = '222';
    process.env.CONTACT_NOTIFY_TO = 'team@trashtalknyc.org';
    process.env.CONTACT_NOTIFY_FROM = 'site@trashtalknyc.org';
  });

  afterEach(() => {
    delete process.env.BREVO_API_KEY;
    delete process.env.CONTACT_GENERAL;
    delete process.env.CONTACT_COLLAB;
    delete process.env.CONTACT_NOTIFY_TO;
    delete process.env.CONTACT_NOTIFY_FROM;
  });

  it('emails the team for both tabs, replying to the person who wrote in', async () => {
    // @ts-expect-error handler is untyped once defineAction is stubbed
    await server.contact.handler(contactInput({ inquiryType: 'general' }), contactCtx());
    // @ts-expect-error handler is untyped once defineAction is stubbed
    await server.contact.handler(
      contactInput({ inquiryType: 'partnership', organization: 'Acme Org' }),
      contactCtx(),
    );

    expect(sendBrevoEmail).toHaveBeenCalledTimes(2);
    expect(sendBrevoEmail).toHaveBeenLastCalledWith(
      'test-key',
      expect.objectContaining({
        to: { email: 'team@trashtalknyc.org' },
        replyTo: expect.objectContaining({ email: 'jane@example.com' }),
      }),
    );
  });

  it('stays dormant when the notification recipient is not configured', async () => {
    delete process.env.CONTACT_NOTIFY_TO;

    // @ts-expect-error handler is untyped once defineAction is stubbed
    const result = await server.contact.handler(contactInput(), contactCtx());

    expect(result).toEqual({ ok: true });
    expect(sendBrevoEmail).not.toHaveBeenCalled();
  });

  it('does not fail the submission when the notification send fails', async () => {
    sendBrevoEmail.mockResolvedValueOnce({ ok: false, status: 400, detail: 'invalid_parameter' });

    // @ts-expect-error handler is untyped once defineAction is stubbed
    const result = await server.contact.handler(contactInput(), contactCtx());
    expect(result).toEqual({ ok: true });
  });

  it('does not fail the submission when the notification throws unexpectedly', async () => {
    sendBrevoEmail.mockRejectedValueOnce(new Error('boom: notify'));

    // @ts-expect-error handler is untyped once defineAction is stubbed
    const result = await server.contact.handler(contactInput(), contactCtx());
    expect(result).toEqual({ ok: true });
  });
});
