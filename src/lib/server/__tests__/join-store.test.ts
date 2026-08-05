import { describe, expect, it } from 'vitest';
import { keyForApplication, storeJoinApplication, type JoinApplicationStore } from '../join-store';

const application = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  role: 'Videographer' as const,
  why: 'I film everything already.',
};

function fakeStore() {
  const writes = new Map<string, unknown>();
  const store: JoinApplicationStore = {
    async setJSON(key, value) {
      writes.set(key, value);
    },
  };
  return { store, writes };
}

describe('keyForApplication', () => {
  it('leads with the timestamp so keys list chronologically', () => {
    expect(keyForApplication('2026-08-05T12:00:00.000Z', 'uuid')).toBe('2026-08-05T12:00:00.000Z-uuid');
  });
});

describe('storeJoinApplication', () => {
  it('writes the application fields plus the submission timestamp', async () => {
    const { store, writes } = fakeStore();
    const result = await storeJoinApplication(store, application, '2026-08-05T12:00:00.000Z');

    expect(result.ok).toBe(true);
    expect(writes.size).toBe(1);
    expect([...writes.values()][0]).toEqual({ ...application, submittedAt: '2026-08-05T12:00:00.000Z' });
  });

  it('fails closed when the write throws (success screen claims the save)', async () => {
    const store: JoinApplicationStore = {
      async setJSON() {
        throw new Error('blobs unreachable');
      },
    };
    const result = await storeJoinApplication(store, application);
    expect(result).toEqual({ ok: false, detail: 'blobs unreachable' });
  });
});
