import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildAttributes, upsertBrevoContact } from '../brevo';

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
