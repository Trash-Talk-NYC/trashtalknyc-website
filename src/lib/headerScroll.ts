export type HeaderVisibilityOptions = {
  /**
   * Accumulated same-direction scroll (px) required before toggling.
   * Guards against toggling on sub-pixel jitter and iOS momentum noise.
   */
  threshold?: number;
  /**
   * Scroll positions at or below this (px) always show the header, so it
   * can never be half-hidden at the very top of the page.
   */
  topZone?: number;
  /**
   * Scroll position at wiring time. Prevents a load-time anchor jump
   * (e.g. landing on /#signup) from reading as a "scroll down" and
   * hiding the header before the user has touched the page.
   */
  startY?: number;
};

export type HeaderVisibility = {
  /**
   * Feed a raw scroll position and the max scrollable position; returns
   * whether the header should be hidden. Raw values are clamped to
   * [0, maxY] so iOS rubber-band overscroll at either document edge
   * produces no phantom direction changes.
   */
  update(rawY: number, maxY: number): boolean;
};

export function createHeaderVisibility({
  threshold = 12,
  topZone = 80,
  startY = 0,
}: HeaderVisibilityOptions = {}): HeaderVisibility {
  // Anchor only moves when we decide, so slow scrolls accumulate across
  // many small events instead of each one resetting the comparison point.
  let anchorY = startY;
  let hidden = false;

  return {
    update(rawY: number, maxY: number): boolean {
      const y = Math.min(Math.max(rawY, 0), Math.max(maxY, 0));

      if (y <= topZone) {
        hidden = false;
        anchorY = y;
        return hidden;
      }

      const delta = y - anchorY;
      if (delta > threshold) {
        hidden = true;
        anchorY = y;
      } else if (delta < -threshold) {
        hidden = false;
        anchorY = y;
      }
      return hidden;
    },
  };
}
