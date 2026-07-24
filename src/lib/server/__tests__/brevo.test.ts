import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildAttributes,
  buildInquiryEmail,
  buildNoteText,
  createBrevoNote,
  escapeHtml,
  getBrevoContactId,
  sendBrevoEmail,
  upsertBrevoContact,
} from '../brevo';

describe('buildAttributes', () => {
  it('keeps filled fields and trims them', () => {
    expect(buildAttributes({ FIRSTNAME: ' Jane ', BOROUGH: 'Queens' })).toEqual({
      FIRSTNAME: 'Jane',
      BOROUGH: 'Queens',
    });
  });

  it('drops empty and undefined fields so updates never blank existing values', () => {
    expect(buildAttributes({ FIRSTNAME: 'Jane', PHONE: '', EXPERIENCE: '   ', HEAR_ABOUT: undefined })).toEqual({
      FIRSTNAME: 'Jane',
    });
  });
});

describe('upsertBrevoContact', () => {
  afterEach(() => vi.unstubAllGlobals());

  const contact = { email: 'jane@example.com', attributes: { FIRSTNAME: 'Jane' }, listId: 42 };

  it('sends the expected request and succeeds on 201', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await upsertBrevoContact('key-123', contact);

    expect(result).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.brevo.com/v3/contacts');
    expect(init.headers['api-key']).toBe('key-123');
    expect(JSON.parse(init.body)).toEqual({
      email: 'jane@example.com',
      attributes: { FIRSTNAME: 'Jane' },
      listIds: [42],
      updateEnabled: true,
    });
  });

  it('succeeds on 204 (existing contact updated)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    expect(await upsertBrevoContact('key', contact)).toEqual({ ok: true });
  });

  it("reports Brevo's error code without echoing contact data", async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 'invalid_parameter', message: 'jane@example.com is bad' }), { status: 400 }),
    ));

    const result = await upsertBrevoContact('key', contact);
    expect(result).toEqual({ ok: false, status: 400, detail: 'invalid_parameter' });
  });

  it('reports network failures without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('getaddrinfo ENOTFOUND')));
    const result = await upsertBrevoContact('key', contact);
    expect(result.ok).toBe(false);
  });

  it('bounds the request with an abort signal so a hung connection cannot eat the function budget', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);

    await upsertBrevoContact('key', contact);

    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });

  it('retries once on 429, honoring Retry-After, so a rate-limit blip does not lose the signup', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('{}', { status: 429, headers: { 'Retry-After': '0' } }))
      .mockResolvedValueOnce(new Response('{}', { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await upsertBrevoContact('key', contact);

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries once on 5xx after the ~1s fallback delay when Retry-After is absent', async () => {
    vi.useFakeTimers();
    try {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce(new Response('{}', { status: 503 }))
        .mockResolvedValueOnce(new Response(null, { status: 204 }));
      vi.stubGlobal('fetch', fetchMock);

      const pending = upsertBrevoContact('key', contact);
      // Fallback delay is 1s + up to 250ms jitter
      await vi.advanceTimersByTimeAsync(1250);

      expect(await pending).toEqual({ ok: true });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('gives up after a single retry and reports the failure', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 'too_many_requests' }), { status: 429, headers: { 'Retry-After': '0' } }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await upsertBrevoContact('key', contact);

    expect(result).toEqual({ ok: false, status: 429, detail: 'too_many_requests' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry non-retryable client errors', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 'invalid_parameter' }), { status: 400 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await upsertBrevoContact('key', contact);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('buildNoteText', () => {
  it('formats a queryable header, separator, then the raw content', () => {
    const submittedAt = new Date('2026-07-07T20:53:00.000Z');
    expect(buildNoteText('signup', 'message', 'Bringing two friends!', submittedAt)).toBe(
      'form=signup | field=message | submitted=2026-07-07T20:53:00.000Z\n—\nBringing two friends!',
    );
  });
});

describe('getBrevoContactId', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('URL-encodes the email and returns the numeric id', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 4321 }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await getBrevoContactId('key', 'jane+test@example.com');

    expect(result).toEqual({ ok: true, id: 4321 });
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.brevo.com/v3/contacts/jane%2Btest%40example.com');
    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });

  it('reports a lookup failure with the Brevo error code', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 'document_not_found' }), { status: 404 }),
    ));
    expect(await getBrevoContactId('key', 'nobody@example.com')).toEqual({
      ok: false,
      status: 404,
      detail: 'document_not_found',
    });
  });

  it('reports a malformed success body instead of returning a bogus id', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })));
    const result = await getBrevoContactId('key', 'jane@example.com');
    expect(result).toEqual({ ok: false, status: 200, detail: 'missing_contact_id' });
  });

  it('reports a non-JSON success body instead of throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>gateway</html>', { status: 200 })));
    const result = await getBrevoContactId('key', 'jane@example.com');
    expect(result).toEqual({ ok: false, status: 200, detail: 'invalid_json' });
  });
});

