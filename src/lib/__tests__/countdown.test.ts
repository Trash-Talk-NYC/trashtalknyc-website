import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCountdown } from '../countdown';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createCountdown', () => {
  it('calls onTick with correct numeric parts for a known future ISO', () => {
    const now = new Date('2025-07-01T00:00:00Z').getTime();
    vi.spyOn(Date, 'now').mockReturnValue(now);

    const future = new Date(
      now + 2 * 864e5 + 3 * 36e5 + 4 * 6e4 + 5 * 1e3,
    ).toISOString();

    const onTick = vi.fn();
    const cleanup = createCountdown(future, onTick);
    cleanup();

    expect(onTick).toHaveBeenCalledWith({ days: 2, hours: 3, minutes: 4, seconds: 5 });
  });

  it('provides parts as numbers, not strings', () => {
    const now = new Date('2025-07-01T00:00:00Z').getTime();
    vi.spyOn(Date, 'now').mockReturnValue(now);

    const future = new Date(now + 864e5).toISOString();
    const onTick = vi.fn();
    const cleanup = createCountdown(future, onTick);
    cleanup();

    const parts = onTick.mock.calls[0][0];
    expect(typeof parts.days).toBe('number');
    expect(typeof parts.hours).toBe('number');
    expect(typeof parts.minutes).toBe('number');
    expect(typeof parts.seconds).toBe('number');
  });

  it('cleanup function stops the interval from ticking', () => {
    vi.useFakeTimers();
    const now = new Date('2025-07-01T00:00:00Z').getTime();
    vi.setSystemTime(now);

    const future = new Date(now + 864e5).toISOString();
    const onTick = vi.fn();
    const cleanup = createCountdown(future, onTick);

    expect(onTick).toHaveBeenCalledTimes(1);

    cleanup();
    vi.advanceTimersByTime(5000);

    expect(onTick).toHaveBeenCalledTimes(1);

    vi.clearAllTimers();
    vi.useRealTimers();
  });
});
