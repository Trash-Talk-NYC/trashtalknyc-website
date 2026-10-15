import { describe, expect, it } from 'vitest';
import type { ImageMetadata } from 'astro';
import { galleryByMonth, galleryPhotos, monthLabel, type GalleryPhoto } from '../gallery';

const photo = (id: string, taken: string): GalleryPhoto => ({
  src: { src: id } as ImageMetadata,
  taken,
  alt: { en: id, es: id },
});

describe('galleryByMonth', () => {
  it('groups by month, newest month first, keeping photo order', () => {
    const groups = galleryByMonth([photo('a', '2026-09'), photo('b', '2026-10'), photo('c', '2026-09'), photo('d', '2025-12')]);
    expect(groups.map((g) => g.month)).toEqual(['2026-10', '2026-09', '2025-12']);
    expect(groups[1].photos.map((p) => p.src.src)).toEqual(['a', 'c']);
  });

  it('refuses a malformed month instead of misfiling the photo', () => {
    expect(() => galleryByMonth([photo('a', 'Sept 2026')])).toThrow(/YYYY-MM/);
    expect(() => galleryByMonth([photo('a', '2026-13')])).toThrow(/YYYY-MM/);
  });

  it('gives every real photo a month and both alt texts', () => {
    expect(galleryByMonth().flatMap((g) => g.photos)).toHaveLength(galleryPhotos.length);
    for (const p of galleryPhotos) {
      expect(p.alt.en.trim()).not.toBe('');
      expect(p.alt.es.trim()).not.toBe('');
    }
  });
});

describe('monthLabel', () => {
  it('names the month in English and Spanish', () => {
    expect(monthLabel('2026-09')).toEqual({ en: 'September 2026', es: 'septiembre de 2026' });
  });

  it('never slips into a neighboring month', () => {
    expect(monthLabel('2026-01').en).toBe('January 2026');
    expect(monthLabel('2026-12').en).toBe('December 2026');
  });
});
