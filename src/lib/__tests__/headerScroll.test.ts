import { describe, expect, it } from 'vitest';
import { createHeaderVisibility } from '../headerScroll';

const MAX = 5000;

describe('createHeaderVisibility', () => {
  it('starts visible', () => {
    const v = createHeaderVisibility();
    expect(v.update(0, MAX)).toBe(false);
  });

  it('hides after scrolling down past the threshold', () => {
    const v = createHeaderVisibility({ threshold: 12, topZone: 80, startY: 100 });
    expect(v.update(108, MAX)).toBe(false); // within threshold
    expect(v.update(120, MAX)).toBe(true);
  });

  it('reveals on an upward scroll past the threshold', () => {
    const v = createHeaderVisibility({ threshold: 12, topZone: 80 });
    v.update(100, MAX);
    v.update(500, MAX);
    expect(v.update(480, MAX)).toBe(false);
  });

  it('ignores jitter smaller than the threshold in both directions', () => {
    const v = createHeaderVisibility({ threshold: 12, topZone: 80 });
    v.update(500, MAX); // travels past threshold from startY 0 → hidden
    expect(v.update(495, MAX)).toBe(true); // -5px: stays hidden
    expect(v.update(503, MAX)).toBe(true); // +8px: stays hidden

    const shown = createHeaderVisibility({ threshold: 12, topZone: 80, startY: 500 });
    expect(shown.update(508, MAX)).toBe(false); // +8px: stays shown
  });

  it('accumulates slow same-direction scrolls across many small events', () => {
    const v = createHeaderVisibility({ threshold: 12, topZone: 80, startY: 100 });
    expect(v.update(105, MAX)).toBe(false);
    expect(v.update(110, MAX)).toBe(false);
    expect(v.update(115, MAX)).toBe(true); // 15px total since last decision
  });

  it('always shows inside the top zone, even mid-hide', () => {
    const v = createHeaderVisibility({ threshold: 12, topZone: 80 });
    v.update(500, MAX);
    expect(v.update(60, MAX)).toBe(false);
  });

  it('clamps rubber-band overscroll above the top without jitter', () => {
    const v = createHeaderVisibility({ threshold: 12, topZone: 80 });
    expect(v.update(-40, MAX)).toBe(false);
    expect(v.update(0, MAX)).toBe(false);
  });

  it('clamps rubber-band overscroll past the bottom without revealing', () => {
    const v = createHeaderVisibility({ threshold: 12, topZone: 80 });
    v.update(MAX, MAX); // hidden after scrolling to the bottom
    expect(v.update(MAX + 60, MAX)).toBe(true); // bounce out
    expect(v.update(MAX, MAX)).toBe(true); // bounce back
  });

  it('treats a negative maxY (page shorter than viewport) as always visible', () => {
    const v = createHeaderVisibility({ threshold: 12, topZone: 80 });
    expect(v.update(300, -50)).toBe(false);
  });

  it('does not hide when wired at a restored/anchored scroll position', () => {
    const v = createHeaderVisibility({ threshold: 12, topZone: 80, startY: 2000 });
    expect(v.update(2000, MAX)).toBe(false);
  });
});
