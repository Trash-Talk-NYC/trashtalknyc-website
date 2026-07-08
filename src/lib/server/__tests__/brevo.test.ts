import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildAttributes, buildNoteText, createBrevoNote, getBrevoContactId, upsertBrevoContact } from '../brevo';

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
