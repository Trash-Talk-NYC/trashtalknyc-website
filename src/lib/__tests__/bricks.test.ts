import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BRICK_ROW_RATIOS } from '../brick-rows.generated';
import { brickHeroStyle, brickMinHeight } from '../bricks';

describe('brick frame rows', () => {
  it('has a generated top and bottom variant for every row count', () => {
    for (let n = 1; n <= 16; n++) {
      for (const half of ['top', 'bottom']) {
        expect(existsSync(join(process.cwd(), `src/assets/bricks/${half}-${n}.svg`))).toBe(true);
      }
    }
  });

  it('grows taller with every added row', () => {
    for (const half of ['top', 'bottom'] as const) {
      const r = BRICK_ROW_RATIOS[half];
      expect(r).toHaveLength(16);
      for (let i = 1; i < r.length; i++) expect(r[i]).toBeGreaterThan(r[i - 1]);
    }
  });

  it('min-height covers both halves plus their insets and gap', () => {
    const ratio = BRICK_ROW_RATIOS.top[2] + BRICK_ROW_RATIOS.bottom[2];
    expect(brickMinHeight(3)).toBe(`calc(${(ratio * 100).toFixed(2)}vw + 32px)`);
    expect(brickHeroStyle({ phone: 6, desktop: 3 })).toContain(`--brick-min-desktop:${brickMinHeight(3)}`);
  });

  it('rejects row counts the drawing does not have', () => {
    expect(() => brickMinHeight(0)).toThrow();
    expect(() => brickMinHeight(9)).toThrow();
    expect(() => brickMinHeight(2.5)).toThrow();
  });
});