describe('createBrevoNote', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('posts the note text against the contact id', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await createBrevoNote('key-123', 4321, 'form=signup | field=message | submitted=x\n—\nhi');

    expect(result).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.brevo.com/v3/crm/notes');
    expect(init.headers['api-key']).toBe('key-123');
    expect(JSON.parse(init.body)).toEqual({
      text: 'form=signup | field=message | submitted=x\n—\nhi',
      contactIds: [4321],
    });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('reports failures without throwing so callers can treat notes as best-effort', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 'invalid_parameter' }), { status: 400 }),
    ));
    expect(await createBrevoNote('key', 4321, 'text')).toEqual({ ok: false, status: 400, detail: 'invalid_parameter' });

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNRESET')));
    const result = await createBrevoNote('key', 4321, 'text');
    expect(result.ok).toBe(false);
  });
});

describe('escapeHtml', () => {
  it('escapes the characters that would break out of notification HTML', () => {
    expect(escapeHtml(`<script>alert("x")</script> & 'quote'`)).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;quote&#39;',
    );
  });
});

describe('buildInquiryEmail', () => {
  const base = {
    fname: 'Jane',
    lname: 'Doe',
    email: 'jane@example.com',
    message: 'Hello there',
  };

  it('titles a partnership inquiry as a collaboration and includes every provided field', () => {
    const { subject, htmlContent } = buildInquiryEmail({
      ...base,
      inquiryType: 'partnership',
      phone: '+1 212 555 0100',
      organization: 'Acme Org',
    });

    expect(subject).toBe('New collaboration inquiry — Jane Doe');
    expect(htmlContent).toContain('jane@example.com');
    expect(htmlContent).toContain('+1 212 555 0100');
    expect(htmlContent).toContain('Acme Org');
    expect(htmlContent).toContain('Hello there');
  });

  it('titles a general inquiry as a contact and omits empty optional fields', () => {
    const { subject, htmlContent } = buildInquiryEmail({ ...base, inquiryType: 'general', phone: '  ' });

    expect(subject).toBe('New contact inquiry — Jane Doe');
    expect(htmlContent).not.toContain('Phone');
    expect(htmlContent).not.toContain('Organization');
  });

  it('escapes submitted values so a malicious message cannot inject markup', () => {
    const { htmlContent } = buildInquiryEmail({
      ...base,
      inquiryType: 'general',
      message: '<img src=x onerror=alert(1)>',
    });

    expect(htmlContent).not.toContain('<img');
    expect(htmlContent).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('renders newlines in the message as <br> so multi-line inquiries stay readable', () => {
    const { htmlContent } = buildInquiryEmail({ ...base, inquiryType: 'general', message: 'line one\nline two' });
    expect(htmlContent).toContain('line one<br>line two');
  });
});

describe('sendBrevoEmail', () => {
  afterEach(() => vi.unstubAllGlobals());

  const email = {
    sender: { email: 'site@trashtalknyc.org', name: 'Trash Talk NYC Website' },
    to: { email: 'david@trashtalknyc.org' },
    replyTo: { email: 'jane@example.com', name: 'Jane Doe' },
    subject: 'New collaboration inquiry — Jane Doe',
    htmlContent: '<p>hi</p>',
  };

  it('posts the expected transactional-email payload and succeeds', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ messageId: 'x' }), { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await sendBrevoEmail('key-123', email);

    expect(result).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(init.headers['api-key']).toBe('key-123');
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(init.body)).toEqual({
      sender: { email: 'site@trashtalknyc.org', name: 'Trash Talk NYC Website' },
      to: [{ email: 'david@trashtalknyc.org' }],
      replyTo: { email: 'jane@example.com', name: 'Jane Doe' },
      subject: 'New collaboration inquiry — Jane Doe',
      htmlContent: '<p>hi</p>',
    });
  });

  it('omits replyTo from the payload when none is given', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);

    await sendBrevoEmail('key', { ...email, replyTo: undefined });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).not.toHaveProperty('replyTo');
  });

  it('reports failures without throwing so the caller can treat it as best-effort', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 'invalid_parameter' }), { status: 400 }),
    ));
    expect(await sendBrevoEmail('key', email)).toEqual({ ok: false, status: 400, detail: 'invalid_parameter' });

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNRESET')));
    expect((await sendBrevoEmail('key', email)).ok).toBe(false);
  });
});
