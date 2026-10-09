import { BRICK_ROW_RATIOS } from './brick-rows.generated';

/**
 * How many whole brick rows a hero's frame shows, per side of the
 * 760/761px breakpoint (1–8; 8 is the full drawing). Each half shows
 * that many rows from its outer edge, so bricks are never sliced
 * (captain, 2026-10-09).
 */
export interface BrickRows {
  phone: number;
  desktop: number;
}

/** The halves sit this far in from the hero's top and bottom edges. */
const BRICK_INSET_PX = 10;
/** Breathing room between the two halves' innermost rows. */
const BRICK_GAP_PX = 12;

function assertRows(n: number): void {
  if (!Number.isInteger(n) || n < 1 || n > 8) throw new Error(`Brick rows must be 1–8, got ${n}`);
}

/** Smallest hero height (CSS length) that fits n rows per half without the halves meeting. */
export function brickMinHeight(n: number): string {
  assertRows(n);
  const ratio = BRICK_ROW_RATIOS.top[n - 1] + BRICK_ROW_RATIOS.bottom[n - 1];
  return `calc(${(ratio * 100).toFixed(2)}vw + ${2 * BRICK_INSET_PX + BRICK_GAP_PX}px)`;
}

/**
 * Inline style for a hero section with the global `.brick-hero` class:
 * the min-heights that keep its brick halves apart at every width, so
 * a short hero grows to fit its rows rather than overlapping them.
 */
export function brickHeroStyle(rows: BrickRows): string {
  return `--brick-min-phone:${brickMinHeight(rows.phone)};--brick-min-desktop:${brickMinHeight(rows.desktop)}`;
}
