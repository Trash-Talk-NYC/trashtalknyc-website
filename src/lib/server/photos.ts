import { randomUUID } from 'node:crypto';

/**
 * Route-photo handling for the Lead a Cleanup form. Every accepted
 * photo is:
 *  1. validated by CONTENT (magic bytes), never by extension or the
 *     client-supplied MIME type — SVG and anything non-raster is
 *     rejected outright;
 *  2. re-encoded with sharp into a bounded JPEG, which strips ALL
 *     metadata including GPS (sharp drops metadata unless
 *     .withMetadata() is called — it isn't);
 *  3. stored privately in Netlify Blobs under a random key, never in
 *     a public folder.
 *
 * HEIC is accepted at the form input (iPhone photos) but converted to
 * JPEG in the browser before upload — the prebuilt sharp binaries
 * cannot decode HEIC, so a raw HEIC reaching the server is rejected
 * with the same photo-type error as any other unsupported content.
 */

export const MAX_PHOTOS = 5;
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

export const LEAD_PHOTO_STORE = 'lead-route-photos';

export type SniffedType = 'jpeg' | 'png' | 'webp' | 'heic' | 'unknown';

/** Identifies the real file type from its leading bytes. */
export function sniffImageType(buf: Uint8Array): SniffedType {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && // RIFF
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50 // WEBP
  ) {
    return 'webp';
  }
  // ISO-BMFF: size (4 bytes) + 'ftyp' + brand. All HEIC/HEIF brands
  // funnel into the same rejection, so matching 'ftyp' is enough.
  if (buf.length >= 12 && buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) return 'heic';
  return 'unknown';
}

export type PhotoError = 'too_many' | 'too_large' | 'bad_type' | 'decode_failed';

export type ProcessResult =
  | { ok: true; jpeg: Buffer }
  | { ok: false; error: PhotoError };

/**
 * Validates one photo's content and re-encodes it to a metadata-free
 * JPEG bounded to 2048px. sharp is imported lazily so unit tests of
 * the sniffing logic never load the native binary.
 */
export async function processPhoto(bytes: Uint8Array): Promise<ProcessResult> {
  if (bytes.byteLength > MAX_PHOTO_BYTES) return { ok: false, error: 'too_large' };

  const kind = sniffImageType(bytes);
  if (kind === 'unknown' || kind === 'heic') return { ok: false, error: 'bad_type' };

  try {
    const { default: sharp } = await import('sharp');
    const jpeg = await sharp(bytes)
      .rotate() // bake EXIF orientation in before the metadata is dropped
      .resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    return { ok: true, jpeg };
  } catch {
    return { ok: false, error: 'decode_failed' };
  }
}

export type StoreResult = { ok: true; keys: string[] } | { ok: false; detail: string };

/**
 * Stores re-encoded photos in the private Blobs store under random
 * keys. All-or-nothing: a storage failure removes any photos already
 * written and reports { ok: false } so the action can fail loudly rather
 * than silently losing attachments the applicant believes were sent.
 */
export async function storeLeadPhotos(jpegs: Buffer[]): Promise<StoreResult> {
  const keys: string[] = [];
  try {
    const { getStore } = await import('@netlify/blobs');
    const store = getStore({ name: LEAD_PHOTO_STORE, consistency: 'strong' });
    for (const jpeg of jpegs) {
      const key = `${randomUUID()}.jpg`;
      await store.set(key, new Blob([new Uint8Array(jpeg)]), { metadata: { contentType: 'image/jpeg' } });
      keys.push(key);
    }
    return { ok: true, keys };
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'unknown';
    const { failed } = await deleteLeadPhotos(keys);
    return { ok: false, detail: failed > 0 ? `${detail} (${failed} partial upload(s) not cleaned up)` : detail };
  }
}

/**
 * Removes stored photos whose application never reached Brevo — their
 * keys live only in the CRM note, so without this they would sit in the
 * private store with nothing pointing at them. Best-effort: reports how
 * many deletions failed so the caller can log leftovers.
 */
export async function deleteLeadPhotos(keys: string[]): Promise<{ failed: number }> {
  if (keys.length === 0) return { failed: 0 };
  try {
    const { getStore } = await import('@netlify/blobs');
    const store = getStore({ name: LEAD_PHOTO_STORE, consistency: 'strong' });
    const results = await Promise.allSettled(keys.map((key) => store.delete(key)));
    return { failed: results.filter((r) => r.status === 'rejected').length };
  } catch {
    return { failed: keys.length };
  }
}
