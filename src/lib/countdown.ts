export type CountdownParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

export function createCountdown(
  isoStr: string,
  onTick: (parts: CountdownParts) => void,
): () => void {
  const targetMs = new Date(isoStr).getTime();

  function tick() {
    const diff = targetMs - Date.now();
    if (diff <= 0) {
      clearInterval(timer);
      return;
    }
    onTick({
      days:    Math.floor(diff / 864e5),
      hours:   Math.floor((diff % 864e5) / 36e5),
      minutes: Math.floor((diff % 36e5) / 6e4),
      seconds: Math.floor((diff % 6e4) / 1e3),
    });
  }

  const timer = setInterval(tick, 1000);
  tick();

  return () => clearInterval(timer);
}
