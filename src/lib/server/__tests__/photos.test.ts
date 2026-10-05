import { describe, expect, it } from 'vitest';
import { MAX_PHOTO_BYTES, processPhoto, sniffImageType } from '../photos';

function bytes(...values: number[]): Uint8Array {
  const buf = new Uint8Array(Math.max(16, values.length));
  buf.set(values);
  return buf;
}

describe('sniffImageType', () => {
  it('recognises JPEG magic bytes', () => {
    expect(sniffImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('jpeg');
  });

  it('recognises PNG magic bytes', () => {
    expect(sniffImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe('png');
  });

  it('recognises WebP (RIFF…WEBP)', () => {
    const b = bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50);
    expect(sniffImageType(b)).toBe('webp');
  });

  it('recognises ISO-BMFF (HEIC) containers by their ftyp box', () => {
    const b = bytes(0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63);
    expect(sniffImageType(b)).toBe('heic');
  });

  it('reports SVG and other content as unknown', () => {
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    expect(sniffImageType(svg)).toBe('unknown');
    expect(sniffImageType(new TextEncoder().encode('%PDF-1.4'))).toBe('unknown');
  });
});

describe('processPhoto', () => {
  it('rejects oversized files before decoding', async () => {
    const big = new Uint8Array(MAX_PHOTO_BYTES + 1);
    big.set([0xff, 0xd8, 0xff]);
    expect(await processPhoto(big)).toEqual({ ok: false, error: 'too_large' });
  });

  it('rejects content that is not a raster photo (SVG, renamed files)', async () => {
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    expect(await processPhoto(svg)).toEqual({ ok: false, error: 'bad_type' });
  });

  it('rejects raw HEIC (converted client-side before upload instead)', async () => {
    const heic = bytes(0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63);
    expect(await processPhoto(heic)).toEqual({ ok: false, error: 'bad_type' });
  });

  it('rejects a file with JPEG magic bytes but corrupt content', async () => {
    expect(await processPhoto(bytes(0xff, 0xd8, 0xff, 0xe0, 1, 2, 3))).toEqual({
      ok: false,
      error: 'decode_failed',
    });
  });

  it('re-encodes a real image to JPEG and strips its metadata', async () => {
    const { default: sharp } = await import('sharp');
    // A 4000px-wide red PNG with EXIF attached stands in for a camera photo.
    const src = await sharp({ create: { width: 4000, height: 100, channels: 3, background: { r: 200, g: 0, b: 0 } } })
      .png()
      .withExifMerge({ IFD0: { Copyright: 'gps-stand-in' } })
      .toBuffer();

    const result = await processPhoto(new Uint8Array(src));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const meta = await sharp(result.jpeg).metadata();
    expect(meta.format).toBe('jpeg');
    expect(meta.width).toBeLessThanOrEqual(2048); // bounded
    expect(meta.exif).toBeUndefined(); // metadata (incl. GPS) gone
  });
});
