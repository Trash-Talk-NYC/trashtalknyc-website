import { describe, expect, it } from 'vitest';
import { EVENTS_STICKER_ORDER, STICKER_SPOTS, TEAM_STICKERS, eventsSticker, spotSticker } from '../teamStickers';

const allIds = Object.keys(TEAM_STICKERS).sort();

describe('STICKER_SPOTS', () => {
  it('never shows the same sticker twice on one page', () => {
    for (const [page, spots] of Object.entries(STICKER_SPOTS)) {
      const ids = Object.values(spots);
      expect(new Set(ids).size, page).toBe(ids.length);
    }
  });

  it('uses every team sticker somewhere', () => {
    const used = new Set(Object.values(STICKER_SPOTS).flatMap((spots) => Object.values(spots)));
    expect([...used].sort()).toEqual(allIds);
  });

  it('gives every spot an ID no other page uses', () => {
    const spots = Object.values(STICKER_SPOTS).flatMap((s) => Object.keys(s));
    expect(new Set(spots).size).toBe(spots.length);
  });

  it('throws on a spot with no sticker', () => {
    expect(() => spotSticker('team', 'TM9' as 'TM1')).toThrow(/TM9/);
  });
});

describe('eventsSticker', () => {
  it('cycles through every sticker once before repeating', () => {
    expect([...EVENTS_STICKER_ORDER].sort()).toEqual(allIds);
    const first = Array.from({ length: allIds.length }, (_, i) => eventsSticker('EV', i).src);
    expect(new Set(first).size).toBe(allIds.length);
    expect(eventsSticker('EV', allIds.length).src).toBe(first[0]);
  });

  it('continues past-event spots from where the flyers left off', () => {
    expect(eventsSticker('EP', 0, 2)).toEqual({ spot: 'EP1', src: eventsSticker('EV', 2).src });
  });
});
