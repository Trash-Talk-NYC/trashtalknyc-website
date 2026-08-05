import { randomUUID } from 'node:crypto';
import type { JoinTeamInput } from './schemas';

/**
 * Holding pen for Join the Team applications, backed by Netlify Blobs.
 *
 * The real intake destination is the captain's call and is still pending
 * (Brevo is explicitly ruled out for this form) — see AGENTS.md. Until
 * that decision lands, applications are written here so none are lost:
 * one JSON blob per submission under a sortable key, trivially exported
 * to whatever destination is chosen later.
 *
 * Unlike the rate limiter, this fails CLOSED: the success screen tells
 * the applicant their application was saved, so if the write fails the
 * submission must fail too rather than silently drop their answers.
 *
 * The store dependency is injected so tests can pass a fake.
 */

export const JOIN_STORE_NAME = 'join-team-applications';

export interface JoinApplicationStore {
  setJSON(key: string, value: unknown): Promise<unknown>;
}

export type StoreResult = { ok: true; key: string } | { ok: false; detail: string };

/** ISO timestamp first so `blobs:list` output reads chronologically. */
export function keyForApplication(submittedAt: string, uuid: string = randomUUID()): string {
  return `${submittedAt}-${uuid}`;
}

export async function storeJoinApplication(
  store: JoinApplicationStore,
  input: Pick<JoinTeamInput, 'name' | 'email' | 'role' | 'why'>,
  submittedAt: string = new Date().toISOString(),
): Promise<StoreResult> {
  const key = keyForApplication(submittedAt);
  try {
    await store.setJSON(key, {
      name: input.name,
      email: input.email,
      role: input.role,
      why: input.why,
      submittedAt,
    });
    return { ok: true, key };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : 'unknown' };
  }
}

/**
 * Production entrypoint: resolves the Netlify Blobs store lazily (same
 * pattern as the rate limiter). Blobs is unreachable under plain
 * `astro dev`; use `netlify dev` to exercise the full submit path
 * locally.
 */
export async function storeJoinApplicationInBlobs(
  input: Pick<JoinTeamInput, 'name' | 'email' | 'role' | 'why'>,
): Promise<StoreResult> {
  try {
    const { getStore } = await import('@netlify/blobs');
    const store = getStore({ name: JOIN_STORE_NAME, consistency: 'strong' });
    return await storeJoinApplication(store, input);
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : 'unknown' };
  }
}
