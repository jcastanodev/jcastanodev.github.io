// Turns an effective sound + the cat's pattern into note events. Pure.

const BASE_NOTE_MS = 350;

// Pattern walk for trigger number `step`.
export function pickDegree(pattern, step, order = 'up') {
  const n = pattern.length;
  if (n <= 1) return pattern[0] ?? 0;
  if (order === 'down') return pattern[n - 1 - (step % n)];
  if (order === 'pingpong') {
    const cycle = 2 * n - 2;
    const i = step % cycle;
    return pattern[i < n ? i : cycle - i];
  }
  return pattern[step % n];
}

// -> [{ delayMs, degree, octave, timbre, volume, durationMs }]
export function noteEvents({ sound, pattern, step, beatMs }) {
  const root = pickDegree(pattern, step, sound.order) + sound.degreeShift;
  const degrees = [root, ...sound.stack.map((s) => root + s)];
  const hits = Math.max(1, sound.ratchet);
  const slice = beatMs / hits;
  const durationMs = Math.min(BASE_NOTE_MS * sound.durationMul, slice * 0.95 * Math.max(1, sound.durationMul));

  const events = [];
  const push = (delayMs, gain) => {
    for (const degree of degrees) {
      events.push({
        delayMs,
        degree,
        octave: sound.octave,
        timbre: sound.timbre,
        volume: sound.volume * gain,
        durationMs,
      });
    }
  };

  for (let h = 0; h < hits; h++) {
    push(h * slice, 1);
    if (sound.echo) {
      for (let k = 1; k <= sound.echo.count; k++) {
        push(h * slice + k * sound.echo.gap * beatMs, Math.pow(sound.echo.decay, k));
      }
    }
  }
  return events.sort((a, b) => a.delayMs - b.delayMs);
}
